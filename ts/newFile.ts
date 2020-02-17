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

var _nf = require('electron');

_nf.ipcRenderer.on('languages-list', (event, arg) => {
    var srcLanguage: HTMLSelectElement = document.getElementById('srcLanguage') as HTMLSelectElement;
    var tgtLanguage: HTMLSelectElement = document.getElementById('tgtLanguage') as HTMLSelectElement;
    var options: string = '';
    for (let i: number = 0; i < arg.length; i++) {
        let lang: any = arg[i];
        options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
    }
    srcLanguage.innerHTML = options;
    tgtLanguage.innerHTML = options;
});

function createFile() {
    var srcLanguage: HTMLSelectElement = document.getElementById('srcLanguage') as HTMLSelectElement;
    var tgtLanguage: HTMLSelectElement = document.getElementById('tgtLanguage') as HTMLSelectElement;
    if (srcLanguage.value === tgtLanguage.value) {
        _nf.ipcRenderer.send('show-message', { type: 'warning', message: 'Select different languages' });
        return;
    }
    _nf.ipcRenderer.send('create-file', { command: 'createFile', srcLang: srcLanguage.value, tgtLang: tgtLanguage.value });
}

function newFileLoaded(): void {
    _nf.ipcRenderer.send('get-theme');
    _nf.ipcRenderer.send('all-languages');
}

_nf.ipcRenderer.on('set-theme', (event, arg) => {
    (document.getElementById('theme') as HTMLLinkElement).href = arg;
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        window.close();
    }
    if (event.key === 'Enter') {
        createFile();
    }
});