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

class ConvertExcel {

    electron = require('electron');

    previewTables: HTMLTableElement[] = [];
    columns: any[] = [];
    langs: string[];

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        document.getElementById('browseExcelFiles').addEventListener('click', () => {
            this.browseExcelFiles();
        });
        this.electron.ipcRenderer.on('set-excelfile', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setExcelFile(arg);
        });
        document.getElementById('browseTmxFiles').addEventListener('click', () => {
            this.browseTmxFiles();
        });
        this.electron.ipcRenderer.on('converted-tmx-file', (event: Electron.IpcRendererEvent, arg: string) => {
            (document.getElementById('tmxFile') as HTMLInputElement).value = arg;
        });
        document.getElementById('refreshPreview').addEventListener('click', () => {
            this.refreshPreview();
        });
        (document.getElementById('sheetSelect') as HTMLSelectElement).addEventListener('change', () => {
            this.sheetChanged();
        });
        this.electron.ipcRenderer.on('set-preview', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setPreview(arg);
        });
        this.electron.ipcRenderer.on('excel-languages', (event: Electron.IpcRendererEvent, arg: any) => {
            this.excelLanguages(arg);
        });
        document.getElementById('convert').addEventListener('click', () => {
            this.convertExcel();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => { KeyboardHandler.keyListener(event); });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-convertExcel');
            }
        });
        document.getElementById('setLanguages').addEventListener('click', () => {
            this.getLanguages();
        });
        let body: HTMLBodyElement = document.getElementById('body') as HTMLBodyElement;
        this.electron.ipcRenderer.send('convertExcel-height', { width: body.clientWidth, height: body.clientHeight });
    }

    browseExcelFiles(): void {
        this.electron.ipcRenderer.send('get-excelfile');
    }

    setExcelFile(arg: string): void {
        let excelFile = (document.getElementById('excelFile') as HTMLInputElement);
        excelFile.value = arg;

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
        let value: string = (document.getElementById('excelFile') as HTMLInputElement).value;
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
        let excelFile: HTMLInputElement = document.getElementById('excelFile') as HTMLInputElement;
        if (excelFile.value === '') {
            return;
        }
        let arg = {
            excelFile: excelFile.value,
        }
        this.electron.ipcRenderer.send('get-excel-preview', arg);
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
        for (let i = 0; i < data.length; i++) {
            options = options + '<option value="' + i + '">' + data[i].name + '</option>';
        }
        sheetSelect.innerHTML = options;
        for (let i = 0; i < data.length; i++) {
            let sheet: any = data[i];
            let sheetData: any = sheet.data;
            let previewTable: HTMLTableElement = document.createElement('table');
            previewTable.classList.add('stripes');
            let thead: HTMLTableSectionElement = document.createElement('thead');
            let headRow: HTMLTableRowElement = document.createElement('tr');
            thead.appendChild(headRow);
            previewTable.appendChild(thead);
            for (let h = 0; h < sheet.columns; h++) {
                let th: HTMLTableHeaderCellElement = document.createElement('th');
                th.id = sheetData[0][h];
                th.innerText = sheetData[0][h];
                headRow.appendChild(th);
            }
            for (let h = 1; h < sheetData.length; h++) {
                let tr: HTMLTableRowElement = document.createElement('tr');
                previewTable.appendChild(tr);
                for (let j = 0; j < sheet.columns; j++) {
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
        for (let i = 0; i < this.columns[selected].length; i++) {
            let th: HTMLTableHeaderCellElement = document.getElementById(this.columns[selected][i]) as HTMLTableHeaderCellElement;
            th.innerText = this.columns[selected][i];
        }
        this.langs = [];
    }

    getLanguages(): void {
        let excelFile: HTMLInputElement = document.getElementById('excelFile') as HTMLInputElement;
        if (excelFile.value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select Excel file', parent: 'convertExcel' });
            return;
        }
        let sheetSelect: HTMLSelectElement = document.getElementById('sheetSelect') as HTMLSelectElement;
        let selected: number = sheetSelect.selectedIndex;
        this.electron.ipcRenderer.send('get-excel-languages', { columns: this.columns[selected], languages: this.langs });
    }

    excelLanguages(arg: string[]): void {
        this.langs = arg;
        let sheetSelect: HTMLSelectElement = document.getElementById('sheetSelect') as HTMLSelectElement;
        let selected: number = sheetSelect.selectedIndex;
        for (let i = 0; i < this.columns[selected].length; i++) {
            let th: HTMLTableHeaderCellElement = document.getElementById(this.columns[selected][i]) as HTMLTableHeaderCellElement;
            th.innerText = this.columns[selected][i] + ' (' + this.langs[i] + ')';
        }
        (document.getElementById('convert') as HTMLButtonElement).focus();
    }

    convertExcel(): void {
        let excelFile: HTMLInputElement = document.getElementById('excelFile') as HTMLInputElement;
        if (excelFile.value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select Excel file', parent: 'convertExcel' });
            return;
        }
        let tmxFile: HTMLInputElement = document.getElementById('tmxFile') as HTMLInputElement;
        if (tmxFile.value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select TMX file', parent: 'convertExcel' });
            return;
        }
        if (this.langs.length === 0) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Set languages', parent: 'convertExcel' });
            return;
        }
        let sheetSelect: HTMLSelectElement = document.getElementById('sheetSelect') as HTMLSelectElement;
        let selected: string = sheetSelect.selectedOptions[0].text;
        let arg = {
            excelFile: excelFile.value,
            tmxFile: tmxFile.value,
            sheet: selected,
            langs: this.langs,
            openTMX: (document.getElementById('openTMX') as HTMLInputElement).checked
        }
        this.electron.ipcRenderer.send('convert-excel-tmx', arg);
    }
}

new ConvertExcel();