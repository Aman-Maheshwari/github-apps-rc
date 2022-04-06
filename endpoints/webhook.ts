import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ApiEndpoint, IApiEndpointInfo, IApiRequest, IApiResponse } from '@rocket.chat/apps-engine/definition/api';
import { AppPersistence } from '../lib/persistence';

export class WebhookEndpoint extends ApiEndpoint {
    public path = 'webhook';

    public async post(
        request: IApiRequest,
        endpoint: IApiEndpointInfo,
        read: IRead,
        modify: IModify,
        http: IHttp,
        persis: IPersistence,
    ): Promise<IApiResponse> {
        const sender = await read.getUserReader().getById('rocket.cat');
        if (request.headers['x-github-event'] !== 'issues') {
            return this.success();
        }

        this.app.getLogger().debug('sender - ', sender);
        let payload: any;

        if (request.headers['content-type'] === 'application/x-www-form-urlencoded') {
            payload = JSON.parse(request.content.payload);
        } else {
            payload = request.content;
        }

        const persistence = new AppPersistence(persis, read.getPersistenceReader());

        const roomId = await persistence.getConnectedRoomId(payload.repository.full_name);

        if (!roomId) {
            return this.success();
        }

        const room = await read.getRoomReader().getById(roomId);
        if (!room) {
            return this.success();
        }


        const message = modify.getCreator().startMessage()
            .setRoom(room)
            // .setSender(sender)
            .setAvatarUrl(payload.sender.avatar_url)
            .setText(`[${payload.sender.login}](${payload.issue.user.html_url}) created issue 
            ${payload.issue.html_url} 
            in repository [${payload.repository.full_name}](${payload.repository.html_url})`)
            .setUsernameAlias('git-bot');


        await modify.getCreator().finish(message);

        return this.success();
    }
}
