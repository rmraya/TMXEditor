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

export class Maintenance {

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
        (document.getElementById('untranslated') as HTMLInputElement).addEventListener('click', () => {
            this.sourceLanguageEnabled();
        });
        (document.getElementById('consolidate') as HTMLInputElement).addEventListener('click', () => {
            this.sourceLanguageEnabled();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.execute();
            }
            if (event.code === 'Escape') {
                ipcRenderer.send('close-maintenance');
            }
        });
        (document.getElementById('execute') as HTMLButtonElement).addEventListener('click', () => {
            this.execute();
        });
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'maintenance', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    sourceLanguageEnabled(): void {
        let untranslated: HTMLInputElement = document.getElementById('untranslated') as HTMLInputElement;
        let consolidate: HTMLInputElement = document.getElementById('consolidate') as HTMLInputElement;
        let sourceLanguage: HTMLSelectElement = document.getElementById('sourceLanguage') as HTMLSelectElement;
        sourceLanguage.disabled = !(untranslated.checked || consolidate.checked);
    }

    filterLanguages(langs: Language[]): void {
        let sourceLanguage: HTMLSelectElement = document.getElementById('sourceLanguage') as HTMLSelectElement;
        let options: string = '';
        for (let lang of langs) {
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        sourceLanguage.innerHTML = options;
        if (langs.length < 3) {
            let consolidate: HTMLInputElement = document.getElementById('consolidate') as HTMLInputElement;
            consolidate.checked = false;
            consolidate.disabled = true;
        }
        ipcRenderer.send('get-source-language');
    }

    execute(): void {
        let params: any = {
            tags: (document.getElementById('tags') as HTMLInputElement).checked,
            untranslated: (document.getElementById('untranslated') as HTMLInputElement).checked,
            duplicates: (document.getElementById('duplicates') as HTMLInputElement).checked,
            spaces: (document.getElementById('spaces') as HTMLInputElement).checked,
            consolidate: (document.getElementById('consolidate') as HTMLInputElement).checked,
            sourceLanguage: (document.getElementById('sourceLanguage') as HTMLSelectElement).value
        }
        ipcRenderer.send('maintanance-tasks', params);
    }
}
