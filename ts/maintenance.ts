/*****************************************************************************
Copyright (c) 2018-2021 - Maxprograms,  http://www.maxprograms.com/

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to compile,
modify and use the Software in its executable form without restrictions.

Redistribution of this Software or parts of it in any form (source code or
executable binaries) requires prior written permission from Maxprograms.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*****************************************************************************/

class Maintenance {

    electron = require('electron');

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
        let body: HTMLBodyElement = document.getElementById('body') as HTMLBodyElement;
        this.electron.ipcRenderer.send('maintenance-height', { width: body.clientWidth, height: body.clientHeight });
    }

    sourceLanguageEnabled(): void {
        let untranslated: HTMLInputElement = document.getElementById('untranslated') as HTMLInputElement;
        let consolidate: HTMLInputElement = document.getElementById('consolidate') as HTMLInputElement;
        let sourceLanguage: HTMLSelectElement = document.getElementById('sourceLanguage') as HTMLSelectElement;
        sourceLanguage.disabled = !(untranslated.checked || consolidate.checked);
    }

    filterLanguages(arg: any[]): void {
        let sourceLanguage: HTMLSelectElement = document.getElementById('sourceLanguage') as HTMLSelectElement;
        let options: string = '';
        for (let i: number = 0; i < arg.length; i++) {
            let lang: any = arg[i];
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        sourceLanguage.innerHTML = options;
        if (arg.length < 3) {
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

new Maintenance();