

import { ILogger, IModify, IPersistence } from '@rocket.chat/apps-engine/definition/accessors';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';

import { ButtonStyle, IOptionObject, TextObjectType } from '@rocket.chat/apps-engine/definition/uikit';
import { EVENTS } from '../../data/events';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';


export async function createSubscribeToEventModal(
    {
        id = '',
        persistence,
        modify,
        logger,
        roomId
    }:
        {
            id?: string,
            persistence: IPersistence,
            modify: IModify,
            logger: ILogger,
            roomId: IRoom
        }): Promise<IUIKitModalViewParam> {
    const viewId = id;
    const block = modify.getCreator().getBlockBuilder();

    let options: IOptionObject[] = [];
    let e: any;
    for (e in EVENTS) {
        options.push({ text: { text: EVENTS[e].name, type: TextObjectType.PLAINTEXT }, value: EVENTS[e].id });
    };

    block.addInputBlock({
        blockId: 'repo-url',
        optional: false,
        element: block.newPlainTextInputElement({
            actionId: `rurl`,
            placeholder: block.newPlainTextObject("enter the repo url"),
        }),
        label: block.newPlainTextObject('Repository Url'),


    });
    block.addActionsBlock({
        blockId: "subscribe-events-list",
        elements: [
            block.newMultiStaticElement({
                placeholder: { text: "select events to listen", type: TextObjectType.PLAINTEXT },
                options: options,
            }),
        ],
    });

    return {
        id: viewId,
        title: block.newPlainTextObject('Select event to listen them'),
        submit: block.newButtonElement({
            text: block.newPlainTextObject('Add Events'),
            style: ButtonStyle.DANGER,
        }),
        close: block.newButtonElement({
            text: block.newPlainTextObject('Dismiss'),
        }),
        blocks: block.getBlocks(),
        notifyOnClose: true,
    };
}
