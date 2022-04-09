import { IApiEndpointMetadata } from '@rocket.chat/apps-engine/definition/api';
import { AppsGithubApp } from '../../AppsGithubApp';

export async function getWebhookUrl(app: AppsGithubApp): Promise<string> {
    const accessors = app.getAccessors();

    const webhookEndpoint = accessors.providedApiEndpoints.find((endpoint) => endpoint.path === 'webhook') as IApiEndpointMetadata;
    // this.app.getLogger().debug('webhookEndpoint = ', webhookEndpoint)
    const siteUrl = await accessors.environmentReader.getServerSettings().getValueById('Site_Url');

    return siteUrl + webhookEndpoint.computedPath;
}

// export async function getUser(app: AppsGithubApp) {

//     app.getAccessors().
// }