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

export class ConvertExcel {

    previewTables: HTMLTableElement[] = [];
    columns: any[] = [];
    langs: string[] = [];

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        (document.getElementById('browseExcelFiles') as HTMLButtonElement).addEventListener('click', () => {
            ipcRenderer.send('get-excelfile');
        });
        ipcRenderer.on('set-excelfile', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setExcelFile(arg);
        });
        (document.getElementById('browseTmxFiles') as HTMLButtonElement).addEventListener('click', () => {
            this.browseTmxFiles();
        });
        ipcRenderer.on('converted-tmx-file', (event: Electron.IpcRendererEvent, arg: string) => {
            (document.getElementById('tmxFile') as HTMLInputElement).value = arg;
        });
        (document.getElementById('refreshPreview') as HTMLButtonElement).addEventListener('click', () => {
            this.refreshPreview();
        });
        (document.getElementById('sheetSelect') as HTMLSelectElement).addEventListener('change', () => {
            this.sheetChanged();
        });
        ipcRenderer.on('set-preview', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setPreview(arg);
        });
        ipcRenderer.on('excel-languages', (event: Electron.IpcRendererEvent, arg: any) => {
            this.excelLanguages(arg);
        });
        (document.getElementById('convert') as HTMLButtonElement).addEventListener('click', () => {
            this.convertExcel();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                ipcRenderer.send('close-convertExcel');
            }
        });
        (document.getElementById('setLanguages') as HTMLButtonElement).addEventListener('click', () => {
            this.getLanguages();
        });
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'convertExcel', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    setExcelFile(file: string): void {
        let excelFile: HTMLInputElement = (document.getElementById('excelFile') as HTMLInputElement);
        excelFile.value = file;

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
        let value: string = (document.getElementById('excelFile') as HTMLInputElement).value;
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

    refreshPreview(): void {
        let excelFile: HTMLInputElement = document.getElementById('excelFile') as HTMLInputElement;
        if (excelFile.value === '') {
            return;
        }
        ipcRenderer.send('get-excel-preview', excelFile.value);
    }

    setPreview(data: any[]): void {
        this.previewTables = [];
        this.columns = [];
        this.langs = [];
        let preview: HTMLDivElement = document.getElementById('preview') as HTMLDivElement;
        let sheetSelect: HTMLSelectElement = document.getElementById('sheetSelect') as HTMLSelectElement;
        if (data.length == 0) {
            preview.innerHTML = '<pre id="preview" style="width: 100%;">Preview not available</pre>';
            sheetSelect.innerHTML = '';
            return;
        }
        let options: string = '';
        for (let i: number = 0; i < data.length; i++) {
            options = options + '<option value="' + i + '">' + data[i].name + '</option>';
        }
        sheetSelect.innerHTML = options;
        for (let i: number = 0; i < data.length; i++) {
            let sheet: any = data[i];
            let sheetData: any = sheet.data;
            let previewTable: HTMLTableElement = document.createElement('table');
            previewTable.classList.add('stripes');
            let thead: HTMLTableSectionElement = document.createElement('thead');
            let headRow: HTMLTableRowElement = document.createElement('tr');
            thead.appendChild(headRow);
            previewTable.appendChild(thead);
            for (let h: number = 0; h < sheet.columns; h++) {
                let th: HTMLTableCellElement = document.createElement('th');
                th.id = sheetData[0][h];
                th.innerText = sheetData[0][h];
                headRow.appendChild(th);
            }
            for (let h: number = 1; h < sheetData.length; h++) {
                let tr: HTMLTableRowElement = document.createElement('tr');
                previewTable.appendChild(tr);
                for (let j: number = 0; j < sheet.columns; j++) {
                    let td: HTMLTableCellElement = document.createElement('td');
                    td.innerText = sheetData[h][j];
                    tr.appendChild(td);
                }
            }
            if (i === 0) {
                preview.innerHTML = '';
                preview.appendChild(previewTable);
            }
            this.previewTables.push(previewTable);
            this.columns.push(sheetData[0]);
        }
        if (data.length === 1 && data[0].langs) {
            this.excelLanguages(data[0].langs);
        }
    }

    sheetChanged(): void {
        let sheetSelect: HTMLSelectElement = document.getElementById('sheetSelect') as HTMLSelectElement;
        let selected: number = sheetSelect.selectedIndex;
        let preview: HTMLDivElement = document.getElementById('preview') as HTMLDivElement;
        preview.innerHTML = '';
        preview.appendChild(this.previewTables[selected]);
        for (let column of this.columns[selected]) {
            let th: HTMLTableCellElement = document.getElementById(column) as HTMLTableCellElement;
            th.innerText = column;
        }
        this.langs = [];
    }

    getLanguages(): void {
        let excelFile: HTMLInputElement = document.getElementById('excelFile') as HTMLInputElement;
        if (excelFile.value === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertExcel', key: 'selectExcel', parent: 'convertExcel' });
            return;
        }
        let sheetSelect: HTMLSelectElement = document.getElementById('sheetSelect') as HTMLSelectElement;
        let selected: number = sheetSelect.selectedIndex;
        ipcRenderer.send('get-excel-languages', { columns: this.columns[selected], languages: this.langs });
    }

    excelLanguages(arg: string[]): void {
        this.langs = arg;
        let sheetSelect: HTMLSelectElement = document.getElementById('sheetSelect') as HTMLSelectElement;
        let selected: number = sheetSelect.selectedIndex;
        for (let i = 0; i < this.columns[selected].length; i++) {
            let th: HTMLTableCellElement = document.getElementById(this.columns[selected][i]) as HTMLTableCellElement;
            th.innerText = this.columns[selected][i] + ' (' + this.langs[i] + ')';
        }
        (document.getElementById('convert') as HTMLButtonElement).focus();
    }

    convertExcel(): void {
        let excelFile: HTMLInputElement = document.getElementById('excelFile') as HTMLInputElement;
        if (excelFile.value === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertExcel', key: 'selectExcel', parent: 'convertExcel' });
            return;
        }
        let tmxFile: HTMLInputElement = document.getElementById('tmxFile') as HTMLInputElement;
        if (tmxFile.value === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertExcel', key: 'selectTmx', parent: 'convertExcel' });
            return;
        }
        if (this.langs.length === 0) {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertExcel', key: 'setLanguages', parent: 'convertExcel' });
            return;
        }
        let sheetSelect: HTMLSelectElement = document.getElementById('sheetSelect') as HTMLSelectElement;
        let selected: string = sheetSelect.selectedOptions[0].text;
        let arg: any = {
            excelFile: excelFile.value,
            tmxFile: tmxFile.value,
            sheet: selected,
            langs: this.langs,
            openTMX: (document.getElementById('openTMX') as HTMLInputElement).checked
        }
        ipcRenderer.send('convert-excel-tmx', arg);
    }
}
