/*******************************************************************************
 * Copyright (c) 2018-2026 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { ipcRenderer } from "electron";

export class AddNote {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
            (document.getElementById('note') as HTMLInputElement).focus();
        });
        (document.getElementById('saveNote') as HTMLButtonElement).addEventListener('click', () => {
            this.saveNote();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.saveNote();
            }
            if (event.code === 'Escape') {
                ipcRenderer.send('close-addNote');
            }
        });
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'addNote', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    saveNote(): void {
        let note: string = (document.getElementById('note') as HTMLInputElement).value;
        if (note === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'addNote', key: 'enterNote', parent: 'addNote' });
            return;
        }
        ipcRenderer.send('add-new-note', note);
    }
}
