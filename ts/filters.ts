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

export class Filters {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.send('get-file-languages');
        ipcRenderer.on('file-languages', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.filterLanguages(arg);
        });
        ipcRenderer.on('set-filter-options', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setFilterOptions(arg);
        });
        ipcRenderer.on('set-source-language', (event: Electron.IpcRendererEvent, arg: any) => {
            if (arg.srcLang !== '*all*') {
                (document.getElementById('sourceLanguage') as HTMLSelectElement).value = arg.srcLang;
            }
        });
        (document.getElementById('filterText') as HTMLInputElement).addEventListener('keydown', (event: KeyboardEvent) => {
            if (process.platform === 'darwin' && event.code === 'KeyV' && (event.metaKey || event.ctrlKey)) {
                navigator.clipboard.readText().then(
                    clipText => (document.getElementById('filterText') as HTMLInputElement).value += clipText);
            }
        });
        (document.getElementById('filterUntranslated') as HTMLInputElement).addEventListener('click', () => {
            this.togleSourceLanguage();
        });
        (document.getElementById('applyFilters') as HTMLButtonElement).addEventListener('click', () => {
            this.applyFilters();
        });
        (document.getElementById('clearFilters') as HTMLButtonElement).addEventListener('click', () => {
            this.clearFilters();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.applyFilters();
            }
            if (event.code === 'Escape') {
                this.clearFilters();
            }
        });
        (document.getElementById('filterText') as HTMLInputElement).focus();
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'filters', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    togleSourceLanguage(): void {
        let checked: boolean = (document.getElementById('filterUntranslated') as HTMLInputElement).checked;
        (document.getElementById('sourceLanguage') as HTMLSelectElement).disabled = !checked;
    }

    filterLanguages(langs: Language[]): void {
        let sourceLanguage: HTMLSelectElement = document.getElementById('sourceLanguage') as HTMLSelectElement;
        let filterLanguage: HTMLSelectElement = document.getElementById('filterLanguage') as HTMLSelectElement;
        let options: string = '';
        for (let lang of langs) {
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        sourceLanguage.innerHTML = options;
        filterLanguage.innerHTML = options;
        ipcRenderer.send('get-filter-options');
        ipcRenderer.send('get-source-language');
    }

    setFilterOptions(arg: any): void {
        if (arg.filterText !== undefined) {
            (document.getElementById('filterText') as HTMLInputElement).value = arg.filterText;
        }
        if (arg.filterLanguage !== undefined) {
            (document.getElementById('filterLanguage') as HTMLSelectElement).value = arg.filterLanguage;
        }
        if (arg.caseSensitiveFilter !== undefined) {
            (document.getElementById('caseSensitiveFilter') as HTMLInputElement).checked = arg.caseSensitiveFilter;
        }
        if (arg.filterUntranslated !== undefined) {
            (document.getElementById('filterUntranslated') as HTMLInputElement).checked = arg.filterUntranslated;
        }
        if (arg.regExp !== undefined) {
            (document.getElementById('regularExpression') as HTMLInputElement).checked = arg.regExp;
        }
        if (arg.filterSrcLanguage !== undefined) {
            (document.getElementById('sourceLanguage') as HTMLSelectElement).value = arg.filterSrcLanguage;
        }
    }

    applyFilters(): void {
        let filterText: string = (document.getElementById('filterText') as HTMLInputElement).value;
        let filterLanguage: string = (document.getElementById('filterLanguage') as HTMLSelectElement).value;
        let caseSensitiveFilter: boolean = (document.getElementById('caseSensitiveFilter') as HTMLInputElement).checked;
        let regExp: boolean = (document.getElementById('regularExpression') as HTMLInputElement).checked;
        let filterUntranslated: boolean = (document.getElementById('filterUntranslated') as HTMLInputElement).checked;
        let filterSrcLanguage: string = (document.getElementById('sourceLanguage') as HTMLSelectElement).value;
        if (!filterUntranslated && filterText.length === 0) {
            ipcRenderer.send('show-message', { type: 'warning', group: 'filters', key: 'enterText', parent: 'filters' });
            return;
        }
        let filterOptions: any = {
            filterText: filterText,
            filterLanguage: filterLanguage,
            caseSensitiveFilter: caseSensitiveFilter,
            filterUntranslated: filterUntranslated,
            regExp: regExp,
            filterSrcLanguage: filterSrcLanguage
        };
        ipcRenderer.send('filter-options', filterOptions);
    }

    clearFilters(): void {
        ipcRenderer.send('clear-filter-options');
    }
}
