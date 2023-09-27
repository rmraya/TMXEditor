/*******************************************************************************
 * Copyright (c) 2023 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

class SplitFile {

    electron = require('electron');

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.on('tmx-file', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('file') as HTMLInputElement).value = arg;
        });
        document.getElementById('browseFiles').addEventListener('click', () => {
            this.browseFiles();
        });
        document.getElementById('splitFile').addEventListener('click', () => {
            this.splitFile();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.splitFile();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-splitFile');
            }
        });
        document.getElementById('file').focus();
        this.electron.ipcRenderer.send('splitFile-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    splitFile(): void {
        let file: string = (document.getElementById('file') as HTMLInputElement).value;
        if (file === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'splitFile', key: 'selectTmx', parent: 'splitFile' });
            return;
        }
        let parts = Number.parseInt((document.getElementById('parts') as HTMLInputElement).value);
        this.electron.ipcRenderer.send('split-tmx', { file: file, parts: parts });
    }

    browseFiles(): void {
        this.electron.ipcRenderer.send('select-tmx');
    }
}
