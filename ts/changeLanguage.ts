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

var _cl = require('electron');

_cl.ipcRenderer.on('filter-languages', (event, arg) => {
    var currentLanguage: HTMLSelectElement = document.getElementById('currentLanguage') as HTMLSelectElement;
    var options: string = '';
    for (let i: number = 0; i < arg.length; i++) {
        let lang: any = arg[i];
        options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
    }
    currentLanguage.innerHTML = options;
    _cl.ipcRenderer.send('all-languages');
});

_cl.ipcRenderer.on('languages-list', (event, arg) => {
    var newLanguage: HTMLSelectElement = document.getElementById('newLanguage') as HTMLSelectElement;
    var options: string = '';
    for (let i: number = 0; i < arg.length; i++) {
        let lang: any = arg[i];
        options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
    }
    newLanguage.innerHTML = options;
});

function changeLanguage() {
    var currentLanguage: HTMLSelectElement = document.getElementById('currentLanguage') as HTMLSelectElement;
    var newLanguage: HTMLSelectElement = document.getElementById('newLanguage') as HTMLSelectElement;
    _cl.ipcRenderer.send('change-language', { command: 'changeLanguage', oldLanguage: currentLanguage.value, newLanguage: newLanguage.value });
}

function changeLanguageLoaded(): void {
    _cl.ipcRenderer.send('get-theme');
    _cl.ipcRenderer.send('get-filter-languages');
}

_cl.ipcRenderer.on('set-theme', (event, arg) => {
    (document.getElementById('theme') as HTMLLinkElement).href = arg;
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        window.close();
    }
    if (event.key === 'Enter') {
        changeLanguage();
    }
});