/*******************************************************************************
 * Copyright (c) 2018-2024 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

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
        this.electron.ipcRenderer.on('set-new-note', (event: Electron.IpcRendererEvent, note: string) => {
            this.notes.push(note);
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
        this.electron.ipcRenderer.send('notes-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    drawNotes(): void {
        let rows: string = '';
        let length = this.notes.length
        for (let i = 0; i < length; i++) {
            let note = this.notes[i];
            rows = rows + '<tr id="note_' + i + '"><td><input type="checkbox" class="middle"></td><td class="middle fill_width">' + note + '</td></tr>';
        }
        document.getElementById('notesTable').innerHTML = rows;
    }

    saveNotes(): void {
        let lang = this.currentType === 'TU' ? '' : this.currentType;
        let arg = {
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
        let collection: HTMLCollectionOf<Element> = document.getElementsByClassName('rowCheck');
        for (let check of collection) {
            if ((check as HTMLInputElement).checked) {
                this.removeNote(check.parentElement.parentElement.id);
            }
        }
        this.drawNotes();
        (document.getElementById('save') as HTMLButtonElement).focus();
    }

    removeNote(id: string): void {
        let copy: string[] = [];
        let length = this.notes.length
        for (let i = 0; i < length; i++) {
            if (id !== 'note_' + i) {
                copy.push(this.notes[i]);
            }
        }
        this.notes = copy;
    }
}
