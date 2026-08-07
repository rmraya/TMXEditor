/*******************************************************************************
 * Copyright (c) 2018-2026 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { ipcRenderer } from "electron";

export class ConvertCSV {

    langs: string[] = [];
    columns: number = 0;

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.on('set-csvfile', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setCsvFile(arg);
        });
        ipcRenderer.on('converted-tmx-file', (event: Electron.IpcRendererEvent, arg: string) => {
            (document.getElementById('tmxFile') as HTMLInputElement).value = arg;
        });
        ipcRenderer.on('set-preview', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setPreview(arg);
        });
        ipcRenderer.on('csv-languages', (event: Electron.IpcRendererEvent, arg: any) => {
            this.csvLanguages(arg);
        });
        (document.getElementById('browseCsvFiles') as HTMLButtonElement).addEventListener('click', () => {
            this.browseCsvFiles();
        });
        (document.getElementById('browseTmxFiles') as HTMLButtonElement).addEventListener('click', () => {
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
        (document.getElementById('refreshPreview') as HTMLButtonElement).addEventListener('click', () => {
            this.refreshPreview();
        });
        (document.getElementById('setLanguages') as HTMLButtonElement).addEventListener('click', () => {
            this.setLanguages();
        });
        (document.getElementById('convert') as HTMLButtonElement).addEventListener('click', () => {
            this.convertFile();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                ipcRenderer.send('close-convertCsv');
            }
        });
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'convertCsv', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    setCharsets(charsets: string[]): void {
        let options: string = '';
        for (let charset of charsets) {
            options = options + '<option value="' + charset + '">' + charset + '</option>';
        }
        let charSets: HTMLSelectElement = (document.getElementById('charSets') as HTMLSelectElement);
        charSets.innerHTML = options;
        charSets.value = 'utf16le';
        let colSeps: HTMLSelectElement = (document.getElementById('colSeps') as HTMLSelectElement);
        colSeps.value = 'TAB';
    }

    browseCsvFiles(): void {
        ipcRenderer.send('get-csvfile');
    }

    setCsvFile(file: string): void {
        let csvFile: HTMLInputElement = (document.getElementById('csvFile') as HTMLInputElement);
        csvFile.value = file;

        let tmxFile: HTMLInputElement = (document.getElementById('tmxFile') as HTMLInputElement);
        if (tmxFile.value === '') {
            let index: number = file.lastIndexOf('.');
            if (index !== -1) {
                tmxFile.value = file.substring(0, index) + '.tmx';
            } else {
                tmxFile.value = file + '.tmx';
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
        ipcRenderer.send('get-converted-tmx', { default: value });
    }

    private columnSeparator(): string {
        let customSep: string = (document.getElementById('customSep') as HTMLInputElement).value;
        if (customSep !== '') {
            return customSep;
        }
        let columnsSeparator: string = (document.getElementById('colSeps') as HTMLSelectElement).value;
        if (columnsSeparator === 'TAB') {
            return '\t';
        }
        return columnsSeparator;
    }

    private textDelimiter(): string {
        let customDel: string = (document.getElementById('customDel') as HTMLInputElement).value;
        if (customDel !== '') {
            return customDel;
        }
        return (document.getElementById('textDelim') as HTMLSelectElement).value;
    }

    refreshPreview(): void {
        let csvFile: HTMLInputElement = (document.getElementById('csvFile') as HTMLInputElement);
        if (csvFile.value === '') {
            return;
        }
        let arg = {
            csvFile: csvFile.value,
            charSet: (document.getElementById('charSets') as HTMLSelectElement).value,
            columnsSeparator: this.columnSeparator(),
            textDelimiter: this.textDelimiter()
        }
        ipcRenderer.send('get-csv-preview', arg);
    }

    setPreview(arg: { columns: number, rows: number, data: string[][], langs?: string[] }): void {
        this.columns = arg.columns;
        if (arg.langs && arg.langs.length > 0) {
            this.langs = arg.langs;
        } else {
            this.langs = [];
        }
        let preview: HTMLDivElement = document.getElementById('preview') as HTMLDivElement;
        if (arg.data.length === 0) {
            preview.innerHTML = '<pre id="preview" style="width: 100%;">Preview not available</pre>';
            (document.getElementById('columns') as HTMLSpanElement).innerHTML = '0';
            return;
        }
        let table: HTMLTableElement = document.createElement('table');
        table.classList.add('stripes');
        if (this.langs.length > 0) {
            let thead: HTMLTableSectionElement = document.createElement('thead');
            let headRow: HTMLTableRowElement = document.createElement('tr');
            for (let i = 0; i < this.columns; i++) {
                let th: HTMLTableCellElement = document.createElement('th');
                th.id = 'col_' + i;
                th.innerText = this.langs[i];
                headRow.appendChild(th);
            }
            thead.appendChild(headRow);
            table.appendChild(thead);
        }
        let tbody: HTMLTableSectionElement = document.createElement('tbody');
        for (let row of arg.data) {
            let tr: HTMLTableRowElement = document.createElement('tr');
            for (let cell of row) {
                let td: HTMLTableCellElement = document.createElement('td');
                td.innerText = cell;
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        preview.innerHTML = '';
        preview.appendChild(table);
        (document.getElementById('columns') as HTMLSpanElement).innerHTML = '' + this.columns;
    }

    setLanguages(): void {
        let csvFile = (document.getElementById('csvFile') as HTMLInputElement);
        if (csvFile.value === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertCSV', key: 'selectCsv', parent: 'convertCSV' });
            return;
        }
        if (this.columns === 0) {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertCSV', key: 'columnsNotDetected', parent: 'convertCSV' });
            return;
        }
        ipcRenderer.send('get-csv-languages', { columns: this.columns, languages: this.langs });
    }

    csvLanguages(arg: string[]): void {
        this.langs = arg;
        for (let i = 0; i < this.langs.length; i++) {
            let th: HTMLTableCellElement | null = document.getElementById('col_' + i) as HTMLTableCellElement | null;
            if (th) {
                th.innerText = this.langs[i];
            }
        }
        (document.getElementById('convert') as HTMLButtonElement).focus();
    }

    convertFile(): void {
        let csvFile = (document.getElementById('csvFile') as HTMLInputElement);
        if (csvFile.value === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertCSV', key: 'selectCsv', parent: 'convertCSV' });
            return;
        }
        let tmxFile = (document.getElementById('tmxFile') as HTMLInputElement);
        if (tmxFile.value === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertCSV', key: 'selectTmx', parent: 'convertCSV' });
            return;
        }
        if (this.langs.length < 2) {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertCSV', key: 'setLanguages', parent: 'convertCSV' });
            return;
        }
        if (this.langs.length != this.columns) {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertCSV', key: 'setAllLanguages', parent: 'convertCSV' });
            return;
        }
        let arg = {
            csvFile: csvFile.value,
            tmxFile: tmxFile.value,
            langs: this.langs,
            charSet: (document.getElementById('charSets') as HTMLSelectElement).value,
            columnsSeparator: this.columnSeparator(),
            textDelimiter: this.textDelimiter(),
            openTMX: (document.getElementById('openTMX') as HTMLInputElement).checked
        }
        ipcRenderer.send('convert-csv-tmx', arg);
    }
}
