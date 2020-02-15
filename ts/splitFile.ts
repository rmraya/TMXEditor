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

var _sf = require('electron');

function splitFileLoaded(): void {
    _b.ipcRenderer.send('get-theme');
}

_sf.ipcRenderer.on('set-theme', (event, arg) => {
    (document.getElementById('theme') as HTMLLinkElement).href = arg;
});

function splitFile() {
    var file: string = (document.getElementById('file') as HTMLInputElement).value;
    if (file === '') {
        _sf.ipcRenderer.send('show-message', { type: 'warning', message: 'Select TMX file' });
        return;
    }
    var parts = Number.parseInt((document.getElementById('parts') as HTMLInputElement).value);
    _sf.ipcRenderer.send('split-tmx', {command: 'splitFile', file: file, parts: parts});
}

function browseFiles() {
    _sf.ipcRenderer.send('select-tmx');
}

_sf.ipcRenderer.on('tmx-file', (event, arg) => {
    (document.getElementById('file') as HTMLInputElement).value = arg;
});