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

class AddLanguage {

    electron = require('electron');

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        this.electron.ipcRenderer.send('all-languages');
        this.electron.ipcRenderer.on('languages-list', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.languageList(arg);
        });
        document.getElementById('addLanguage').addEventListener('click', () => {
            this.addLanguage();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.addLanguage();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-addLanguage');
            }
        });
        document.getElementById('language').focus();
        this.electron.ipcRenderer.send('addLanguage-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    languageList(langs: Language[]): void {
        let language: HTMLSelectElement = document.getElementById('language') as HTMLSelectElement;
        let options: string = '';
        for (let lang of langs) {
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        language.innerHTML = options;
    }

    addLanguage(): void {
        let language: HTMLSelectElement = document.getElementById('language') as HTMLSelectElement;
        if (language.value === 'none') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'addLanguage', key: 'selectLanguageWarning', parent: 'addLanguage' });
            return;
        }
        this.electron.ipcRenderer.send('add-language', language.value);
    }
}
