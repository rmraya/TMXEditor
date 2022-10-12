/*******************************************************************************
 * Copyright (c) 2018-2022 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

class removeSameAsSource {

    electron = require("electron");

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.send('get-filter-languages');
        this.electron.ipcRenderer.on('filter-languages', (event: Electron.IpcRendererEvent, arg: any) => {
            this.filterLanguages(arg);
        });
        this.electron.ipcRenderer.on('set-source-language', (event: Electron.IpcRendererEvent, arg: any) => {
            if (arg.srcLang !== '*all*') {
                (document.getElementById('sourceLanguage') as HTMLSelectElement).value = arg.srcLang;
            }
        });
        document.getElementById('removeSameAsSource').addEventListener('click', () => {
            this.removeSameAsSource();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.removeSameAsSource();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-removeSameAsSource');
            }
        });
        document.getElementById('sourceLanguage').focus();
        let body: HTMLBodyElement = document.getElementById('body') as HTMLBodyElement;
        this.electron.ipcRenderer.send('removeSameAsSource-height', { width: body.clientWidth, height: body.clientHeight });
    }

    filterLanguages(arg: any): void {
        var sourceLanguage: HTMLSelectElement = document.getElementById('sourceLanguage') as HTMLSelectElement;
        var options: string = '';
        for (let i: number = 0; i < arg.length; i++) {
            let lang: any = arg[i];
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        sourceLanguage.innerHTML = options;
        this.electron.ipcRenderer.send('get-source-language');
    }

    removeSameAsSource(): void {
        var srcLang: string = (document.getElementById('sourceLanguage') as HTMLSelectElement).value;
        this.electron.ipcRenderer.send('remove-sameAsSource', { srcLang: srcLang });
    }
}
