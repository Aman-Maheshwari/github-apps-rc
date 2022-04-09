import { IPersistence, IPersistenceRead } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

export class AppPersistence {
    constructor(private readonly persistence: IPersistence, private readonly persistenceRead: IPersistenceRead) { }

    public async connectRepoToRoom(repoName: string, room: IRoom): Promise<void> {
        const roomAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.ROOM, room.id);
        const repoAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `repo:${repoName}`);

        await this.persistence.updateByAssociations([roomAssociation, repoAssociation], {
            repoName,
            room: room.id,
        }, true);
    }

    public async setUserAccessToken(accessToken: string, user: IUser): Promise<void> {
        const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
        const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'github-key');

        await this.persistence.updateByAssociations([userAssociation, typeAssociation], { accessToken }, true);
    }

    public async getConnectedRoomId(repoName: string): Promise<string | undefined> {
        const repoAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, `repo:${repoName}`);

        const [result] = await this.persistenceRead.readByAssociations([repoAssociation]);

        return result ? (result as any).room : undefined;
    }

    public async getUserAccessToken(user: IUser): Promise<string | undefined> {
        const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
        const typeAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'github-key');

        const [result] = await this.persistenceRead.readByAssociations([userAssociation, typeAssociation]);

        return result ? (result as any).accessToken : undefined;
    }

    public async storePreviousCommand(command: string | string[], user: IUser): Promise<void> {
        const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
        const commandAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'command');

        await this.persistence.updateByAssociations([userAssociation, commandAssociation], { command }, true);
    }

    public async getPreviousCommand(user: IUser): Promise<string | undefined> {
        const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
        const commandAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'command');

        const [result] = await this.persistenceRead.readByAssociations([userAssociation, commandAssociation]);

        return result ? (result as any).command : undefined;
    }

    public async storeSubscribedEventsForWebhook(value: string[] | string | undefined, user: IUser): Promise<void> {
        const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
        const eventAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'subs-events-list');

        await this.persistence.updateByAssociations([userAssociation, eventAssociation], { value }, true);
    }

    public async getSubscribedEventsForWebhook(user: IUser): Promise<string[] | undefined> {
        const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
        const eventAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'subs-events-list');

        const [result] = await this.persistenceRead.readByAssociations([userAssociation, eventAssociation]);

        return result ? (result as any).value : undefined;
    }

    public async setRoom(room: IRoom, user: IUser): Promise<void> {
        const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
        const eventAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'set-room');
        await this.persistence.updateByAssociations([userAssociation, eventAssociation], { room }, true);
    };


    public async getRoom(user: IUser): Promise<IRoom> {
        const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
        const eventAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'set-room');
        const [result] = await this.persistenceRead.readByAssociations([userAssociation, eventAssociation]);

        return result ? (result as any).room : undefined;
    }

    public async setUser(user: IUser): Promise<void> {
        // const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
        const eventAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'set-user');
        await this.persistence.updateByAssociations([eventAssociation], { user }, true);
    };


    public async getUser(): Promise<IUser> {
        // const userAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.USER, user.id);
        const eventAssociation = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, 'set-user');
        const [result] = await this.persistenceRead.readByAssociations([eventAssociation]);

        return result ? (result as any).user : undefined;
    }
}
