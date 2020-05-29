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

class SortUnits {

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
        this.electron.ipcRenderer.on('sort-options', (event: Electron.IpcRendererEvent, arg: any) => {
            this.sortOptions(arg);
        });
        document.getElementById('sort').addEventListener('click', () => {
            this.sort();
        });
        document.getElementById('clearSort').addEventListener('click', () => {
            this.clearSort();
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                window.close();
            }
            if (event.key === 'Enter') {
                this.sort();
            }
        });
    }

    filterLanguages(arg: any): void {
        var sortLanguage: HTMLSelectElement = document.getElementById('sortLanguage') as HTMLSelectElement;
        var options: string = '';
        for (let i: number = 0; i < arg.length; i++) {
            let lang: any = arg[i];
            options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        sortLanguage.innerHTML = options;
        this.electron.ipcRenderer.send('get-sort');
    }

    sortOptions(arg: any): void {
        if (arg.sortLanguage != undefined) {
            (document.getElementById('sortLanguage') as HTMLSelectElement).value = arg.sortLanguage;
        }
        if (arg.ascending != undefined) {
            (document.getElementById('descending') as HTMLInputElement).checked = !arg.ascending;
        }
    }

    sort(): void {
        var language: string = (document.getElementById('sortLanguage') as HTMLSelectElement).value;
        var desc: boolean = (document.getElementById('descending') as HTMLInputElement).checked;
        this.electron.ipcRenderer.send('set-sort', { sortLanguage: language, ascending: !desc });
    }

    clearSort(): void {
        this.electron.ipcRenderer.send('clear-sort');
    }
}

new SortUnits();