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

var _csv = require('electron');
var langs: string[] = [];
var columns: number = 0;

function convertCSVLoaded() {
    _csv.ipcRenderer.send('get-theme');
    _csv.ipcRenderer.send('get-charsets');
}

_csv.ipcRenderer.on('set-theme', (event, arg: string) => {
    (document.getElementById('theme') as HTMLLinkElement).href = arg;
});

_csv.ipcRenderer.on('set-charsets', (event, arg: string[]) => {
    var options: string = '';
    for (let i = 0; i < arg.length; i++) {
        options = options + '<option value="' + arg[i] + '">' + arg[i] + '</option>';
    }
    var charSets = (document.getElementById('charSets') as HTMLSelectElement);
    charSets.innerHTML = options;
    charSets.value = 'UTF-16LE';
    var colSeps = (document.getElementById('colSeps') as HTMLSelectElement);
    colSeps.value = 'TAB';
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        window.close();
    }
    if (event.key === 'Enter') {
        convertFile();
    }
});

function browseCsvFiles() {
    _csv.ipcRenderer.send('get-csvfile');
}

_csv.ipcRenderer.on('set-csvfile', (event, arg: string) => {
    var csvFile = (document.getElementById('csvFile') as HTMLInputElement);
    csvFile.value = arg;

    var tmxFile = (document.getElementById('tmxFile') as HTMLInputElement);
    if (tmxFile.value === '') {
        var index: number = arg.lastIndexOf('.');
        if (index !== -1) {
            tmxFile.value = arg.substring(0, index) + '.tmx';
        } else {
            tmxFile.value = arg + '.tmx';
        }
    }
    refreshPreview(false);
});

function browseTmxFiles() {
    var value: string = (document.getElementById('csvFile') as HTMLInputElement).value;
    if (value !== '') {
        var index: number = value.lastIndexOf('.');
        if (index !== -1) {
            value = value.substring(0, index) + '.tmx';
        } else {
            value = value + '.tmx';
        }
    }
    _csv.ipcRenderer.send('get-converted-tmx', { default: value });
}

_csv.ipcRenderer.on('converted-tmx-file', (event, arg: string) => {
    var tmxFile = (document.getElementById('tmxFile') as HTMLInputElement);
    tmxFile.value = arg;
});

function refreshPreview(silent: boolean) {
    var csvFile = (document.getElementById('csvFile') as HTMLInputElement);
    if (csvFile.value === '') {
        if (!silent) {
            _csv.ipcRenderer.send('show-message', { type: 'warning', message: 'Select CSV/Text file' });
        }
        return;
    }

    var columnsSeparator: string = '';
    var customSep: string = (document.getElementById('customSep') as HTMLInputElement).value;
    if (customSep !== '') {
        columnsSeparator = customSep;
    } else {
        columnsSeparator = (document.getElementById('colSeps') as HTMLSelectElement).value;
        if (columnsSeparator === 'TAB') {
            columnsSeparator = '\t';
        }
    }

    var textDelimiter: string = '';
    var customDel: string = (document.getElementById('customDel') as HTMLInputElement).value;
    if (customDel !== '') {
        textDelimiter = customDel;
    } else {
        textDelimiter = (document.getElementById('textDelim') as HTMLSelectElement).value;
    }
    var arg = {
        csvFile: csvFile.value,
        langs: langs,
        charSet: (document.getElementById('charSets') as HTMLSelectElement).value,
        columnsSeparator: columnsSeparator,
        textDelimiter: textDelimiter
    }
    _csv.ipcRenderer.send('get-csv-preview', arg);
}

_csv.ipcRenderer.on('set-preview', (event, arg: any) => {
    columns = arg.cols;
    document.getElementById('preview').innerHTML = arg.preview;
    document.getElementById('columns').innerHTML = '' + columns;
    document.getElementById('langs').innerHTML = arg.langs;
});

function setLanguages() {
    var csvFile = (document.getElementById('csvFile') as HTMLInputElement);
    if (csvFile.value === '') {
        _csv.ipcRenderer.send('show-message', { type: 'warning', message: 'Select CSV/Text file' });
        return;
    }
    if (columns === 0) {
        _csv.ipcRenderer.send('show-message', { type: 'warning', message: 'Columns not detected' });
        return;
    }
    _csv.ipcRenderer.send('get-csv-languages', { columns: columns, languages: langs });
}

_csv.ipcRenderer.on('csv-languages', (event, arg: string[]) => {
    langs = arg;
    refreshPreview(false);
    (document.getElementById('convert') as HTMLButtonElement).focus();
});

function convertFile() {
    var csvFile = (document.getElementById('csvFile') as HTMLInputElement);
    if (csvFile.value === '') {
        _csv.ipcRenderer.send('show-message', { type: 'warning', message: 'Select CSV/Text file' });
        return;
    }
    var tmxFile = (document.getElementById('tmxFile') as HTMLInputElement);
    if (tmxFile.value === '') {
        _csv.ipcRenderer.send('show-message', { type: 'warning', message: 'Select TMX file' });
        return;
    }
    if (langs.length < 2) {
        _csv.ipcRenderer.send('show-message', { type: 'warning', message: 'Set languages' });
        return;
    }
    if (langs.length != columns) {
        _csv.ipcRenderer.send('show-message', { type: 'warning', message: 'Set languages for all columns' });
        return;
    }

    var columnsSeparator: string = '';
    var customSep: string = (document.getElementById('customSep') as HTMLInputElement).value;
    if (customSep !== '') {
        columnsSeparator = customSep;
    } else {
        columnsSeparator = (document.getElementById('colSeps') as HTMLSelectElement).value;
        if (columnsSeparator === 'TAB') {
            columnsSeparator = '\t';
        }
    }

    var textDelimiter: string = '';
    var customDel: string = (document.getElementById('customDel') as HTMLInputElement).value;
    if (customDel !== '') {
        textDelimiter = customDel;
    } else {
        textDelimiter = (document.getElementById('textDelim') as HTMLSelectElement).value;
    }
    var arg = {
        csvFile: csvFile.value,
        tmxFile: tmxFile.value,
        langs: langs,
        charSet: (document.getElementById('charSets') as HTMLSelectElement).value,
        columnsSeparator: columnsSeparator,
        textDelimiter: textDelimiter,
        fixQuotes: (document.getElementById('fixQuotes') as HTMLInputElement).checked,
        optionalDelims: (document.getElementById('optionalDelims') as HTMLInputElement).checked,
        openTMX: (document.getElementById('openTMX') as HTMLInputElement).checked
    }
    _csv.ipcRenderer.send('convert-csv-tmx', arg);
}