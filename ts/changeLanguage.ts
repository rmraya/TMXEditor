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

export class ChangeLanguages {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.send('get-file-languages');
        ipcRenderer.on('file-languages', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.filterLanguages(arg);
        });
        ipcRenderer.on('languages-list', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.languageList(arg)
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                this.changeLanguage();
            }
        });
        (document.getElementById('changeLanguage') as HTMLButtonElement).addEventListener('click', () => {
            this.changeLanguage();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.changeLanguage();
            }
            if (event.code === 'Escape') {
                ipcRenderer.send('close-changeLanguage');
            }
        });
        (document.getElementById('currentLanguage') as HTMLSelectElement).focus();
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'changeLanguage', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
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
        ipcRenderer.send('all-languages');
    }

    changeLanguage(): void {
        let currentLanguage: HTMLSelectElement = document.getElementById('currentLanguage') as HTMLSelectElement;
        let newLanguage: HTMLSelectElement = document.getElementById('newLanguage') as HTMLSelectElement;
        if (newLanguage.value === 'none') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'changeLanguage', key: 'selectLanguageWarning', parent: 'changeLanguage' });
            return;
        }
        ipcRenderer.send('change-language', { oldLanguage: currentLanguage.value, newLanguage: newLanguage.value });
    }
}
