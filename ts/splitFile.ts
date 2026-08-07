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

export class SplitFile {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.on('tmx-file', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('file') as HTMLInputElement).value = arg;
        });
        (document.getElementById('browseFiles') as HTMLButtonElement).addEventListener('click', () => {
            this.browseFiles();
        });
        (document.getElementById('splitFile') as HTMLButtonElement).addEventListener('click', () => {
            this.splitFile();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.splitFile();
            }
            if (event.code === 'Escape') {
                ipcRenderer.send('close-splitFile');
            }
        });
        (document.getElementById('file') as HTMLInputElement).focus();
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'splitFile', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    splitFile(): void {
        let file: string = (document.getElementById('file') as HTMLInputElement).value;
        if (file === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'splitFile', key: 'selectTmx', parent: 'splitFile' });
            return;
        }
        let parts: number = Number.parseInt((document.getElementById('parts') as HTMLInputElement).value);
        ipcRenderer.send('split-tmx', { file: file, parts: parts });
    }

    browseFiles(): void {
        ipcRenderer.send('select-tmx');
    }
}
