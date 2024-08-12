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

class SearchReplace {

    electron = require("electron");

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.send('get-file-languages');
        this.electron.ipcRenderer.on('file-languages', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.filterLanguages(arg);
        });
        
        document.getElementById('replace').addEventListener('click', () => {
            this.replace();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.replace();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-replaceText');
            }
        });
        document.getElementById('searchText').focus();
        this.electron.ipcRenderer.send('replaceText-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    filterLanguages(langs: Language[]): void {
        let language: HTMLSelectElement = document.getElementById('language') as HTMLSelectElement;
        let options: string = '';
        for (let lang of langs) {
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        language.innerHTML = options;
    }

    replace(): void {
        let searchText: string = (document.getElementById('searchText') as HTMLInputElement).value;
        let replaceText: string = (document.getElementById('replaceText') as HTMLInputElement).value;
        let language: string = (document.getElementById('language') as HTMLSelectElement).value;
        if (searchText.length === 0) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'searchReplace', key: 'enterSearchText', parent: 'searchReplace' });
            return;
        }
        if (replaceText.length === 0) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'searchReplace', key: 'enterReplaceText', parent: 'searchReplace' });
            return;
        }
        let regularExpression: boolean = (document.getElementById('regularExpression') as HTMLInputElement).checked;
        this.electron.ipcRenderer.send('replace-request', { search: searchText, replace: replaceText, lang: language, regExp: regularExpression });
    }
}
