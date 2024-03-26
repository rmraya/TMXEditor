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

class CsvLanguages {

    electron = require('electron');

    columns: number;
    options: string = '';

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.send('all-languages');
        this.electron.ipcRenderer.on('languages-list', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.languagesList(arg);
        });
        this.electron.ipcRenderer.on('set-csv-lang-args', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setCsvLangArgs(arg);
        });
        document.getElementById('setCsvLanguages').addEventListener('click', () => {
            this.setCsvLanguages();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.setCsvLanguages();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-csvLanguages');
            }
        });
        this.electron.ipcRenderer.send('csvLanguages-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    setCsvLanguages(): void {
        let langs: string[] = [];
        for (let i = 0; i < this.columns; i++) {
            let lang: string = (document.getElementById('lang_' + i) as HTMLSelectElement).value;
            if (lang !== 'none') {
                langs.push(lang);
            } else {
                this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'csvLanguages', key: 'selectAllLanguages', parent: 'csvLanguages' });
                return;
            }
        }
        this.electron.ipcRenderer.send('set-csv-languages', langs);
    }

    languagesList(langs: Language[]): void {
        for (let lang of langs) {
            this.options = this.options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        this.electron.ipcRenderer.send('get-csv-lang-args');
    }

    setCsvLangArgs(arg: any): void {
        this.columns = arg.columns;
        let rows: string = '';
        for (let i = 0; i < this.columns; i++) {
            rows = rows + '<tr><td class="noWrap middle">' + arg.labels[i] + '</td><td class="middle"><select id="lang_' + i + '" class="table_select">' + this.options + '</select></td></tr>'
        }
        document.getElementById('langsTable').innerHTML = rows;
        let langs: string[] = arg.languages;
        for (let i = 0; i < langs.length; i++) {
            (document.getElementById('lang_' + i) as HTMLSelectElement).value = langs[i];
        }
    }
}
