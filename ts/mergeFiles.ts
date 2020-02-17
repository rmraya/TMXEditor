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

var _mf = require('electron');

var files: string[] = [];

function mergeFilesLoaded(): void {
    _mf.ipcRenderer.send('get-theme');
}

_mf.ipcRenderer.on('set-theme', (event, arg) => {
    (document.getElementById('theme') as HTMLLinkElement).href = arg;
});

function mergeFiles() {
    var file: string = (document.getElementById('file') as HTMLInputElement).value;
    if (file === '') {
        _mf.ipcRenderer.send('show-message', { type: 'warning', message: 'Select merged TMX file' });
        return;
    }
    if (files.length === 0) {
        _mf.ipcRenderer.send('show-message', { type: 'warning', message: 'Add TMX files' });
        return;
    }
    if (files.length < 2) {
        _mf.ipcRenderer.send('show-message', { type: 'warning', message: 'Add more TMX files' });
        return;
    }
    _mf.ipcRenderer.send('merge-tmx-files', { command: 'mergeFiles', merged: file, files: files });
}

function browseMergedFile() {
    _mf.ipcRenderer.send('select-merged-tmx');
}

function addFiles() {
    _mf.ipcRenderer.send('add-tmx-files');
}

_mf.ipcRenderer.on('merged-tmx-file', (event, arg) => {
    (document.getElementById('file') as HTMLInputElement).value = arg;
});

_mf.ipcRenderer.on('tmx-files', (event, arg) => {
    for (let i = 0; i < arg.length; i++) {
        if (!contains(files, arg[i])) {
            files.push(arg[i]);
        }
    }
    files.sort();
    var rows: string = '';
    for (let i = 0; i < files.length; i++) {
        rows = rows + '<tr><td><input type="checkbox" class="rowCheck"></td><td>' + files[i] + '</td></tr>';
    }
    document.getElementById('table').innerHTML = rows;
});

function contains(array: string[], value: String): boolean {
    for (let i = 0; i < array.length; i++) {
        if (array[i] === value) {
            return true;
        }
    }
    return false;
}

function deleteFiles() {
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
        _mf.ipcRenderer.send('show-message', { type: 'warning', message: 'Select files' });
        return;
    }

    var array: string[] = [];
    for (let i = 0; i < files.length; i++) {
        if (!contains(selected, files[i])) {
            array.push(files[i]);
        }
    }
    files = array.sort();
    var rows: string = '';
    for (let i = 0; i < files.length; i++) {
        rows = rows + '<tr><td><input type="checkbox" class="rowCheck"></td><td>' + files[i] + '</td></tr>';
    }
    document.getElementById('table').innerHTML = rows;
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        window.close();
    }
});