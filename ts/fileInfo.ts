/*******************************************************************************
 * Copyright (c) 2018-2021 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

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
        document.getElementById('atributesTab').classList.add('selectedTab');
        document.getElementById('attributes').classList.remove('hidden');
        document.getElementById('attributes').classList.add('tabContent');

        document.getElementById('propertiesTab').classList.remove('selectedTab');
        document.getElementById('properties').classList.remove('tabContent');
        document.getElementById('properties').classList.add('hidden');

        document.getElementById('notesTab').classList.remove('selectedTab');
        document.getElementById('notes').classList.remove('tabContent');
        document.getElementById('notes').classList.add('hidden');
    }

    showProperties(): void {
        document.getElementById('propertiesTab').classList.add('selectedTab');
        document.getElementById('properties').classList.remove('hidden');
        document.getElementById('properties').classList.add('tabContent');

        document.getElementById('atributesTab').classList.remove('selectedTab');
        document.getElementById('attributes').classList.remove('tabContent');
        document.getElementById('attributes').classList.add('hidden');

        document.getElementById('notesTab').classList.remove('selectedTab');
        document.getElementById('notes').classList.remove('tabContent');
        document.getElementById('notes').classList.add('hidden');
    }

    showNotes(): void {
        document.getElementById('notesTab').classList.add('selectedTab');
        document.getElementById('notes').classList.add('tabContent');
        document.getElementById('notes').classList.remove('hidden');

        document.getElementById('propertiesTab').classList.remove('selectedTab');
        document.getElementById('properties').classList.remove('tabContent');
        document.getElementById('properties').classList.add('hidden');

        document.getElementById('atributesTab').classList.remove('selectedTab');
        document.getElementById('attributes').classList.remove('tabContent');
        document.getElementById('attributes').classList.add('hidden');
    }
}

new FileInfo();