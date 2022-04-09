import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

export async function sendNotification(
    text: string, 
    read: IRead, 
    modify: IModify, 
    user: IUser, 
    room: IRoom, 
    arr?: string[]): Promise<void> {
    const sender = await read.getUserReader().getById('rocket.cat');

    let x: { imageUrl: string }[] = [];

    if (arr) {
        arr.map((url) => {
            x.push({ imageUrl: url });
        })
    }
    modify.getNotifier().notifyUser(user, modify.getCreator().startMessage({
        sender,
        room,
        text,
        groupable: false,
        attachments: x,
    }).getMessage());
}
