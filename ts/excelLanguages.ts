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
import { Language } from "./language.js";

export class ExcelLanguages {

    options: string = '';
    columns: string[] = [];

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.send('all-languages');
        ipcRenderer.on('languages-list', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.languagesList(arg);
        });
        ipcRenderer.on('set-excel-lang-args', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setExcelLangArgs(arg);
        });
        (document.getElementById('setExcelLanguages') as HTMLButtonElement).addEventListener('click', () => {
            this.setExcelLanguages();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.setExcelLanguages();
            }
            if (event.code === 'Escape') {
                ipcRenderer.send('close-excelLanguages');
            }
        });
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'excelLanguages', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    languagesList(langs: Language[]): void {
        for (let lang of langs) {
            this.options = this.options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        ipcRenderer.send('get-excel-lang-args');
    }

    setExcelLangArgs(arg: any): void {
        this.columns = arg.columns;
        let rows: string = '';
        for (let i: number = 0; i < this.columns.length; i++) {
            rows = rows + '<tr><td class="noWrap middle">' + arg.labels[i] + '</td><td class="middle"><select id="lang_' + i + '" class="table_select">' + this.options + '</select></td></tr>'
        }
        (document.getElementById('langsTable') as HTMLTableElement).innerHTML = rows;
        let langs: string[] = arg.languages;
        for (let i: number = 0; i < langs.length; i++) {
            (document.getElementById('lang_' + i) as HTMLSelectElement).value = langs[i];
        }
    }

    setExcelLanguages(): void {
        let langs: string[] = [];
        for (let i: number = 0; i < this.columns.length; i++) {
            let lang: string = (document.getElementById('lang_' + i) as HTMLSelectElement).value;
            if (lang !== 'none') {
                langs.push(lang);
            } else {
                ipcRenderer.send('show-message', { type: 'warning', group: 'excelLanguages', key: 'selectAllLanguages', parent: 'excelLanguages' });
                return;
            }
        }
        ipcRenderer.send('set-excel-languages', langs);
    }

}
