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

class ChangeLanguages {

    electron = require('electron');

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.send('get-file-languages');
        this.electron.ipcRenderer.on('file-languages', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.filterLanguages(arg);
        });
        this.electron.ipcRenderer.on('languages-list', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.languageList(arg)
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                this.changeLanguage();
            }
        });
        document.getElementById('changeLanguage').addEventListener('click', () => {
            this.changeLanguage();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.changeLanguage();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-changeLanguage');
            }
        });
        document.getElementById('currentLanguage').focus();
        this.electron.ipcRenderer.send('changeLanguage-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    languageList(langs: Language[]): void {
        let newLanguage: HTMLSelectElement = document.getElementById('newLanguage') as HTMLSelectElement;
        let options: string = '';
        for (let lang of langs) {
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        newLanguage.innerHTML = options;
    }

    filterLanguages(langs: Language[]): void {
        let currentLanguage: HTMLSelectElement = document.getElementById('currentLanguage') as HTMLSelectElement;
        let options: string = '';
        for (let lang of langs) {
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        currentLanguage.innerHTML = options;
        this.electron.ipcRenderer.send('all-languages');
    }

    changeLanguage(): void {
        let currentLanguage: HTMLSelectElement = document.getElementById('currentLanguage') as HTMLSelectElement;
        let newLanguage: HTMLSelectElement = document.getElementById('newLanguage') as HTMLSelectElement;
        if (newLanguage.value === 'none') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'changeLanguage', key: 'selectLanguageWarning', parent: 'changeLanguage' });
            return;
        }
        this.electron.ipcRenderer.send('change-language', { oldLanguage: currentLanguage.value, newLanguage: newLanguage.value });
    }
}
