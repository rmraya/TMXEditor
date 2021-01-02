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
        this.electron.ipcRenderer.on('tmx-files', (event: Electron.IpcRendererEvent, arg: any) => {
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
        let body: HTMLBodyElement = document.getElementById('body') as HTMLBodyElement;
        this.electron.ipcRenderer.send('mergeFiles-height', { width: body.clientWidth, height: body.clientHeight + 10 });
    }

    mergeFiles(): void {
        var file: string = (document.getElementById('file') as HTMLInputElement).value;
        if (file === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select merged TMX file', parent: 'mergeFiles' });
            return;
        }
        if (this.files.length === 0) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Add TMX files', parent: 'mergeFiles' });
            return;
        }
        if (this.files.length < 2) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Add more TMX files', parent: 'mergeFiles' });
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

    tmxFiles(arg: any): void {
        for (let i = 0; i < arg.length; i++) {
            if (!this.contains(this.files, arg[i])) {
                this.files.push(arg[i]);
            }
        }
        this.files.sort();
        var rows: string = '';
        for (let i = 0; i < this.files.length; i++) {
            rows = rows + '<tr><td><input type="checkbox" class="rowCheck"></td><td>' + this.files[i] + '</td></tr>';
        }
        document.getElementById('table').innerHTML = rows;
    }

    contains(array: string[], value: string): boolean {
        for (let i = 0; i < array.length; i++) {
            if (array[i] === value) {
                return true;
            }
        }
        return false;
    }

    deleteFiles(): void {
        var collection = document.getElementsByClassName('rowCheck');
        var selected: string[] = [];
        for (let i = 0; i < collection.length; i++) {
            var checkbox = (collection[i] as HTMLInputElement);
            if (checkbox.checked) {
                var file: string = checkbox.parentElement.nextElementSibling.innerHTML;
                selected.push(file);
            }
        }
        if (selected.length == 0) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select files', parent: 'mergeFiles' });
            return;
        }
        var array: string[] = [];
        for (let i = 0; i < this.files.length; i++) {
            if (!this.contains(selected, this.files[i])) {
                array.push(this.files[i]);
            }
        }
        array.sort();
        this.files = array;
        var rows: string = '';
        for (let i = 0; i < this.files.length; i++) {
            rows = rows + '<tr><td><input type="checkbox" class="rowCheck"></td><td>' + this.files[i] + '</td></tr>';
        }
        document.getElementById('table').innerHTML = rows;
    }
}

new MergeFiles();