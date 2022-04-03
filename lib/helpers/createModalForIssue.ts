import { IModify, IPersistence } from '@rocket.chat/apps-engine/definition/accessors';
import { RocketChatAssociationModel, RocketChatAssociationRecord } from '@rocket.chat/apps-engine/definition/metadata';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';

import { ButtonStyle } from '@rocket.chat/apps-engine/definition/uikit';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { IUIKitBlockIncomingInteraction } from '@rocket.chat/apps-engine/definition/uikit/UIKitIncomingInteractionTypes';

interface IModalContext extends Partial<IUIKitBlockIncomingInteraction> {
    threadId?: string;
}

export async function createModalForIssue({ id = '', persistence, data, modify }: {
    id?: string,
    persistence: IPersistence,
    data: IModalContext,
    modify: IModify,
}): Promise<IUIKitModalViewParam> {
    const viewId = id;

    const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, viewId);
    await persistence.createWithAssociation(data, association);
    const block = modify.getCreator().getBlockBuilder();

    let st: string = `Please see our guide for opening issues: https://rocket.chat/docs/contributing/reporting-issues
    \n If you have questions or are looking for help/support please see: https://rocket.chat/docs/getting-support
    \n If you are experiencing a bug please search our issues to be sure it is not already present: https://github.com/RocketChat/Rocket.Chat/issues
    ### Description:
    \n
    <!-- A clear and concise description of what the bug is. -->
    \n
    ### Steps to reproduce:
    \n
    1. <!-- Go to '...' -->
    \n
    2. <!-- Click on '....' -->
    \n
    3. <!-- and so on... -->
    \n
    ### Expected behavior:
    \n
    <!-- What you expect to happen -->
    \n
    ### Actual behavior:
    \n
    <!-- What actually happens with SCREENSHOT, if applicable -->
    \n
    ### Server Setup Information:
    \n
    - Version of Rocket.Chat Server: 
    \n
    - Operating System: 
    \n
    - Deployment Method: <!-- snap/docker/tar/etc -->
    \n
    - Number of Running Instances: 
    \n
    - DB Replicaset Oplog: 
    \n
    - NodeJS Version: 
    \n
    - MongoDB Version:
    \n
    ### Client Setup Information
    \n
    - Desktop App or Browser Version:
    \n
    - Operating System:
    \n
    ### Additional context
    \n
    <!-- Add any other context about the problem here. -->
    \n
    ### Relevant logs:
    \n
    <!-- Logs from both SERVER and BROWSER -->
    \n
    <!-- For more information about collecting logs please see: https://rocket.chat/docs/contributing/reporting-issues#gathering-logs -->
    `
    block.addInputBlock({
        blockId: 'issue-title',
        optional: false,
        element: block.newPlainTextInputElement({
            actionId: `ititle`,
            placeholder: block.newPlainTextObject('write the title here'),
        }),
        label: block.newPlainTextObject('Title'),
    });
    block.addDividerBlock();

    block.addInputBlock({
        blockId: 'issue-description',
        optional: false,
        element: block.newPlainTextInputElement({
            actionId: `idesc`,
            placeholder: block.newPlainTextObject("Markdown is supported"),
            initialValue: st,
            multiline: true,
        }),
        label: block.newPlainTextObject('Description'),

    });
    block.newMarkdownTextObject(`# heelo`)
    block.addDividerBlock();
    return {
        id: viewId,
        title: block.newPlainTextObject('Create Issue'),
        submit: block.newButtonElement({
            text: block.newPlainTextObject('Create'),
            style: ButtonStyle.DANGER,
        }),
        close: block.newButtonElement({
            text: block.newPlainTextObject('Dismiss'),
        }),
        blocks: block.getBlocks(),
    };
}
