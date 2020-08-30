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

class NewFile {

    electron = require('electron');

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.send('all-languages');
        this.electron.ipcRenderer.on('languages-list', (event: Electron.IpcRendererEvent, arg: any) => {
            this.languagesList(arg);
        });
        document.getElementById('createFile').addEventListener('click', () => {
            this.createFile();
        });
        this.electron.ipcRenderer.on('get-height', () => {
            let body: HTMLBodyElement = document.getElementById('body') as HTMLBodyElement;
            this.electron.ipcRenderer.send('newFile-height', { width: body.clientWidth, height: body.clientHeight });
        });
    }

    languagesList(arg: any): void {
        var srcLanguage: HTMLSelectElement = document.getElementById('srcLanguage') as HTMLSelectElement;
        var tgtLanguage: HTMLSelectElement = document.getElementById('tgtLanguage') as HTMLSelectElement;
        var options: string = '';
        for (let i: number = 0; i < arg.length; i++) {
            let lang: any = arg[i];
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        srcLanguage.innerHTML = options;
        tgtLanguage.innerHTML = options;
    }

    createFile(): void {
        var srcLanguage: HTMLSelectElement = document.getElementById('srcLanguage') as HTMLSelectElement;
        var tgtLanguage: HTMLSelectElement = document.getElementById('tgtLanguage') as HTMLSelectElement;
        if (srcLanguage.value === tgtLanguage.value) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select different languages' });
            return;
        }
        this.electron.ipcRenderer.send('create-file', { srcLang: srcLanguage.value, tgtLang: tgtLanguage.value });
    }
}

new NewFile();