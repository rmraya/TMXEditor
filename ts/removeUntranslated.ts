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

class RemoveUntranslated {

    electron = require("electron");

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
        document.getElementById('removeUntranslated').addEventListener('click', () => {
            this.removeUntranslated();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.removeUntranslated();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-removeUntranslated');
            }
        });
        document.getElementById('sourceLanguage').focus();
        this.electron.ipcRenderer.send('removeUntranslated-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    filterLanguages(langs: Language[]): void {
        let sourceLanguage: HTMLSelectElement = document.getElementById('sourceLanguage') as HTMLSelectElement;
        let options: string = '';
        for (let lang of langs) {
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        sourceLanguage.innerHTML = options;
        this.electron.ipcRenderer.send('get-source-language');
    }

    removeUntranslated(): void {
        let srcLang: string = (document.getElementById('sourceLanguage') as HTMLSelectElement).value;
        this.electron.ipcRenderer.send('remove-untranslated', { srcLang: srcLang });
    }
}
