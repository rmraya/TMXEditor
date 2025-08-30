/*******************************************************************************
 * Copyright (c) 2018-2025 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

class MergeFiles {

    electron = require('electron');

    files: string[] = [];
    removeText: string = '';

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        this.electron.ipcRenderer.on('merged-tmx-file', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('file') as HTMLInputElement).value = arg;
        });
        this.electron.ipcRenderer.on('tmx-files', (event: Electron.IpcRendererEvent, arg: string[]) => {
            this.tmxFiles(arg);
        });
        document.getElementById('browseMergedFile').addEventListener('click', () => {
            this.electron.ipcRenderer.send('select-merged-tmx');
        });
        document.getElementById('addFiles').addEventListener('click', () => {
            this.electron.ipcRenderer.send('add-tmx-files');
        });
        document.getElementById('mergeFiles').addEventListener('click', () => {
            this.mergeFiles();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.mergeFiles();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-mergeFiles');
            }
        });
        this.electron.ipcRenderer.send('get-remove-file-text');
        this.electron.ipcRenderer.on('set-remove-file-text', (event: Electron.IpcRendererEvent, text: string) => {
            this.removeText = text;
        });
        document.getElementById('file').focus();
        this.electron.ipcRenderer.send('mergeFiles-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    mergeFiles(): void {
        let file: string = (document.getElementById('file') as HTMLInputElement).value;
        if (file === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'mergeFiles', key: 'selectMerged', parent: 'mergeFiles' });
            return;
        }
        if (this.files.length === 0) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'mergeFiles', key: 'addTmxFiles', parent: 'mergeFiles' });
            return;
        }
        if (this.files.length < 2) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'mergeFiles', key: 'addMoreTmx', parent: 'mergeFiles' });
            return;
        }
        this.electron.ipcRenderer.send('merge-tmx-files', { merged: file, files: this.files });
    }

    tmxFiles(args: string[]): void {
        for (let arg of args) {
            if (this.files.indexOf(arg) === -1) {
                this.files.push(arg);
            }
        }
        this.displayFiles();
    }

    displayFiles(): void {
        this.files.sort((a: string, b: string) => {
            return a.localeCompare(b, document.documentElement.lang, { sensitivity: 'base' });
        });
        let table: HTMLTableElement = document.getElementById('table') as HTMLTableElement;
        table.innerHTML = '';
        for (let file of this.files) {
            let row: HTMLTableRowElement = document.createElement('tr');
            table.appendChild(row);

            let cell = document.createElement('td');
            cell.style.width = '24px';
            cell.classList.add('middle');
            cell.classList.add('center');
            let remove: HTMLAnchorElement = document.createElement('a');
            remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" style="margin-top:4px"><path d="m400-325 80-80 80 80 51-51-80-80 80-80-51-51-80 80-80-80-51 51 80 80-80 80 51 51Zm-88 181q-29.7 0-50.85-21.15Q240-186.3 240-216v-480h-48v-72h192v-48h192v48h192v72h-48v479.57Q720-186 698.85-165T648-144H312Zm336-552H312v480h336v-480Zm-336 0v480-480Z"/></svg>' +
                '<span class="tooltiptext bottomTooltip">' + this.removeText + '</span>';
            remove.classList.add('tooltip');
            remove.classList.add('bottomTooltip');
            remove.addEventListener('click', () => {
                this.deleteFiles(file);
            });
            cell.appendChild(remove);
            row.appendChild(cell);

            cell = document.createElement('td');
            cell.classList.add('middle');
            cell.innerHTML = file;
            row.appendChild(cell);
        }
    }

    deleteFiles(file: string): void {
        if (file) {
            let index: number = this.files.indexOf(file);
            if (index !== -1) {
                this.files.splice(index, 1);
            }
        } else {
            this.files = [];
        }
        this.displayFiles();
    }
}
