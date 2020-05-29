/*****************************************************************************
Copyright (c) 2018-2020 - Maxprograms,  http://www.maxprograms.com/

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

class ChangeLanguages {

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
        this.electron.ipcRenderer.on('languages-list', (event: Electron.IpcRendererEvent, arg: any) => {
            this.languageList(arg)
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                window.close();
            }
            if (event.key === 'Enter') {
                this.changeLanguage();
            }
        });
        document.getElementById('changeLanguage').addEventListener('click', () => {
            this.changeLanguage();
        })
    }

    languageList(arg: any): void {
        var newLanguage: HTMLSelectElement = document.getElementById('newLanguage') as HTMLSelectElement;
        var options: string = '';
        for (let i: number = 0; i < arg.length; i++) {
            let lang: any = arg[i];
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        newLanguage.innerHTML = options;
    }

    filterLanguages(arg: any): void {
        var currentLanguage: HTMLSelectElement = document.getElementById('currentLanguage') as HTMLSelectElement;
        var options: string = '';
        for (let i: number = 0; i < arg.length; i++) {
            let lang: any = arg[i];
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        currentLanguage.innerHTML = options;
        this.electron.ipcRenderer.send('all-languages');
    }

    changeLanguage(): void {
        var currentLanguage: HTMLSelectElement = document.getElementById('currentLanguage') as HTMLSelectElement;
        var newLanguage: HTMLSelectElement = document.getElementById('newLanguage') as HTMLSelectElement;
        this.electron.ipcRenderer.send('change-language', { oldLanguage: currentLanguage.value, newLanguage: newLanguage.value });
    }
}

new ChangeLanguages();