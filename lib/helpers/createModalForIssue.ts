import { IModify, IPersistence } from '@rocket.chat/apps-engine/definition/accessors';
import { IUIKitModalViewParam } from '@rocket.chat/apps-engine/definition/uikit/UIKitInteractionResponder';

import { ButtonStyle } from '@rocket.chat/apps-engine/definition/uikit';


export async function createModalForIssue(
    {
        id = '',
        persistence,
        modify,
        type = 'write',
        content,
    }:
        {
            id?: string,
            persistence: IPersistence,
            // data: IModalContext,
            modify: IModify,
            type: string,
            content: {
                'issue-title': {
                    ititle: string,
                },
                'issue-description': {
                    idesc: string
                }
            }
        }): Promise<IUIKitModalViewParam> {
    const viewId = id;

    // const association = new RocketChatAssociationRecord(RocketChatAssociationModel.MISC, viewId);
    // await persistence.createWithAssociation(data, association);
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

    if (type === 'write') {
        block.addInputBlock({
            blockId: 'issue-title',
            optional: false,
            element: block.newPlainTextInputElement({
                actionId: `ititle`,
                placeholder: block.newPlainTextObject('write the title here'),
                initialValue: content['issue-title'].ititle
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
                initialValue: st || content['issue-description'].idesc,
                multiline: true,
            }),
            label: block.newPlainTextObject('Description'),

        });
    }
    else {
        block.addSectionBlock({
            text: block.newMarkdownTextObject(content['issue-title'].ititle)
        });

        block.addDividerBlock();
        block.addSectionBlock({
            text: block.newMarkdownTextObject(content['issue-description'].idesc)
        })
    }

    block.addDividerBlock();
    return {
        id: viewId,
        title: type === 'write' ? block.newPlainTextObject('Create Issue/write') : block.newPlainTextObject('Create Issue/preview'),
        submit: block.newButtonElement({
            text: type === 'write' ? block.newPlainTextObject('Preivew') : block.newPlainTextObject('Write'),
            style: ButtonStyle.DANGER,
        }),
        close: block.newButtonElement({
            text: type === 'preview' ? block.newPlainTextObject('Create') : block.newPlainTextObject('Dismiss'),
        }),
        blocks: block.getBlocks(),
        clearOnClose: true,
        notifyOnClose: true,
    };
}
