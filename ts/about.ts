/*******************************************************************************
 * Copyright (c) 2018-2025 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

class About {

    electron = require('electron');

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.send('get-version');
        this.electron.ipcRenderer.on('set-version', (event: Electron.IpcRendererEvent, arg: any) => {
            document.getElementById('version').innerHTML = arg;
        });
        document.getElementById('system').addEventListener('click', () => {
            this.electron.ipcRenderer.send('system-info-clicked');
            document.getElementById('system').blur();
        });
        document.getElementById('licenses').addEventListener('click', () => {
            this.electron.ipcRenderer.send('licenses-clicked');
            document.getElementById('licenses').blur();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-about');
            }
        });
        this.electron.ipcRenderer.send('about-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }
}
