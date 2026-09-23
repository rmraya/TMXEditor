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

export class RemoveUntranslated {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.send('get-file-languages');
        ipcRenderer.on('file-languages', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.filterLanguages(arg);
        });
        ipcRenderer.on('set-source-language', (event: Electron.IpcRendererEvent, srcLang: string) => {
            if (srcLang !== '*all*') {
                (document.getElementById('sourceLanguage') as HTMLSelectElement).value = srcLang;
            }
        });
        (document.getElementById('removeUntranslated') as HTMLButtonElement).addEventListener('click', () => {
            this.removeUntranslated();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.removeUntranslated();
            }
            if (event.code === 'Escape') {
                ipcRenderer.send('close-removeUntranslated');
            }
        });
        (document.getElementById('sourceLanguage') as HTMLSelectElement).focus();
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'removeUntranslated', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    filterLanguages(langs: Language[]): void {
        let sourceLanguage: HTMLSelectElement = document.getElementById('sourceLanguage') as HTMLSelectElement;
        let options: string = '';
        for (let lang of langs) {
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        sourceLanguage.innerHTML = options;
        ipcRenderer.send('get-source-language');
    }

    removeUntranslated(): void {
        let srcLang: string = (document.getElementById('sourceLanguage') as HTMLSelectElement).value;
        ipcRenderer.send('remove-untranslated', srcLang);
    }
}
