import {
    IAppAccessors,
    IConfigurationExtend,
    IEnvironmentRead,
    IHttp,
    ILogger,
    IModify,
    IPersistence,
    IRead,
} from '@rocket.chat/apps-engine/definition/accessors';

import { ApiSecurity, ApiVisibility } from '@rocket.chat/apps-engine/definition/api';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';
import { IUIKitResponse, UIKitBlockInteractionContext, UIKitViewCloseInteractionContext, UIKitViewSubmitInteractionContext } from '@rocket.chat/apps-engine/definition/uikit';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';
import { WebhookEndpoint } from './endpoints/webhook';
import { createModalForIssue } from './lib/helpers/createModalForIssue';
import { getWebhookUrl } from './lib/helpers/getWebhookUrl';
import { sendNotification } from './lib/helpers/sendNotification';
import { AppPersistence } from './lib/persistence';
import { getRepoName, GithubSDK } from './lib/sdk';
import { GithubSlashcommand } from './slashcommands/github';


const settings: Array<ISetting> = [
    {
        id: 'github',
        public: true,
        type: SettingType.BOOLEAN,
        packageValue: '',
        i18nLabel: 'bot_username',
        required: true,
    },
    {
        id: 'test-setting2',
        public: true,
        type: SettingType.STRING,
        packageValue: '',
        i18nLabel: 'dialogflow_project_id',
        required: true,
    },
]
export class AppsGithubApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async executeViewClosedHandler(
        context: UIKitViewCloseInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify): Promise<IUIKitResponse> {

        const data = context.getInteractionData();

        const { state }: {
            state: {
                'issue-title': {
                    ititle: string,
                },
                'issue-description': {
                    idesc: string
                },
            },
        } = data.view as any;
        this.getLogger().debug('data view = ', data.view)

        if (data.view.title.text === 'Create Issue/preview') {
            try {
                const sdk = new GithubSDK(http, '123', this.getLogger());
                await sdk.createIssue('Aman-Maheshwari', 'getwork', state['issue-title'], state['issue-description']);
            } catch (error) {

            }
        }
        return {
            success: true,
        };

    };

    public async executeBlockActionHandler(
        context: UIKitBlockInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify): Promise<IUIKitResponse> {
        const { blockId, user, value } = context.getInteractionData();
        const persi = new AppPersistence(persistence, read.getPersistenceReader());
        if (blockId === "subscribe-events-list") {
            await persi.storeSubscribedEventsForWebhook(value, user);
        }
        return context.getInteractionResponder().successResponse()
    };

    public async executeViewSubmitHandler(
        context: UIKitViewSubmitInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify) {
        const { view, user } = context.getInteractionData();


        const { state }: {
            state: {
                'issue-title': {
                    ititle: string,
                },
                'issue-description': {
                    idesc: string
                },
                'subscribe-event-list': {
                    list: string[]
                },
                'repo-url': {
                    rurl: string
                },
                'room': IRoom
            },
        } = view as any;

        this.getLogger().debug('data = ', view.state);
        let mdl: IUIKitModalViewParam;
        if (view.title.text === 'Create Issue/write') {
            mdl = await createModalForIssue({
                id: 'modalid', persistence, modify, type: 'preview', content: state
            });
            return context.getInteractionResponder().updateModalViewResponse(mdl);
        }

        else if (view.title.text === 'Create Issue/preview') {
            mdl = await createModalForIssue({
                id: 'modalid', persistence, modify, type: 'write', content: state
            });
            return context.getInteractionResponder().updateModalViewResponse(mdl);
        }
        else {
            const persi = new AppPersistence(persistence, read.getPersistenceReader());
            const subsEvents = await persi.getSubscribedEventsForWebhook(user);
            const room = await persi.getRoom(user);
            this.getLogger().debug("room = ", room);
            if (subsEvents) {
                const sdk = new GithubSDK(http, '123', this.getLogger());
                try {
                    const repoName = getRepoName(state['repo-url'].rurl);

                    if (!repoName) {
                        await sendNotification('Invalid GitHub repo address', read, modify, user, room);
                        return;
                    }

                    await sdk.createWebhook(repoName, await getWebhookUrl(this), persistence, read, user);
                    await persi.connectRepoToRoom(repoName, room);

                    await sendNotification('Successfully connected repo', read, modify, user, room);
                } catch (err) {
                    this.getLogger().debug('err = ', err);
                    await sendNotification('Error connecting to the repo', read, modify, user, room);
                    return;
                }
            }
            return {
                success: true,
            };
        }
    }

    protected async extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {
        configuration.api.provideApi({
            visibility: ApiVisibility.PUBLIC,
            security: ApiSecurity.UNSECURE,
            endpoints: [new WebhookEndpoint(this)],
        });

        // configuration.ui.registerButton({
        //     actionId: 'my-action-id', // this identifies your button in the interaction event
        //     labelI18n: 'my-action-name', // key of the i18n string containing the name of the button
        //     context: UIActionButtonContext.MESSAGE_BOX_ACTION, // in what context the action button will be displayed in the UI
        // });

        await Promise.all(
            settings.map((setting) =>
                configuration.settings.provideSetting(setting),
            ),
        );

        configuration.slashCommands.provideSlashCommand(new GithubSlashcommand(this));
    }
}
