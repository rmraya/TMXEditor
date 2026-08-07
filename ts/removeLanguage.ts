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

export class RemoveLanguage {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.send('get-file-languages');
        ipcRenderer.on('file-languages', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.filterLanguages(arg);
        });
        (document.getElementById('removeLanguage') as HTMLButtonElement).addEventListener('click', () => {
            this.removeLanguage();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.removeLanguage();
            }
            if (event.code === 'Escape') {
                ipcRenderer.send('close-removeLanguage');
            }
        });
        (document.getElementById('language') as HTMLSelectElement).focus();
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'removeLanguage', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    filterLanguages(langs: Language[]): void {
        let language: HTMLSelectElement = document.getElementById('language') as HTMLSelectElement;
        let options: string = '';
        for (let lang of langs) {
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        language.innerHTML = options;
    }

    removeLanguage(): void {
        let language: HTMLSelectElement = document.getElementById('language') as HTMLSelectElement;
        ipcRenderer.send('remove-language', language.value);
    }
}
