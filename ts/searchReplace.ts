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

const _s = require("electron");

_s.ipcRenderer.send('get-filter-languages');

_s.ipcRenderer.on('filter-languages', (event, arg) => {
    var language: HTMLSelectElement = document.getElementById('language') as HTMLSelectElement;
    var options: string = '';
    for (let i: number = 0; i < arg.length; i++) {
        let lang: any = arg[i];
        options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
    }
    language.innerHTML = options;
});

function replace(): void {
    var searchText: string = (document.getElementById('searchText') as HTMLInputElement).value;
    var replaceText: string = (document.getElementById('replaceText') as HTMLInputElement).value;
    var language: string = (document.getElementById('language') as HTMLSelectElement).value;
    if (searchText.length === 0) {
        _s.ipcRenderer.send('show-message', { type: 'warning', message: 'Enter text to search' });
        return;
    }
    if (replaceText.length === 0) {
        _s.ipcRenderer.send('show-message', { type: 'warning', message: 'Enter replacement text' });
        return;
    }
    var regularExpression: boolean = (document.getElementById('regularExpression') as HTMLInputElement).checked;
    _s.ipcRenderer.send('replace-request', {command: 'replaceText', search: searchText, replace: replaceText, lang: language, regExp: regularExpression });
}