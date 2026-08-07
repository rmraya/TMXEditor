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

export class SortUnits {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.send('get-file-languages');
        ipcRenderer.on('file-languages', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.filterLanguages(arg);
        });
        ipcRenderer.on('sort-options', (event: Electron.IpcRendererEvent, arg: any) => {
            this.sortOptions(arg);
        });
        (document.getElementById('sort') as HTMLButtonElement).addEventListener('click', () => {
            this.sort();
        });
        (document.getElementById('clearSort') as HTMLButtonElement).addEventListener('click', () => {
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
        (document.getElementById('sortLanguage') as HTMLSelectElement).focus();
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'sortUnits', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    filterLanguages(langs: Language[]): void {
        let sortLanguage: HTMLSelectElement = document.getElementById('sortLanguage') as HTMLSelectElement;
        let options: string = '';
        for (let lang of langs) {
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        sortLanguage.innerHTML = options;
        ipcRenderer.send('get-sort');
    }

    sortOptions(arg: any): void {
        if (arg.sortLanguage != undefined) {
            (document.getElementById('sortLanguage') as HTMLSelectElement).value = arg.sortLanguage;
        }
        if (arg.ascending != undefined) {
            (document.getElementById('descending') as HTMLInputElement).checked = !arg.ascending;
        }
        if (arg.caseSensitiveSort != undefined) {
            (document.getElementById('caseSensitiveSort') as HTMLInputElement).checked = arg.caseSensitiveSort;
        }
    }

    sort(): void {
        let language: string = (document.getElementById('sortLanguage') as HTMLSelectElement).value;
        let desc: boolean = (document.getElementById('descending') as HTMLInputElement).checked;
        let caseSensitiveSort: boolean = (document.getElementById('caseSensitiveSort') as HTMLInputElement).checked;
        ipcRenderer.send('set-sort', { sortLanguage: language, ascending: !desc, caseSensitiveSort: caseSensitiveSort });
    }

    clearSort(): void {
        ipcRenderer.send('clear-sort');
    }
}
