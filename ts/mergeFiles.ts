/*******************************************************************************
 * Copyright (c) 2023 Maxprograms.
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

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.on('merged-tmx-file', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('file') as HTMLInputElement).value = arg;
        });
        this.electron.ipcRenderer.on('tmx-files', (event: Electron.IpcRendererEvent, arg: any[]) => {
            this.tmxFiles(arg);
        });
        document.getElementById('browseMergedFile').addEventListener('click', () => {
            this.browseMergedFile();
        });
        document.getElementById('addFiles').addEventListener('click', () => {
            this.addFiles();
        });
        document.getElementById('deleteFiles').addEventListener('click', () => {
            this.deleteFiles();
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
        document.getElementById('file').focus();
        this.electron.ipcRenderer.send('mergeFiles-height', { width: document.body.clientWidth, height: document.body.clientHeight + 10 });
    }

    mergeFiles(): void {
        let file: string = (document.getElementById('file') as HTMLInputElement).value;
        if (file === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'mergeFiles', key: 'selectMerged', parent: 'mergeFiles' });
            return;
        }
        if (this.files.length === 0) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Add TMX files', parent: 'mergeFiles' });
            return;
        }
        if (this.files.length < 2) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'mergeFiles', key: 'addMoreTmx', parent: 'mergeFiles' });
            return;
        }
        this.electron.ipcRenderer.send('merge-tmx-files', { merged: file, files: this.files });
    }

    browseMergedFile(): void {
        this.electron.ipcRenderer.send('select-merged-tmx');
    }

    addFiles(): void {
        this.electron.ipcRenderer.send('add-tmx-files');
    }

    tmxFiles(args: any[]): void {
        for (let arg of args) {
            if (!this.contains(this.files, arg)) {
                this.files.push(arg);
            }
        }
        this.files.sort();
        let rows: string = '';
        for (let file of this.files) {
            rows = rows + '<tr><td><input type="checkbox" class="rowCheck"></td><td>' + file + '</td></tr>';
        }
        document.getElementById('table').innerHTML = rows;
    }

    contains(array: string[], value: string): boolean {
        for (let s of array) {
            if (s === value) {
                return true;
            }
        }
        return false;
    }

    deleteFiles(): void {
        let collection: HTMLCollectionOf<Element> = document.getElementsByClassName('rowCheck');
        let selected: string[] = [];
        for (let checkbox of collection) {
            if ((checkbox as HTMLInputElement).checked) {
                let file: string = checkbox.parentElement.nextElementSibling.innerHTML;
                selected.push(file);
            }
        }
        if (selected.length == 0) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'mergeFiles', key: 'selectFiles', parent: 'mergeFiles' });
            return;
        }
        let array: string[] = [];
        for (let file of this.files) {
            if (!this.contains(selected, file)) {
                array.push(file);
            }
        }
        array.sort();
        this.files = array;
        let rows: string = '';
        for (let file of this.files) {
            rows = rows + '<tr><td><input type="checkbox" class="rowCheck"></td><td>' + file + '</td></tr>';
        }
        document.getElementById('table').innerHTML = rows;
    }
}
