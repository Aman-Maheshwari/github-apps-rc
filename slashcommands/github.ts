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
                await this.processIssueCommand(context, read, modify, http, persis);
                break;
            case Command.Create:
                await this.processCreateIssueCommand(context, read, modify, http, persis);
                break;

        }
    }


    private async processHelpCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {

        let information: string = '';

        information += " ```"
        information += "  1. Fetch user repositories - /github user {username} \n";
        information += "  2. Fetch a issue           - /github get-issue {owner} {repo} {issue no.}  \n";
        information += "  3. Connect to repository   - /github connect {repo-url}  \n";
        information += "  4. Set token               - /github set-token token \n";
        information += "  5. Create issue            - /github create"
        information += "  Note currently create command is configured for hard coded owner and repo"
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

    private async processIssueCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
        const [, owner, repoName, issueNo] = context.getArguments();
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
            const data = await sdk.fetchIssue(owner, repoName, issueNo) as FetchIssue;
            this.app.getLogger().debug(data);
            let p: string = ""
            const regex: any = /!\[(.*?)\]\((.*?)\)/g;
            let m: any;
            let arr: string[] = [];
            while ((m = regex.exec(data.body)) !== null) {
                if (m.index === regex.lastIndex) {
                    regex.lastIndex++;
                }
                arr.push(m[2])
            }

            this.app.getLogger().debug("arr = ", arr);
            p += " ``` "
            p += `issue number - ${data.number} \n`;
            p += `created by   - ${data.user.login} \n`;
            p += `state        - ${data.state} \n`;
            p += `created at   - ${data.created_at} \n`;
            p += `repo url     - ${data.repository_url} \n`;
            p += `issue url    - ${data.url} \n`;
            p += `description  - ${data.body} \n`;
            p += " ``` "

            await sendNotification(p, read, modify, context.getSender(), context.getRoom(), arr);
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
    }
}

// /github issue RocketChat Rocket.Chat 25029