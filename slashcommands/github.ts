import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { BlockType, ButtonStyle, IImageBlock } from '@rocket.chat/apps-engine/definition/uikit';
import { AppsGithubApp } from '../AppsGithubApp';
import { createModalForIssue } from '../lib/helpers/createModalForIssue';
import { getWebhookUrl } from '../lib/helpers/getWebhookUrl';
import { sendNotification } from '../lib/helpers/sendNotification';
import { AppPersistence } from '../lib/persistence';
import { getRepoName, GithubSDK } from '../lib/sdk';

enum Command {
    Connect = 'connect',
    SetToken = 'set-token',
    User = 'user',
    Help = 'help',
    Issue = 'issue',
    Create = 'create',
    Previos = '/'
}

export class GithubSlashcommand implements ISlashCommand {
    public command = 'github';
    public i18nParamsExample = 'slashcommand_params';
    public i18nDescription = 'slashcommand_description';
    public providesPreview = false;

    public constructor(private readonly app: AppsGithubApp) { }

    public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence,): Promise<void> {
        const [command] = context.getArguments();

        this.app.getLogger().log("command = ", command);
        const page = '1';
        await this.availableCommands(command, context, read, modify, http, persis, page, 'n');
    }

    private async availableCommands(
        command: string,
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
        page: string,
        fetch: string) {


        switch (command) {
            case Command.Connect:
                await this.processConnectCommand(context, read, modify, http, persis);
                break;

            case Command.SetToken:
                await this.processSetTokenCommand(context, read, modify, http, persis);
                break;

            case Command.User:
                await this.processUserCommand(context, read, modify, http, persis);
                break;

            case Command.Help:
                await this.processHelpCommand(context, read, modify, http, persis);
                break;

            case Command.Issue:
                await this.processIssueCommand(context, read, modify, http, persis, page, fetch);
                break;
            case Command.Create:
                await this.processCreateIssueCommand(context, read, modify, http, persis);
                break;
            case Command.Previos:
                await this.processPreviousCommandForNextPage(context, read, modify, http, persis);
                break;

        }
    }

    private async processHelpCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {

        let information: string = '';

        information += " ```"
        information += " 1. Fetch user repositories - /github user {username} \n";
        information += " 2. Fetch a issue           - /github issue {owner} {repo} {issue no.}  \n";
        information += " 3. Connect to repository   - /github connect {repo-url}  \n";
        information += " 4. Set token               - /github set-token token \n";
        information += " 5. Create issue            - /github create";
        information += " Note currently create command is configured for hard coded owner and repo \n";
        information += " 6. Search issue            - /github search";
        information += " ``` "

        await sendNotification(information, read, modify, context.getSender(), context.getRoom());
    }

    private async processConnectCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [, repoUrl] = context.getArguments();

        if (!repoUrl) {
            await sendNotification('Usage: `/github connect REPO_URL`', read, modify, context.getSender(), context.getRoom());
            return;
        }

        const repoName = getRepoName(repoUrl);

        if (!repoName) {
            await sendNotification('Invalid GitHub repo address', read, modify, context.getSender(), context.getRoom());
            return;
        }

        const persistence = new AppPersistence(persis, read.getPersistenceReader());
        const accessToken = await persistence.getUserAccessToken(context.getSender());

        if (!accessToken) {
            await sendNotification(
                'You haven\'t configured your access key yet. Please run `/github set-token YOUR_ACCESS_TOKEN`',
                read,
                modify,
                context.getSender(),
                context.getRoom(),
            );
            return;
        }

        const sdk = new GithubSDK(http, accessToken, this.app.getLogger());

        try {
            await sdk.createWebhook(repoName, await getWebhookUrl(this.app));
        } catch (err) {
            console.error(err);
            await sendNotification('Error connecting to the repo', read, modify, context.getSender(), context.getRoom());
            return;
        }

        await persistence.connectRepoToRoom(repoName, context.getRoom());

        await sendNotification('Successfully connected repo', read, modify, context.getSender(), context.getRoom());
    }

    private async processSetTokenCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [, accessToken] = context.getArguments();

        if (!accessToken) {
            await sendNotification('Usage: `/github set-token ACCESS_TOKEN`', read, modify, context.getSender(), context.getRoom());
            return;
        }

        const persistence = new AppPersistence(persis, read.getPersistenceReader());

        await persistence.setUserAccessToken(accessToken, context.getSender());

        await sendNotification('Successfully stored your key', read, modify, context.getSender(), context.getRoom());
    }

    private async processUserCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [, userName] = context.getArguments();
        // const persistence = new AppPersistence(persis, read.getPersistenceReader());
        const accessToken = '123' //await persistence.getUserAccessToken(context.getSender());

        // if (!accessToken) {
        //     await sendNotification(
        //         'You haven\'t configured your access key yet. Please run `/github set-token YOUR_ACCESS_TOKEN`',
        //         read,
        //         modify,
        //         context.getSender(),
        //         context.getRoom(),
        //     );
        //     return;
        // }
        const sdk = new GithubSDK(http, accessToken, this.app.getLogger());
        interface githubRepoUser {
            'repo-name': string,
            'repo-url': string,

        }
        try {
            const userRepos = await sdk.getRepos(userName) as Array<{ full_name: string, html_url: string }>;

            let repositoryInfo: githubRepoUser[] = [];
            let resppp: string = " ``` ";
            userRepos.map((repo) => {
                const p: githubRepoUser = {
                    'repo-name': repo.full_name,
                    'repo-url': repo.html_url,
                }
                resppp += JSON.stringify(p) + '\n';
                repositoryInfo.push(p);
            })
            resppp += " ``` ";
            // resppp = JSON.stringify(resppp);
            await sendNotification(` ${resppp} `, read, modify, context.getSender(), context.getRoom());

        } catch (err) {
            console.error(err);
            await sendNotification(err, read, modify, context.getSender(), context.getRoom());
        }
    }

    private async processIssueCommand(
        context: SlashCommandContext,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
        page: string = '1',
        fetch?: string
    ): Promise<void> {
        let [, owner, repoName, issueNo] = context.getArguments();
        let result: string | string[] = '';
        if (fetch == 'p') {
            this.app.getLogger().debug('inside fetch = p ');
            const persistence = new AppPersistence(persis, read.getPersistenceReader());
            result = await persistence.getPreviousCommand(context.getSender()) as string | string[];
            this.app.getLogger().debug('result = ', result);
            // result = result.split(" ");
            owner = result[1];
            repoName = result[2];
        }

        const persistence = new AppPersistence(persis, read.getPersistenceReader());
        const accessToken = '123'
        // await persistence.getUserAccessToken(context.getSender());

        // if (!accessToken) {
        //     await sendNotification(
        //         'You haven\'t configured your access key yet. Please run `/github set-token YOUR_ACCESS_TOKEN`',
        //         read,
        //         modify,
        //         context.getSender(),
        //         context.getRoom(),
        //     );
        //     return;
        // }
        this.app.getLogger().debug('executing issue command for page = ', owner, repoName)
        const sdk = new GithubSDK(http, accessToken, this.app.getLogger());

        interface FetchIssue {
            number: string,
            user: { login: string },
            state: string,
            created_at: string,
            repository_url: string,
            url: string,
            body: string
        };

        try {
            const data = await sdk.fetchIssue(owner, repoName, issueNo, page) as FetchIssue[];
            this.app.getLogger().debug(data);

            const regex: any = /!\[(.*?)\]\((.*?)\)/g;


            data.map(async (issue) => {
                let arr: string[] = [];
                let m: any;

                while ((m = regex.exec(issue.body)) !== null) {
                    if (m.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
                    arr.push(m[2])
                }
                this.app.getLogger().debug('arr = ', arr);
                let p: string = ""
                p += " ```"
                p += ` issue number - ${issue.number} \n`;
                p += ` created by   - ${issue.user.login} \n`;
                p += ` state        - ${issue.state} \n`;
                p += ` created at   - ${issue.created_at} \n`;
                p += ` repo url     - ${issue.repository_url} \n`;
                p += ` issue url    - ${issue.url} \n`;
                p += ` description  - ${issue.body} \n`;
                p += " ``` "
                await sendNotification(p, read, modify, context.getSender(), context.getRoom(), arr);

            });



            // this.app.getLogger().debug("arr = ", arr);
            await persistence.storePreviousCommand(['issue', owner, repoName], context.getSender());
            // await persistence.storeRepoForFetchIssueCommand('issue', context.getSender());
            // await persistence.storeOwnerForFetchIssueCommand('issue', context.getSender());

        } catch (err) {
            console.error(err);
            await sendNotification(err, read, modify, context.getSender(), context.getRoom());
        }
    }

    private async processCreateIssueCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [, owner, repoName, title] = context.getArguments();
        const triggerId = context.getTriggerId();
        const data = {
            room: (context.getRoom() as any).value,
            threadId: context.getThreadId()
        }; // the current room
        // const persistence = new AppPersistence(persis, read.getPersistenceReader());
        const accessToken = '123' //await persistence.getUserAccessToken(context.getSender());
        const sdk = new GithubSDK(http, accessToken, this.app.getLogger());

        try {
            const sender = await read.getUserReader().getById('rocket.cat');

            this.app.getLogger().debug("trigger id = ", triggerId);

            if (triggerId) {
                const mdl = await createModalForIssue({ id: 'modalid', persistence: persis, modify, data });
                this.app.getLogger().debug("modal id = ", mdl);
                await modify.getUiController().openModalView(mdl, { triggerId }, context.getSender());
            }
            // await sendNotification(p, read, modify, context.getSender(), context.getRoom(), arr);
        } catch (err) {
            console.error(err);
            // await sendNotification(err, read, modify, context.getSender(), context.getRoom());
        }
    };

    private async processPreviousCommandForNextPage(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence) {
        const persistence = new AppPersistence(persis, read.getPersistenceReader());
        let result = await persistence.getPreviousCommand(context.getSender()) as string | string[];

        const [_, page] = context.getArguments();
        await sendNotification(`Re-executing command ${result} for ${page}.`, read, modify, context.getSender(), context.getRoom());
        // await sendNotification(`/github ${result[0]} ${result[1]} ${result[2]} ${page}.`, read, modify, context.getSender(), context.getRoom());
        await this.availableCommands(result[0], context, read, modify, http, persis, page, 'p');


    }
}

// /github issue RocketChat Rocket.Chat 25029