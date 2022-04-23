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
        document.addEventListener('keydown', (event: KeyboardEvent) => { KeyboardHandler.keyListener(event); });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-convertCsv');
            }
        });
        let body: HTMLBodyElement = document.getElementById('body') as HTMLBodyElement;
        this.electron.ipcRenderer.send('convertCsv-height', { width: body.clientWidth, height: body.clientHeight + 10 });
    }

    setCharsets(arg: string[]): void {
        let options: string = '';
        for (let i = 0; i < arg.length; i++) {
            options = options + '<option value="' + arg[i] + '">' + arg[i] + '</option>';
        }
        let charSets = (document.getElementById('charSets') as HTMLSelectElement);
        charSets.innerHTML = options;
        charSets.value = 'UTF-16LE';
        let colSeps = (document.getElementById('colSeps') as HTMLSelectElement);
        colSeps.value = 'TAB';
    }

    browseCsvFiles(): void {
        this.electron.ipcRenderer.send('get-csvfile');
    }

    setCsvFile(arg: string): void {
        let csvFile = (document.getElementById('csvFile') as HTMLInputElement);
        csvFile.value = arg;

        let tmxFile = (document.getElementById('tmxFile') as HTMLInputElement);
        if (tmxFile.value === '') {
            let index: number = arg.lastIndexOf('.');
            if (index !== -1) {
                tmxFile.value = arg.substring(0, index) + '.tmx';
            } else {
                tmxFile.value = arg + '.tmx';
            }
        }
        this.refreshPreview();
    }

    browseTmxFiles(): void {
        let value: string = (document.getElementById('csvFile') as HTMLInputElement).value;
        if (value !== '') {
            let index: number = value.lastIndexOf('.');
            if (index !== -1) {
                value = value.substring(0, index) + '.tmx';
            } else {
                value = value + '.tmx';
            }
        }
        this.electron.ipcRenderer.send('get-converted-tmx', { default: value });
    }

    refreshPreview(): void {
        let csvFile = (document.getElementById('csvFile') as HTMLInputElement);
        if (csvFile.value === '') {
            return;
        }

        let columnsSeparator: string = '';
        let customSep: string = (document.getElementById('customSep') as HTMLInputElement).value;
        if (customSep !== '') {
            columnsSeparator = customSep;
        } else {
            columnsSeparator = (document.getElementById('colSeps') as HTMLSelectElement).value;
            if (columnsSeparator === 'TAB') {
                columnsSeparator = '\t';
            }
        }

        let textDelimiter: string = '';
        let customDel: string = (document.getElementById('customDel') as HTMLInputElement).value;
        if (customDel !== '') {
            textDelimiter = customDel;
        } else {
            textDelimiter = (document.getElementById('textDelim') as HTMLSelectElement).value;
        }
        let arg = {
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
        let csvFile = (document.getElementById('csvFile') as HTMLInputElement);
        if (csvFile.value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select CSV/Text file', parent: 'convertCSV' });
            return;
        }
        if (this.columns === 0) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Columns not detected', parent: 'convertCSV' });
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
        let csvFile = (document.getElementById('csvFile') as HTMLInputElement);
        if (csvFile.value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select CSV/Text file', parent: 'convertCSV' });
            return;
        }
        let tmxFile = (document.getElementById('tmxFile') as HTMLInputElement);
        if (tmxFile.value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select TMX file', parent: 'convertCSV' });
            return;
        }
        if (this.langs.length < 2) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Set languages', parent: 'convertCSV' });
            return;
        }
        if (this.langs.length != this.columns) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Set languages for all columns', parent: 'convertCSV' });
            return;
        }

        let columnsSeparator: string = '';
        let customSep: string = (document.getElementById('customSep') as HTMLInputElement).value;
        if (customSep !== '') {
            columnsSeparator = customSep;
        } else {
            columnsSeparator = (document.getElementById('colSeps') as HTMLSelectElement).value;
            if (columnsSeparator === 'TAB') {
                columnsSeparator = '\t';
            }
        }

        let textDelimiter: string = '';
        let customDel: string = (document.getElementById('customDel') as HTMLInputElement).value;
        if (customDel !== '') {
            textDelimiter = customDel;
        } else {
            textDelimiter = (document.getElementById('textDelim') as HTMLSelectElement).value;
        }
        let arg = {
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