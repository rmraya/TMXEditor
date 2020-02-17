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

var _cs = require('electron');


_cs.ipcRenderer.on('filter-languages', (event, arg) => {
    var language: HTMLSelectElement = document.getElementById('language') as HTMLSelectElement;
    var options: string = '<option value="*all*">Any Language</option>';
    for (let i: number = 0; i < arg.length; i++) {
        let lang: any = arg[i];
        options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
    }
    language.innerHTML = options;
    _cs.ipcRenderer.send('get-source-language');
});

_cs.ipcRenderer.on('set-source-language', (event, arg) => {
    (document.getElementById('language') as HTMLSelectElement).value = arg.srcLang;
});

function changeSrcLanguage() {
    var language: HTMLSelectElement = document.getElementById('language') as HTMLSelectElement;
    _cs.ipcRenderer.send('change-source-language', language.value);
}

function srcLanguageLoaded(): void {
    _cs.ipcRenderer.send('get-theme');
    _cs.ipcRenderer.send('get-filter-languages');
}

_cs.ipcRenderer.on('set-theme', (event, arg) => {
    (document.getElementById('theme') as HTMLLinkElement).href = arg;
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        window.close();
    }
    if (event.key === 'Enter') {
        changeSrcLanguage();
    }
});