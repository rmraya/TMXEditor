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

class SortUnits {

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
        this.electron.ipcRenderer.on('sort-options', (event: Electron.IpcRendererEvent, arg: any) => {
            this.sortOptions(arg);
        });
        document.getElementById('sort').addEventListener('click', () => {
            this.sort();
        });
        document.getElementById('clearSort').addEventListener('click', () => {
            this.clearSort();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.sort();
            }
            if (event.code === 'Escape') {
                this.clearSort();
            }
        });
        document.getElementById('sortLanguage').focus();
        this.electron.ipcRenderer.send('sortUnits-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    filterLanguages(langs: Language[]): void {
        let sortLanguage: HTMLSelectElement = document.getElementById('sortLanguage') as HTMLSelectElement;
        let options: string = '';
        for (let lang of langs) {
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        sortLanguage.innerHTML = options;
        this.electron.ipcRenderer.send('get-sort');
    }

    sortOptions(arg: any): void {
        if (arg.sortLanguage != undefined) {
            (document.getElementById('sortLanguage') as HTMLSelectElement).value = arg.sortLanguage;
        }
        if (arg.ascending != undefined) {
            (document.getElementById('descending') as HTMLInputElement).checked = !arg.ascending;
        }
    }

    sort(): void {
        let language: string = (document.getElementById('sortLanguage') as HTMLSelectElement).value;
        let desc: boolean = (document.getElementById('descending') as HTMLInputElement).checked;
        this.electron.ipcRenderer.send('set-sort', { sortLanguage: language, ascending: !desc });
    }

    clearSort(): void {
        this.electron.ipcRenderer.send('clear-sort');
    }
}
