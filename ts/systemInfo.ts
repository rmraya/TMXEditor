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

export class SystemInformation {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.send('get-version');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.send('get-system-info');
        ipcRenderer.on('set-system-info', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setInfo(arg);
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                ipcRenderer.send('close-systemInfo');
            }
        });
    }

    setInfo(info: any): void {
        (document.getElementById('tmxeditor') as HTMLTableCellElement).innerText = info.tmxeditor;
        (document.getElementById('electron') as HTMLTableCellElement).innerText = info.electron;
        (document.getElementById('sdltm') as HTMLTableCellElement).innerText = info.sdltm;
        (document.getElementById('typesbcp47') as HTMLTableCellElement).innerText = info.typesbcp47;
        (document.getElementById('typesexcel') as HTMLTableCellElement).innerText = info.typesexcel;
        (document.getElementById('typesxml') as HTMLTableCellElement).innerText = info.typesxml;
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'systemInfo', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }
}
