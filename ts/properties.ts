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

var _pr = require('electron');

var currentId: string;
var currentType: string;
var props: Array<string[]>;

function propertiesLoaded(): void {
    _pr.ipcRenderer.send('get-theme');
    _pr.ipcRenderer.send('get-unit-properties');
}

_pr.ipcRenderer.on('set-theme', (event, arg) => {
    (document.getElementById('theme') as HTMLLinkElement).href = arg;
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        window.close();
    }
    if (event.key === 'Enter') {
        saveProperties();
    }
});

_pr.ipcRenderer.on('set-unit-properties', (event, arg) => {
    currentId = arg.id;
    currentType = arg.type;
    props = arg.props;
    drawProperties();
});

function saveProperties() {
    var lang = currentType === 'TU' ? '' : currentType;
    var arg = {
        id: currentId,
        lang: lang,
        properties: props
    }
    _pr.ipcRenderer.send('save-properties', arg);
}

function addProperty() {
    _pr.ipcRenderer.send('show-add-property');
}

_pr.ipcRenderer.on('set-new-property', (event, arg) => {
    var prop:string[] = [arg.type, arg.value];
    props.push(prop);
    drawProperties();
    (document.getElementById('save') as HTMLButtonElement).focus();
});

function deleteProperties() {
    var collection: HTMLCollection = document.getElementsByClassName('rowCheck');
    for (let i = 0; i < collection.length; i++) {
        var check = collection[i] as HTMLInputElement;
        if (check.checked) {
            removeProperty(check.parentElement.parentElement.id);
        }
    }
    drawProperties();
    (document.getElementById('save') as HTMLButtonElement).focus();
}

function drawProperties() {
    var rows: string = '';
    for (let i = 0; i < props.length; i++) {
        var pair: string[] = props[i];
        rows = rows + '<tr id="' + pair[0] + '"><td><input type="checkbox" class="rowCheck"></td><td class="noWrap">' + pair[0] + '</td><td class="noWrap">' + pair[1] + '</td></tr>';
    }
    document.getElementById('propsTable').innerHTML = rows;
}

function removeProperty(type: string) {
    var copy: Array<string[]> = [];
    for (let i=0 ; i<props.length ; i++) {
        var pair: string[] = props[i];
        if (pair[0] !== type) {
            copy.push(pair);
        }
    }
    props = copy;
}