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

export class NewFile {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.send('all-languages');
        ipcRenderer.on('languages-list', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.languagesList(arg);
        });
        (document.getElementById('createFile') as HTMLButtonElement).addEventListener('click', () => {
            this.createFile();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.createFile();
            }
            if (event.code === 'Escape') {
                ipcRenderer.send('close-newFile');
            }
        });
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'newFile', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    languagesList(langs: Language[]): void {
        let srcLanguage: HTMLSelectElement = document.getElementById('srcLanguage') as HTMLSelectElement;
        let tgtLanguage: HTMLSelectElement = document.getElementById('tgtLanguage') as HTMLSelectElement;
        let options: string = '';
        for (let lang of langs) {
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        srcLanguage.innerHTML = options;
        tgtLanguage.innerHTML = options;
    }

    createFile(): void {
        let srcLanguage: HTMLSelectElement = document.getElementById('srcLanguage') as HTMLSelectElement;
        let tgtLanguage: HTMLSelectElement = document.getElementById('tgtLanguage') as HTMLSelectElement;
        if (srcLanguage.value === 'none') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'newFile', key: 'selectSrcLanguageWarning', parent: 'newFile' });
            return;
        }
        if (tgtLanguage.value === 'none') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'newFile', key: 'selectTgtLanguageWarning', parent: 'newFile' });
            return;
        }
        if (srcLanguage.value === tgtLanguage.value) {
            ipcRenderer.send('show-message', { type: 'warning', group: 'newFile', key: 'selectDifferentLanguages', parent: 'newFile' });
            return;
        }
        ipcRenderer.send('create-file', { srcLang: srcLanguage.value, tgtLang: tgtLanguage.value });
    }
}
