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

class FileInfo {

    electron = require('electron');

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.send('file-properties');
        this.electron.ipcRenderer.on('set-file-properties', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setFileProperties(arg);
        });
        document.getElementById('showAttributes').addEventListener('click', () => {
            this.showAttributes();
        });
        document.getElementById('showProperties').addEventListener('click', () => {
            this.showProperties();
        })
        document.getElementById('showNotes').addEventListener('click', () => {
            this.showNotes();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-fileInfo');
            }
        });

    }

    setFileProperties(arg: any): void {
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
            propsContent = propsContent + '<tr><td class="noWrap">' + pair[0] + '</td><td>' + pair[1] + '</td></tr>'
        }
        document.getElementById('propertiesTable').innerHTML = propsContent;

        var notes: string[] = arg.notes;
        var notesContent: string = '';
        for (let i = 0; i < notes.length; i++) {
            notesContent = notesContent + '<tr><td>' + notes[i] + '</td></tr>'
        }
        document.getElementById('notesTable').innerHTML = notesContent;
        let body: HTMLBodyElement = document.getElementById('body') as HTMLBodyElement;
        this.electron.ipcRenderer.send('fileInfo-height', { width: body.clientWidth, height: body.clientHeight + 10 });
    }

    showAttributes(): void {
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

    showProperties(): void {
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

    showNotes(): void {
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
}

new FileInfo();