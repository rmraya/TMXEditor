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

class ConvertCSV {

    electron = require('electron');

    langs: string[] = [];
    columns: number = 0;

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.send('get-charsets');
        this.electron.ipcRenderer.on('set-charsets', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setCharsets(arg);
        });
        this.electron.ipcRenderer.on('set-csvfile', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setCsvFile(arg);
        });
        this.electron.ipcRenderer.on('converted-tmx-file', (event: Electron.IpcRendererEvent, arg: string) => {
            (document.getElementById('tmxFile') as HTMLInputElement).value = arg;
        });
        this.electron.ipcRenderer.on('set-preview', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setPreview(arg);
        });
        this.electron.ipcRenderer.on('csv-languages', (event: Electron.IpcRendererEvent, arg: any) => {
            this.csvLanguages(arg);
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                window.close();
            }
            if (event.key === 'Enter') {
                this.convertFile();
            }
        });
        document.getElementById('browseCsvFiles').addEventListener('click', () => {
            this.browseCsvFiles();
        });
        document.getElementById('browseTmxFiles').addEventListener('click', () => {
            this.browseTmxFiles();
        });
        (document.getElementById('charSets') as HTMLSelectElement).addEventListener('change', () => {
            this.refreshPreview();
        });
        (document.getElementById('colSeps') as HTMLSelectElement).addEventListener('change', () => {
            this.refreshPreview();
        });
        (document.getElementById('textDelim') as HTMLSelectElement).addEventListener('change', () => {
            this.refreshPreview();
        });
        (document.getElementById('fixQuotes') as HTMLInputElement).addEventListener('change', () => {
            this.refreshPreview();
        });
        (document.getElementById('optionalDelims') as HTMLInputElement).addEventListener('change', () => {
            this.refreshPreview();
        });
        document.getElementById('refreshPreview').addEventListener('click', () => {
            this.refreshPreview();
        });
        document.getElementById('setLanguages').addEventListener('click', () => {
            this.setLanguages();
        });
        document.getElementById('convert').addEventListener('click', () => {
            this.convertFile();
        });
    }

    setCharsets(arg: string[]): void {
        var options: string = '';
        for (let i = 0; i < arg.length; i++) {
            options = options + '<option value="' + arg[i] + '">' + arg[i] + '</option>';
        }
        var charSets = (document.getElementById('charSets') as HTMLSelectElement);
        charSets.innerHTML = options;
        charSets.value = 'UTF-16LE';
        var colSeps = (document.getElementById('colSeps') as HTMLSelectElement);
        colSeps.value = 'TAB';
    }

    browseCsvFiles(): void {
        this.electron.ipcRenderer.send('get-csvfile');
    }

    setCsvFile(arg: string): void {
        var csvFile = (document.getElementById('csvFile') as HTMLInputElement);
        csvFile.value = arg;

        var tmxFile = (document.getElementById('tmxFile') as HTMLInputElement);
        if (tmxFile.value === '') {
            var index: number = arg.lastIndexOf('.');
            if (index !== -1) {
                tmxFile.value = arg.substring(0, index) + '.tmx';
            } else {
                tmxFile.value = arg + '.tmx';
            }
        }
        this.refreshPreview();
    }

    browseTmxFiles(): void {
        var value: string = (document.getElementById('csvFile') as HTMLInputElement).value;
        if (value !== '') {
            var index: number = value.lastIndexOf('.');
            if (index !== -1) {
                value = value.substring(0, index) + '.tmx';
            } else {
                value = value + '.tmx';
            }
        }
        this.electron.ipcRenderer.send('get-converted-tmx', { default: value });
    }

    refreshPreview(): void {
        var csvFile = (document.getElementById('csvFile') as HTMLInputElement);
        if (csvFile.value === '') {
            return;
        }

        var columnsSeparator: string = '';
        var customSep: string = (document.getElementById('customSep') as HTMLInputElement).value;
        if (customSep !== '') {
            columnsSeparator = customSep;
        } else {
            columnsSeparator = (document.getElementById('colSeps') as HTMLSelectElement).value;
            if (columnsSeparator === 'TAB') {
                columnsSeparator = '\t';
            }
        }

        var textDelimiter: string = '';
        var customDel: string = (document.getElementById('customDel') as HTMLInputElement).value;
        if (customDel !== '') {
            textDelimiter = customDel;
        } else {
            textDelimiter = (document.getElementById('textDelim') as HTMLSelectElement).value;
        }
        var arg = {
            csvFile: csvFile.value,
            langs: this.langs,
            charSet: (document.getElementById('charSets') as HTMLSelectElement).value,
            columnsSeparator: columnsSeparator,
            textDelimiter: textDelimiter,
            fixQuotes: (document.getElementById('fixQuotes') as HTMLInputElement).checked,
            optionalDelims: (document.getElementById('optionalDelims') as HTMLInputElement).checked
        }
        this.electron.ipcRenderer.send('get-csv-preview', arg);
    }

    setPreview(arg: any): void {
        this.columns = arg.cols;
        document.getElementById('preview').innerHTML = arg.preview;
        document.getElementById('columns').innerHTML = '' + this.columns;
    }

    setLanguages(): void {
        var csvFile = (document.getElementById('csvFile') as HTMLInputElement);
        if (csvFile.value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select CSV/Text file' });
            return;
        }
        if (this.columns === 0) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Columns not detected' });
            return;
        }
        this.electron.ipcRenderer.send('get-csv-languages', { columns: this.columns, languages: this.langs });
    }

    csvLanguages(arg: string[]): void {
        this.langs = arg;
        this.refreshPreview();
        (document.getElementById('convert') as HTMLButtonElement).focus();
    }

    convertFile(): void {
        var csvFile = (document.getElementById('csvFile') as HTMLInputElement);
        if (csvFile.value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select CSV/Text file' });
            return;
        }
        var tmxFile = (document.getElementById('tmxFile') as HTMLInputElement);
        if (tmxFile.value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select TMX file' });
            return;
        }
        if (this.langs.length < 2) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Set languages' });
            return;
        }
        if (this.langs.length != this.columns) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Set languages for all columns' });
            return;
        }

        var columnsSeparator: string = '';
        var customSep: string = (document.getElementById('customSep') as HTMLInputElement).value;
        if (customSep !== '') {
            columnsSeparator = customSep;
        } else {
            columnsSeparator = (document.getElementById('colSeps') as HTMLSelectElement).value;
            if (columnsSeparator === 'TAB') {
                columnsSeparator = '\t';
            }
        }

        var textDelimiter: string = '';
        var customDel: string = (document.getElementById('customDel') as HTMLInputElement).value;
        if (customDel !== '') {
            textDelimiter = customDel;
        } else {
            textDelimiter = (document.getElementById('textDelim') as HTMLSelectElement).value;
        }
        var arg = {
            csvFile: csvFile.value,
            tmxFile: tmxFile.value,
            langs: this.langs,
            charSet: (document.getElementById('charSets') as HTMLSelectElement).value,
            columnsSeparator: columnsSeparator,
            textDelimiter: textDelimiter,
            fixQuotes: (document.getElementById('fixQuotes') as HTMLInputElement).checked,
            optionalDelims: (document.getElementById('optionalDelims') as HTMLInputElement).checked,
            openTMX: (document.getElementById('openTMX') as HTMLInputElement).checked
        }
        this.electron.ipcRenderer.send('convert-csv-tmx', arg);
    }
}

new ConvertCSV();