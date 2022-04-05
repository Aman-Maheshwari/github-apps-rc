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
import { UIKitBlockInteractionContext, UIKitViewSubmitInteractionContext } from '@rocket.chat/apps-engine/definition/uikit';
import { UIKitInteractionResponder } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { WebhookEndpoint } from './endpoints/webhook';
import { createModalForIssue } from './lib/helpers/createModalForIssue';
import { toggleModalView } from './lib/helpers/toggleModalView';
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


    public async executeBlockActionHandler(
        context: UIKitBlockInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify,
    ) {
        const data = context.getInteractionData();
        const { actionId } = data;

        this.getLogger().debug('action id =========', actionId);
        switch (actionId) {
            case "createIssue": {
                try {
                    this.getLogger().debug('data.value === ', data.value);
                    if (data.value === 'write') {
                        const mdl = await createModalForIssue({ id: 'modalid', persistence, modify, type: 'write' });
                        return context.getInteractionResponder().updateModalViewResponse(mdl);
                    }

                    else if (data.value === 'preview') {
                        const mdl = await createModalForIssue({ id: 'modalid', persistence, modify, type: 'preview' });
                        this.getLogger().debug('mdl = ', mdl)
                        return context.getInteractionResponder().updateModalViewResponse(mdl);
                    }
                    return {
                        success: true,
                    };
                } catch (err) {
                    console.error(err);
                    return {
                        success: false,
                    };
                }
            }
        }

        return {
            success: false,
        };
    }

    public async executeViewSubmitHandler(context: UIKitViewSubmitInteractionContext, read: IRead, http: IHttp, persistence: IPersistence, modify: IModify) {
        const data = context.getInteractionData();
        const { state }: {
            state: {
                'issue-title': {
                    ititle: string,
                },
                'issue-description': {
                    idesc: string
                }
            },
        } = data.view as any;

        this.getLogger().debug("data view = ", data.view);
        try {
            const sdk = new GithubSDK(http, '123', this.getLogger());
            await sdk.createIssue('Aman-Maheshwari', 'getwork', state['issue-title'], state['issue-description']);
        } catch (error) {

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
