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

var _n = require('electron');

var currentId: string;
var currentType: string;
var notes: string[];

function notesLoaded(): void {
    _n.ipcRenderer.send('get-theme');
    _n.ipcRenderer.send('get-unit-notes');
}

_n.ipcRenderer.on('set-theme', (event, arg) => {
    (document.getElementById('theme') as HTMLLinkElement).href = arg;
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        window.close();
    }
    if (event.key === 'Enter') {
        saveNotes();
    }
});

_n.ipcRenderer.on('set-unit-notes', (event, arg) => {
    currentId = arg.id;
    currentType = arg.type;
    notes = arg.notes;
    drawNotes();
});

_n.ipcRenderer.on('set-new-note', (event, arg) => {
    notes.push(arg.note);
    drawNotes();
    (document.getElementById('save') as HTMLButtonElement).focus();
});

function drawNotes() {
    var rows: string = '';
    for (let i = 0; i < notes.length; i++) {
        var note = notes[i];
        rows = rows + '<tr id="note_' + i + '"><td><input type="checkbox" class="rowCheck"></td><td class="noWrap">' + note + '</td></tr>';
    }
    document.getElementById('notesTable').innerHTML = rows;
}

function saveNotes() {
    var lang = currentType === 'TU' ? '' : currentType;
    var arg = {
        id: currentId,
        lang: lang,
        notes: notes
    }
    _n.ipcRenderer.send('save-notes', arg);
}

function addNote() {
    _n.ipcRenderer.send('show-add-note');
}

function deleteNotes() {
    var collection: HTMLCollection = document.getElementsByClassName('rowCheck');
    for (let i = 0; i < collection.length; i++) {
        var check = collection[i] as HTMLInputElement;
        if (check.checked) {
            removeNote(check.parentElement.parentElement.id);
        }
    }
    drawNotes();
    (document.getElementById('save') as HTMLButtonElement).focus();
}

function removeNote(id: string) {
    var copy: string[] = [];
    for (let i = 0; i < notes.length; i++) {
        if (id !== 'note_' + i) {
            copy.push(notes[i]);
        }
    }
    notes = copy;
}
