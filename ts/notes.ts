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

class Notes {

    electron = require('electron');

    currentId: string;
    currentType: string;
    notes: string[];

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.send('get-unit-notes');
        this.electron.ipcRenderer.on('set-unit-notes', (event: Electron.IpcRendererEvent, arg: any) => {
            this.currentId = arg.id;
            this.currentType = arg.type;
            this.notes = arg.notes;
            this.drawNotes();
        });
        this.electron.ipcRenderer.on('set-new-note', (event: Electron.IpcRendererEvent, arg: any) => {
            this.notes.push(arg.note);
            this.drawNotes();
            (document.getElementById('save') as HTMLButtonElement).focus();
        });
        document.getElementById('add').addEventListener('click', () => {
            this.addNote();
        });
        document.getElementById('delete').addEventListener('click', () => {
            this.deleteNotes();
        });
        document.getElementById('save').addEventListener('click', () => {
            this.saveNotes();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-notes');
            }
        });
        let body: HTMLBodyElement = document.getElementById('body') as HTMLBodyElement;
        this.electron.ipcRenderer.send('notes-height', { width: body.clientWidth, height: body.clientHeight });
    }

    drawNotes(): void {
        var rows: string = '';
        let length = this.notes.length
        for (let i = 0; i < length; i++) {
            var note = this.notes[i];
            rows = rows + '<tr id="note_' + i + '"><td><input type="checkbox" class="middle"></td><td class="middle noWrap fill_width">' + note + '</td></tr>';
        }
        document.getElementById('notesTable').innerHTML = rows;
    }

    saveNotes(): void {
        var lang = this.currentType === 'TU' ? '' : this.currentType;
        var arg = {
            id: this.currentId,
            lang: lang,
            notes: this.notes
        }
        this.electron.ipcRenderer.send('save-notes', arg);
    }

    addNote(): void {
        this.electron.ipcRenderer.send('show-add-note');
    }

    deleteNotes(): void {
        var collection: HTMLCollection = document.getElementsByClassName('rowCheck');
        for (let i = 0; i < collection.length; i++) {
            var check = collection[i] as HTMLInputElement;
            if (check.checked) {
                this.removeNote(check.parentElement.parentElement.id);
            }
        }
        this.drawNotes();
        (document.getElementById('save') as HTMLButtonElement).focus();
    }

    removeNote(id: string): void {
        var copy: string[] = [];
        let length = this.notes.length
        for (let i = 0; i < length; i++) {
            if (id !== 'note_' + i) {
                copy.push(this.notes[i]);
            }
        }
        this.notes = copy;
    }
}

new Notes();