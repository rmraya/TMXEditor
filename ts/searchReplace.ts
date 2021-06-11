/*******************************************************************************
 * Copyright (c) 2018-2021 Maxprograms.
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
        this.electron.ipcRenderer.send('get-filter-languages');
        this.electron.ipcRenderer.on('filter-languages', (event: Electron.IpcRendererEvent, arg: any) => {
            this.filterLanguages(arg);
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => { KeyboardHandler.keyListener(event); });

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
        let body: HTMLBodyElement = document.getElementById('body') as HTMLBodyElement;
        this.electron.ipcRenderer.send('replaceText-height', { width: body.clientWidth, height: body.clientHeight });
    }

    filterLanguages(arg: any): void {
        var language: HTMLSelectElement = document.getElementById('language') as HTMLSelectElement;
        var options: string = '';
        for (let i: number = 0; i < arg.length; i++) {
            let lang: any = arg[i];
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        language.innerHTML = options;
    }

    replace(): void {
        var searchText: string = (document.getElementById('searchText') as HTMLInputElement).value;
        var replaceText: string = (document.getElementById('replaceText') as HTMLInputElement).value;
        var language: string = (document.getElementById('language') as HTMLSelectElement).value;
        if (searchText.length === 0) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Enter text to search', parent: 'searchReplace' });
            return;
        }
        if (replaceText.length === 0) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Enter replacement text', parent: 'searchReplace' });
            return;
        }
        var regularExpression: boolean = (document.getElementById('regularExpression') as HTMLInputElement).checked;
        this.electron.ipcRenderer.send('replace-request', { search: searchText, replace: replaceText, lang: language, regExp: regularExpression });
    }
}

new SearchReplace();