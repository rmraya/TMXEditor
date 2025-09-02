/*******************************************************************************
 * Copyright (c) 2018-2025 Maxprograms.
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
    removeNotesText: string = '';

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        this.electron.ipcRenderer.send('get-unit-notes');
        this.electron.ipcRenderer.on('set-unit-notes', (event: Electron.IpcRendererEvent, arg: any) => {
            this.currentId = arg.id;
            this.currentType = arg.type;
            this.notes = arg.notes;
            this.removeNotesText = arg.removeText;
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
        let table: HTMLTableElement = document.getElementById('notesTable') as HTMLTableElement;
        table.innerHTML = '';
        let length = this.notes.length
        for (let i = 0; i < length; i++) {
            let tr: HTMLTableRowElement = document.createElement('tr');
            table.appendChild(tr);
            let td: HTMLTableCellElement = document.createElement('td');
            td.classList.add('middle');
            tr.appendChild(td);
            let remove: HTMLAnchorElement = document.createElement('a');
            remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" style="margin-top:4px"><path d="m400-325 80-80 80 80 51-51-80-80 80-80-51-51-80 80-80-80-51 51 80 80-80 80 51 51Zm-88 181q-29.7 0-50.85-21.15Q240-186.3 240-216v-480h-48v-72h192v-48h192v48h192v72h-48v479.57Q720-186 698.85-165T648-144H312Zm336-552H312v480h336v-480Zm-336 0v480-480Z"/></svg>' +
                '<span class="tooltiptext bottomTooltip">' + this.removeNotesText
                + '</span>';
            remove.classList.add('tooltip');
            remove.classList.add('bottomTooltip');
            remove.addEventListener('click', () => {
                this.deleteNotes(i);
            });
            td.appendChild(remove);
            td = document.createElement('td');
            td.classList.add('middle');
            td.classList.add('noWrap');
            td.classList.add('fill_width');
            td.innerText = this.notes[i];
            tr.appendChild(td);
        }
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

    deleteNotes(i: number): void {
        this.notes.splice(i, 1);
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
