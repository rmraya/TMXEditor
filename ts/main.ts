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
const { ipcRenderer, shell } = require('electron');

var languages;
var currentId: string = null;
var currentLang: string = null;
var currentCell: Element = null;
var currentContent: string = null;

document.getElementById('open').addEventListener('click', () => {
    ipcRenderer.send('openFile');
});

document.getElementById('help').addEventListener('click', () => {
    var help = __dirname + '/tmxeditor.pdf';
    if (process.platform == 'win32') {
        help = __dirname + '\\tmxeditor.pdf'
    }
    shell.openItem(help);
});

ipcRenderer.on('start-waiting', () => {
    document.getElementById('body').classList.add("wait");
});

ipcRenderer.on('end-waiting', () => {
    document.getElementById('body').classList.remove("wait");
});

ipcRenderer.on('set-status', (event, arg) => {
    document.getElementById('status').innerHTML = arg;
});

ipcRenderer.on('status-changed', (event, arg) => {
    if (arg.status === 'Success') {
        if (arg.count != undefined) {
            document.getElementById('units').innerText = arg.count;
            var unitsPage: string = (document.getElementById('units_page') as HTMLInputElement).value;
            if (unitsPage === '') {
                unitsPage = '200';
                (document.getElementById('units_page') as HTMLInputElement).value = unitsPage;
            }
            document.getElementById('pages').innerText = '' + Math.ceil(arg.count / Number(unitsPage));
        }
    }
});

ipcRenderer.on('languages-changed', () => {
    ipcRenderer.send('get-languages');
});

ipcRenderer.on('update-languages', (event, arg) => {
    languages = arg;
    var row = '<tr  class="dark_background"><th class="dark_background fixed"><input type="checkbox"></th><th class="dark_background fixed">#</th>';

    for (let index = 0; index < languages.length; ++index) {
        row = row + '<th class="dark_background">' + languages[index].code + ' - ' + arg[index].name + '</th>';
    }
    document.getElementById('tableHeader').innerHTML = row + '</tr>';
});

ipcRenderer.on('file-loaded', () => {
    var unitsPage: string = (document.getElementById('units_page') as HTMLInputElement).value;
    (document.getElementById('page') as HTMLInputElement).value = '1';
    ipcRenderer.send('get-segments', {
        start: 0,
        count: Math.round(Number(unitsPage)),
        filterText: '',
        caseSensitiveFilter: false
    });
});

ipcRenderer.on('update-segments', (event, arg) => {
    var rows = '';
    for (let i = 0; i < arg.units.length; i++) {
        rows = rows + arg.units[i];
    }
    document.getElementById("tableBody").innerHTML = rows;
});

ipcRenderer.on('file-closed', () => {
    document.getElementById("tableBody").innerHTML = '';
    document.getElementById("tableHeader").innerHTML = '<tr class="dark_background"><th class="fixed dark_background">&#x2713;</th><th class="fixed dark_background">#</th><th class="dark_background">&nbsp;</th><th class="dark_background">&nbsp;</th></tr>';
    (document.getElementById('page') as HTMLInputElement).value = '0';
    document.getElementById('pages').innerHTML = '0';
    document.getElementById('units').innerHTML = '';
});

document.getElementById('mainTable').addEventListener('click', (event) => {
    var x: string = (event.target as Element).tagName;
    var id: string = '';
    var lang: string = '';
    if ('TD' === x) {
        var composed = event.composedPath();
        if ('TR' === (composed[0] as Element).tagName) {
            id = (composed[0] as Element).id;
        } else if ('TR' === (composed[1] as Element).tagName) {
            id = (composed[1] as Element).id;
        } else if ('TR' === (composed[2] as Element).tagName) {
            id = (composed[2] as Element).id;
        }
        lang = (event.target as Element).getAttribute('lang');
        console.log('clicked ' + id + ' ' + lang);
    }
    if (id !== '') {
        currentId = id;
        if (currentCell != null) {
            currentCell.innerHTML = currentContent;
            currentCell = null;
            currentContent = null;
        }
        if (lang !== '') {
            currentLang = lang;
            currentCell = (event.target as Element);
            currentContent = currentCell.innerHTML;
            var textArea: HTMLTextAreaElement = document.createElement('textarea');
            textArea.setAttribute('style', 'height: ' + (currentCell.clientHeight - 8) + 'px; width: ' + (currentCell.clientWidth - 8) + 'px;')
            textArea.innerHTML = currentContent;
            currentCell.innerHTML = '';
            currentCell.parentElement.style.padding = '0px';
            currentCell.appendChild(textArea);
            textArea.focus();
            ipcRenderer.send('get-cell-properties', { id: currentId, lang: currentLang });
        } else {
            ipcRenderer.send('get-row-properties', { id: currentId });
        }
    }
});


ipcRenderer.on('update-properties', (event, arg) => {
    var table = document.getElementById('attributesTable');
    table.innerHTML = '';
    var attributes = arg.attributes;
    for (let i = 0; i < attributes.length; i++) {
        var pair = attributes[i];
        var tr = document.createElement('tr');
        table.appendChild(tr);
        var left = document.createElement('td');
        left.textContent = pair[0];
        tr.appendChild(left);
        var right = document.createElement('td');
        right.textContent = pair[1];
        tr.appendChild(right);
    }
    table = document.getElementById('propertiesTable');
    table.innerHTML = '';
    var properties = arg.properties;
    for (let i = 0; i < properties.length; i++) {
        var pair = properties[i];
        var tr = document.createElement('tr');
        table.appendChild(tr);
        var left = document.createElement('td');
        left.textContent = pair[0];
        tr.appendChild(left);
        var right = document.createElement('td');
        right.textContent = pair[1];
        tr.appendChild(right);
    }
    table = document.getElementById('notesTable');
    table.innerHTML = '';
    var notes = arg.notes;
    for (let i = 0; i < properties.length; i++) {
        var tr = document.createElement('tr');
        table.appendChild(tr);
        var note = document.createElement('td');
        note.textContent = notes[i];
        tr.appendChild(note);
    }
});