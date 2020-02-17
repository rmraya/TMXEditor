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

var _fi = require('electron');

function fileInfoLoaded(): void {
    _fi.ipcRenderer.send('get-theme');
    _fi.ipcRenderer.send('file-properties');
}

_fi.ipcRenderer.on('set-theme', (event, arg) => {
    (document.getElementById('theme') as HTMLLinkElement).href = arg;
});

_fi.ipcRenderer.on('set-file-properties', (event, arg) => {
    document.getElementById('file').innerHTML = arg.file;
    document.getElementById('creationtool').innerHTML = arg.attributes.creationtool;
    document.getElementById('creationtoolversion').innerHTML = arg.attributes.creationtoolversion;
    document.getElementById('segtype').innerHTML = arg.attributes.segtype;
    document.getElementById('o-tmf').innerHTML = arg.attributes.o_tmf;
    document.getElementById('adminlang').innerHTML = arg.attributes.adminlang;
    document.getElementById('srclang').innerHTML = arg.attributes.srclang;
    document.getElementById('datatype').innerHTML = arg.attributes.datatype;

    var propsContent: string = '';
    for (let i = 0; i < arg.properties.length; i++) {
        var pair: string[] = arg.properties[i];
        propsContent = propsContent + '<tr><td>' + pair[0] + '</td><td>' + pair[1] + '</td></tr>'
    }
    document.getElementById('propertiesTable').innerHTML = propsContent;

    var notes: string[] = arg.notes;
    var notesContent: string = '';
    for (let i = 0; i < notes.length; i++) {
        notesContent = notesContent + '<tr><td>' + notes[i] + '</td></tr>'
    }
    document.getElementById('notesTable').innerHTML = notesContent;
});

function showAttributes() {
    document.getElementById('atributesTab').classList.add('selected');
    document.getElementById('attributes').classList.remove('hiddenTab');
    document.getElementById('attributes').classList.add('tabContent');

    document.getElementById('propertiesTab').classList.remove('selected');
    document.getElementById('properties').classList.remove('tabContent');
    document.getElementById('properties').classList.add('hiddenTab');

    document.getElementById('notesTab').classList.remove('selected');
    document.getElementById('notes').classList.remove('tabContent');
    document.getElementById('notes').classList.add('hiddenTab');
}

function showProperties() {
    document.getElementById('propertiesTab').classList.add('selected');
    document.getElementById('properties').classList.remove('hiddenTab');
    document.getElementById('properties').classList.add('tabContent');

    document.getElementById('atributesTab').classList.remove('selected');
    document.getElementById('attributes').classList.remove('tabContent');
    document.getElementById('attributes').classList.add('hiddenTab');

    document.getElementById('notesTab').classList.remove('selected');
    document.getElementById('notes').classList.remove('tabContent');
    document.getElementById('notes').classList.add('hiddenTab');
}

function showNotes() {
    document.getElementById('notesTab').classList.add('selected');
    document.getElementById('notes').classList.add('tabContent');
    document.getElementById('notes').classList.remove('hiddenTab');

    document.getElementById('propertiesTab').classList.remove('selected');
    document.getElementById('properties').classList.remove('tabContent');
    document.getElementById('properties').classList.add('hiddenTab');
    
    document.getElementById('atributesTab').classList.remove('selected');
    document.getElementById('attributes').classList.remove('tabContent');
    document.getElementById('attributes').classList.add('hiddenTab');
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        window.close();
    }
});