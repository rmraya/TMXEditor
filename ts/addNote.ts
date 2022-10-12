/*******************************************************************************
 * Copyright (c) 2018-2022 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

class AddNote {

    electron = require('electron');

    currentId: string;
    currentType: string;

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
            (document.getElementById('note') as HTMLInputElement).focus();
        });
        document.getElementById('saveNote').addEventListener('click', () => {
            this.saveNote();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.saveNote();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-addNote');
            }
        });
        let body: HTMLBodyElement = document.getElementById('body') as HTMLBodyElement;
        this.electron.ipcRenderer.send('addNote-height', { width: body.clientWidth, height: body.clientHeight });
    }

    saveNote(): void {
        var note: string = (document.getElementById('note') as HTMLInputElement).value;
        if (note === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Enter note', parent: 'addNote' });
            return;
        }
        this.electron.ipcRenderer.send('add-new-note', { note: note });
    }
}
