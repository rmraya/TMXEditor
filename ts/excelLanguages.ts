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

class ExcelLanguages {

    electron = require('electron');

    options: string = '<option value="none">Select Language</option>';
    columns: string[];

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.send('all-languages');
        this.electron.ipcRenderer.on('languages-list', (event: Electron.IpcRendererEvent, arg: any) => {
            this.languagesList(arg);
        });

        this.electron.ipcRenderer.on('set-excel-lang-args', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setExcelLangArgs(arg);
        });
        document.getElementById('setExcelLanguages').addEventListener('click', () => {
            this.setExcelLanguages();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.setExcelLanguages();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-excelLanguages');
            }
        });
        let body: HTMLBodyElement = document.getElementById('body') as HTMLBodyElement;
        this.electron.ipcRenderer.send('excelLanguages-height', { width: body.clientWidth, height: body.clientHeight });
    }

    languagesList(arg: any): void {
        for (let i: number = 0; i < arg.length; i++) {
            let lang: any = arg[i];
            this.options = this.options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        this.electron.ipcRenderer.send('get-excel-lang-args');
    }

    setExcelLangArgs(arg: any): void {
        this.columns = arg.columns;
        var rows: string = '';
        for (let i = 0; i < this.columns.length; i++) {
            rows = rows + '<tr><td class="noWrap middle">Column ' + this.columns[i] + '</td><td class="middle"><select id="lang_' + i + '" class="table_select">' + this.options + '</select></td></tr>'
        }
        document.getElementById('langsTable').innerHTML = rows;
        var langs: string[] = arg.languages;
        for (let i = 0; i < langs.length; i++) {
            (document.getElementById('lang_' + i) as HTMLSelectElement).value = langs[i];
        }
    }

    setExcelLanguages(): void {
        var langs: string[] = [];
        for (let i = 0; i < this.columns.length; i++) {
            var lang: string = (document.getElementById('lang_' + i) as HTMLSelectElement).value;
            if (lang !== 'none') {
                langs.push(lang);
            } else {
                this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select all languages', parent: 'excelLanguages' });
                return;
            }
        }
        this.electron.ipcRenderer.send('set-excel-languages', langs);
    }

}

new ExcelLanguages();