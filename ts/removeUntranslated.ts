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

const _ru = require("electron");

_ru.ipcRenderer.on('filter-languages', (event, arg) => {
    var sourceLanguage: HTMLSelectElement = document.getElementById('sourceLanguage') as HTMLSelectElement;
    var options: string = '';
    for (let i: number = 0; i < arg.length; i++) {
        let lang: any = arg[i];
        options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
    }
    sourceLanguage.innerHTML = options;
    _ru.ipcRenderer.send('get-source-language');
});

_ru.ipcRenderer.on('set-source-language', (event, arg) => {
    if (arg.srcLang !== '*all*') {
        (document.getElementById('sourceLanguage') as HTMLSelectElement).value = arg.srcLang;
    }
});

function removeUntranslated(): void {
    var srcLang: string = (document.getElementById('sourceLanguage') as HTMLSelectElement).value;
    _ru.ipcRenderer.send('remove-untranslated', { command: 'removeUntranslated', srcLang: srcLang });
}

function removeUntranslatedLoaded(): void {
    _ru.ipcRenderer.send('get-theme');
    _ru.ipcRenderer.send('get-filter-languages');
}

_ru.ipcRenderer.on('set-theme', (event, arg) => {
    (document.getElementById('theme') as HTMLLinkElement).href = arg;
});