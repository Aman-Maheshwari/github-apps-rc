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
import { UIKitBlockInteractionContext, UIKitViewSubmitInteractionContext } from '@rocket.chat/apps-engine/definition/uikit';
import { WebhookEndpoint } from './endpoints/webhook';
import { GithubSDK } from './lib/sdk';
import { GithubSlashcommand } from './slashcommands/github';

export class AppsGithubApp extends App {
    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
    }

    public async executeBlockActionHandler(
        context: UIKitBlockInteractionContext,
        read: IRead,
        http: IHttp,
        persistence: IPersistence,
        modify: IModify
    ) {
        const data = context.getInteractionData();
        const { actionId } = data;

        switch (actionId) {
            case "create": {
                try {
                    this.getLogger().debug("gotinter")
                    const data = context.getInteractionData();

                    this.getLogger().debug(data);
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

            case "aman": {
                try {
                    this.getLogger().debug("aman")
                    const data = context.getInteractionData();

                    this.getLogger().debug(data);
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
            await sdk.createIssue('Aman-Maheshwari', 'getwork',state['issue-title'],state['issue-description']);
        } catch (error) {

        }
        // try {
        //     await createLineupMessage(data, http, read, modify, persistence, data.user.id);
        // } catch (err) {
        //     return context.getInteractionResponder().viewErrorResponse({
        //         viewId: data.view.id,
        //         errors: err,
        //     });
        // }
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



        configuration.slashCommands.provideSlashCommand(new GithubSlashcommand(this));
    }
}
