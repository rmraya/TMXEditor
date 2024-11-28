/*******************************************************************************
 * Copyright (c) 2018-2024 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

class Licenses {

    electron = require('electron');

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        document.getElementById('TMXEditor').addEventListener('click', () => {
            this.openLicense('TMXEditor');
        });
        document.getElementById('bcp47j').addEventListener('click', () => {
            this.openLicense('BCP47J');
        });
        document.getElementById('electron').addEventListener('click', () => {
            this.openLicense('electron');
        });
        document.getElementById('Java').addEventListener('click', () => {
            this.openLicense('Java');
        });
        document.getElementById('sdltm').addEventListener('click', () => {
            this.openLicense('sdltm');
        });
        document.getElementById('SLF4J').addEventListener('click', () => {
            this.openLicense('SLF4J');
        });
        document.getElementById('SQLite').addEventListener('click', () => {
            this.openLicense('SQLite');
        });
        document.getElementById('TMXValidator').addEventListener('click', () => {
            this.openLicense('TMXValidator');
        });
        document.getElementById('typesxml').addEventListener('click', () => {
            this.openLicense('typesxml');
        });
        document.getElementById('XMLJava').addEventListener('click', () => {
            this.openLicense('XMLJava');
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-licenses');
            }
        });
        this.electron.ipcRenderer.send('licenses-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    openLicense(type: string): void {
        this.electron.ipcRenderer.send('open-license', { type: type });
    }
}
