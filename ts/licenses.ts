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

export class Licenses {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
            setTimeout(() => {
                ipcRenderer.send('set-height', { window: 'licenses', width: document.body.clientWidth, height: document.body.clientHeight });
            }, 200);
        });
        (document.getElementById('TMXEditor') as HTMLAnchorElement).addEventListener('click', () => {
            this.openLicense('TMXEditor');
        });
        (document.getElementById('electron') as HTMLAnchorElement).addEventListener('click', () => {
            this.openLicense('electron');
        });
        (document.getElementById('sdltm') as HTMLAnchorElement).addEventListener('click', () => {
            this.openLicense('sdltm');
        });
        (document.getElementById('typesbcp47') as HTMLAnchorElement).addEventListener('click', () => {
            this.openLicense('typesbcp47');
        });
        (document.getElementById('typesexcel') as HTMLAnchorElement).addEventListener('click', () => {
            this.openLicense('typesexcel');
        });
        (document.getElementById('typesxml') as HTMLAnchorElement).addEventListener('click', () => {
            this.openLicense('typesxml');
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                ipcRenderer.send('close-licenses');
            }
        });
    }

    openLicense(type: string): void {
        ipcRenderer.send('open-license', type);
    }
}
