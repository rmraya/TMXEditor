/*******************************************************************************
 * Copyright (c) 2018-2025 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

class Maintenance {

    electron = require('electron');

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        this.electron.ipcRenderer.send('get-file-languages');
        this.electron.ipcRenderer.on('file-languages', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.filterLanguages(arg);
        });
        this.electron.ipcRenderer.on('set-source-language', (event: Electron.IpcRendererEvent, arg: any) => {
            if (arg.srcLang !== '*all*') {
                (document.getElementById('sourceLanguage') as HTMLSelectElement).value = arg.srcLang;
            }
        });
        document.getElementById('untranslated').addEventListener('click', () => {
            this.sourceLanguageEnabled();
        });
        document.getElementById('consolidate').addEventListener('click', () => {
            this.sourceLanguageEnabled();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.execute();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-maintenance');
            }
        });
        document.getElementById('execute').addEventListener('click', () => {
            this.execute();
        });
        this.electron.ipcRenderer.send('maintenance-height', { width: document.body.clientWidth, height: document.body.clientHeight });
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
        this.electron.ipcRenderer.send('get-source-language');
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
        this.electron.ipcRenderer.send('maintanance-tasks', params);
    }
}
