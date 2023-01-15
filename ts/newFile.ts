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

class NewFile {

    electron = require('electron');

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.send('all-languages');
        this.electron.ipcRenderer.on('languages-list', (event: Electron.IpcRendererEvent, arg: any) => {
            this.languagesList(arg);
        });
        document.getElementById('createFile').addEventListener('click', () => {
            this.createFile();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.createFile();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-newFile');
            }
        });
        this.electron.ipcRenderer.send('newFile-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    languagesList(arg: any): void {
        var srcLanguage: HTMLSelectElement = document.getElementById('srcLanguage') as HTMLSelectElement;
        var tgtLanguage: HTMLSelectElement = document.getElementById('tgtLanguage') as HTMLSelectElement;
        var options: string = '';
        for (let i: number = 0; i < arg.length; i++) {
            let lang: any = arg[i];
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        srcLanguage.innerHTML = options;
        tgtLanguage.innerHTML = options;
    }

    createFile(): void {
        var srcLanguage: HTMLSelectElement = document.getElementById('srcLanguage') as HTMLSelectElement;
        var tgtLanguage: HTMLSelectElement = document.getElementById('tgtLanguage') as HTMLSelectElement;
        if (srcLanguage.value === tgtLanguage.value) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select different languages', parent: 'newFile' });
            return;
        }
        this.electron.ipcRenderer.send('create-file', { srcLang: srcLanguage.value, tgtLang: tgtLanguage.value });
    }
}
