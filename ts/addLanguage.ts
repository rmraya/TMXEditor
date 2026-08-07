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

export class AddLanguage {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.send('all-languages');
        ipcRenderer.on('languages-list', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.languageList(arg);
        });
        (document.getElementById('addLanguage') as HTMLButtonElement).addEventListener('click', () => {
            this.addLanguage();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.addLanguage();
            }
            if (event.code === 'Escape') {
                ipcRenderer.send('close-addLanguage');
            }
        });
        (document.getElementById('language') as HTMLSelectElement).focus();
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'addLanguage', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    languageList(langs: Language[]): void {
        let language: HTMLSelectElement = document.getElementById('language') as HTMLSelectElement;
        let options: string = '';
        for (let lang of langs) {
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>';
        }
        language.innerHTML = options;
    }

    addLanguage(): void {
        let language: HTMLSelectElement = document.getElementById('language') as HTMLSelectElement;
        if (language.value === 'none') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'addLanguage', key: 'selectLanguageWarning', parent: 'addLanguage' });
            return;
        }
        ipcRenderer.send('add-language', language.value);
    }
}
