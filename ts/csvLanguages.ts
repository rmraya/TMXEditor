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

class CsvLanguages {

    electron = require('electron');

    columns: number;
    options: string = '<option value="none">Select Language</option>';

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.send('all-languages');
        this.electron.ipcRenderer.on('languages-list', (event: Electron.IpcRendererEvent, arg: any) => {
            this.languagesList(arg);
        });

        this.electron.ipcRenderer.on('set-csv-lang-args', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setCsvLangArgs(arg);
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                window.close();
            }
            if (event.key === 'Enter') {
                this.setCsvLanguages();
            }
        });
        document.getElementById('setCsvLanguages').addEventListener('click', () => {
            this.setCsvLanguages();
        })
    }

    setCsvLanguages(): void {
        var langs: string[] = [];
        for (let i = 0; i < this.columns; i++) {
            var lang: string = (document.getElementById('lang_' + i) as HTMLSelectElement).value;
            if (lang !== 'none') {
                langs.push(lang);
            } else {
                this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select all languages' });
                return;
            }
        }
        this.electron.ipcRenderer.send('set-csv-languages', langs);
    }

    languagesList(arg: any): void {
        for (let i: number = 0; i < arg.length; i++) {
            let lang: any = arg[i];
            this.options = this.options + '<option value="' + lang.code + '">' + lang.name + '</option>'
        }
        this.electron.ipcRenderer.send('get-csv-lang-args');
    }

    setCsvLangArgs(arg: any): void {
        this.columns = arg.columns;
        var rows: string = '';
        for (let i = 0; i < this.columns; i++) {
            rows = rows + '<tr><td class="noWrap">Column ' + i + '</td><td><select id="lang_' + i + '">' + this.options + '</select></td></tr>'
        }
        document.getElementById('langsTable').innerHTML = rows;
        var langs: string[] = arg.languages;
        for (let i = 0; i < langs.length; i++) {
            (document.getElementById('lang_' + i) as HTMLSelectElement).value = langs[i];
        }
    }
}

new CsvLanguages();