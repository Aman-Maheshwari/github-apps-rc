import {
    IAppAccessors,
    IConfigurationExtend,
    IEnvironmentRead,
    IHttp,
    ILogger,
    IModify,
    IPersistence,
    IRead,
    IUIKitInteractionParam,
} from '@rocket.chat/apps-engine/definition/accessors';

import { ApiSecurity, ApiVisibility } from '@rocket.chat/apps-engine/definition/api';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { ISetting, SettingType } from '@rocket.chat/apps-engine/definition/settings';
import { IUIKitResponse, IUIKitSurface, UIKitActionButtonInteractionContext, UIKitBlockInteractionContext, UIKitViewCloseInteractionContext, UIKitViewSubmitInteractionContext } from '@rocket.chat/apps-engine/definition/uikit';
import { IUIKitModalViewParam, UIKitInteractionResponder } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { WebhookEndpoint } from './endpoints/webhook';
import { createModalForIssue } from './lib/helpers/createModalForIssue';
import { GithubSDK } from './lib/sdk';
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


    public async executeViewSubmitHandler(
        context: UIKitViewSubmitInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify) {
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

        let mdl: IUIKitModalViewParam;
        if (data.view.title.text === 'Create Issue/write') {
            mdl = await createModalForIssue({
                id: 'modalid', persistence, modify, type: 'preview', content: state
            });
            return context.getInteractionResponder().updateModalViewResponse(mdl);
        }

        else if (data.view.title.text === 'Create Issue/preview') {
            mdl = await createModalForIssue({
                id: 'modalid', persistence, modify, type: 'write', content: state
            });
            return context.getInteractionResponder().updateModalViewResponse(mdl);

        }
        return {
            success: true,
        };
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
