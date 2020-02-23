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

var _csl = require('electron');
var columns: number;
var options: string = '<option value=""></option>';

function csvLanguagesLoaded() {
    _csl.ipcRenderer.send('get-theme');
    _csl.ipcRenderer.send('all-languages');
}

_csl.ipcRenderer.on('set-theme', (event, arg: string) => {
    (document.getElementById('theme') as HTMLLinkElement).href = arg;
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        window.close();
    }
    if (event.key === 'Enter') {
        setCsvLanguages();
    }
});

function setCsvLanguages() {
    var langs: string[] = [];
    for (let i = 0; i < columns; i++) {
        var lang: string = (document.getElementById('lang_' + i) as HTMLSelectElement).value;
        if (lang !== '') {
            langs.push(lang);
        } else {
            _csl.ipcRenderer.send('show-message', { type: 'warning', message: 'Select all languages' });
            return;
        }
    }
    _csl.ipcRenderer.send('set-csv-languages', langs);
}

_csl.ipcRenderer.on('languages-list', (event, arg) => {
    for (let i: number = 0; i < arg.length; i++) {
        let lang: any = arg[i];
        options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
    }
    _csl.ipcRenderer.send('get-csv-lang-args');
});

_csl.ipcRenderer.on('set-csv-lang-args', (event, arg) => {
    columns = arg.columns;
    var rows: string = '';
    for (let i = 0; i < columns; i++) {
        rows = rows + '<tr><td class="noWrap">Column ' + i + '</td><td><select id="lang_' + i + '">' + options + '</select></td></tr>'
    }
    document.getElementById('langsTable').innerHTML = rows;
    var langs: string[] = arg.languages;
    for (let i = 0; i < langs.length; i++) {
        (document.getElementById('lang_' + i) as HTMLSelectElement).value = langs[i];
    }
});