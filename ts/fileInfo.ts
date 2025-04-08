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

class FileInfo {

    electron = require('electron');
    adminLang: string = '';
    properties: Array<string[]>;
    notes: string[];
    notesChecks: HTMLInputElement[];

    removePropertiesText: string = '';
    removeNotesText: string = '';

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        this.electron.ipcRenderer.send('file-properties');
        this.electron.ipcRenderer.on('set-file-properties', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setFileProperties(arg);
        });
        this.electron.ipcRenderer.on('languages-list', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.setAdminLanguages(arg);
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
        document.getElementById('saveAttributes').addEventListener('click', () => {
            this.saveAttributes();
        });
        document.getElementById('addProperty').addEventListener('click', () => {
            this.electron.ipcRenderer.send('show-add-property', 'fileInfo');
        });
        this.electron.ipcRenderer.on('set-new-property', (event: Electron.IpcRendererEvent, arg: any) => {
            let prop: string[] = [arg.type, arg.value];
            this.properties.push(prop);
            this.drawProperties();
        });
        document.getElementById('saveProperties').addEventListener('click', () => {
            this.saveProperties();
        });
        document.getElementById('addNote').addEventListener('click', () => {
            this.electron.ipcRenderer.send('show-add-note', 'fileInfo');
        });
        this.electron.ipcRenderer.on('set-new-note', (event: Electron.IpcRendererEvent, note: string) => {
            this.notes.push(note);
            this.drawNotes();
        });
        document.getElementById('saveNotes').addEventListener('click', () => {
            this.saveNotes();
        });
    }

    setAdminLanguages(langs: Language[]) {
        let adminLangSelect: HTMLSelectElement = document.getElementById('adminlang') as HTMLSelectElement;
        adminLangSelect.innerHTML = '';
        for (let lang of langs) {
            let option: HTMLOptionElement = document.createElement('option');
            option.value = lang.code;
            option.text = lang.name;
            adminLangSelect.appendChild(option);
        }
        adminLangSelect.value = this.adminLang;

        setTimeout(() => {
            this.electron.ipcRenderer.send('fileInfo-height', { width: document.body.clientWidth, height: document.body.clientHeight });
            document.getElementById('properties').style.height = document.getElementById('attributes').clientHeight + 'px';
            document.getElementById('notes').style.height = document.getElementById('attributes').clientHeight + 'px';
            document.getElementById('attributes').style.height = document.getElementById('attributes').clientHeight + 'px';
        }, 150);
    }

    setFileProperties(arg: { attributes: any, fileLanguages: Language[], properties: Array<string[]>, notes: string[], removeProperties: string, removeNotes: string }): void {
        this.removePropertiesText = arg.removeProperties;
        this.removeNotesText = arg.removeNotes;
        let srcLangSelect: HTMLSelectElement = document.getElementById('srclang') as HTMLSelectElement;
        srcLangSelect.innerHTML = '';
        let srcLangs: Language[] = arg.fileLanguages;
        for (let lang of srcLangs) {
            let option: HTMLOptionElement = document.createElement('option');
            option.value = lang.code;
            option.text = lang.name;
            srcLangSelect.appendChild(option);
        }
        srcLangSelect.value = arg.attributes.srclang;
        this.adminLang = arg.attributes.adminlang

        this.electron.ipcRenderer.send('all-languages');

        (document.getElementById('creationid') as HTMLInputElement).value = arg.attributes.creationid;
        (document.getElementById('creationdate') as HTMLInputElement).value = arg.attributes.creationdate;
        (document.getElementById('creationtool') as HTMLInputElement).value = arg.attributes.creationtool;
        (document.getElementById('creationtoolversion') as HTMLInputElement).value = arg.attributes.creationtoolversion;
        (document.getElementById('segtype') as HTMLSelectElement).value = arg.attributes.segtype;
        (document.getElementById('o-tmf') as HTMLInputElement).value = arg.attributes.o_tmf;
        (document.getElementById('datatype') as HTMLInputElement).value = arg.attributes.datatype;
        (document.getElementById('changedate') as HTMLInputElement).value = arg.attributes.changedate;
        (document.getElementById('changeid') as HTMLInputElement).value = arg.attributes.changeid;
        (document.getElementById('o-encoding') as HTMLInputElement).value = arg.attributes.o_encoding;

        this.properties = arg.properties;
        this.drawProperties();

        this.notes = arg.notes;
        this.drawNotes();
    }

    drawProperties(): void {
        let propertiesTableBody: HTMLTableSectionElement = document.getElementById('propertiesBody') as HTMLTableSectionElement;
        propertiesTableBody.innerHTML = '';
        for (let pair of this.properties) {
            let tr: HTMLTableRowElement = document.createElement('tr');
            propertiesTableBody.appendChild(tr);
            let td: HTMLTableCellElement = document.createElement('td');
            td.classList.add('middle');
            tr.appendChild(td);
            let remove: HTMLAnchorElement = document.createElement('a');
            remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" style="margin-top:4px"><path d="m400-325 80-80 80 80 51-51-80-80 80-80-51-51-80 80-80-80-51 51 80 80-80 80 51 51Zm-88 181q-29.7 0-50.85-21.15Q240-186.3 240-216v-480h-48v-72h192v-48h192v48h192v72h-48v479.57Q720-186 698.85-165T648-144H312Zm336-552H312v480h336v-480Zm-336 0v480-480Z"/></svg>' +
                '<span class="tooltiptext bottomTooltip">' + this.removePropertiesText
                + '</span>';
            remove.classList.add('tooltip');
            remove.addEventListener('click', () => {
                this.deleteProperty(pair);
            });
            td.appendChild(remove);
            td = document.createElement('td');
            td.classList.add('middle');
            td.classList.add('noWrap');
            td.classList.add('leftBorder');
            td.innerHTML = pair[0];
            tr.appendChild(td);
            td = document.createElement('td');
            td.innerHTML = pair[1];
            td.classList.add('middle');
            td.classList.add('fill_width');
            td.classList.add('leftBorder');
            tr.appendChild(td);
        }
    }

    drawNotes() {
        let notesTableBody: HTMLTableSectionElement = document.getElementById('notesTable') as HTMLTableSectionElement;
        notesTableBody.innerHTML = '';
        this.notesChecks = [];
        for (let i: number = 0; i < this.notes.length; i++) {
            let tr: HTMLTableRowElement = document.createElement('tr');
            notesTableBody.appendChild(tr);
            let td: HTMLTableCellElement = document.createElement('td');
            td.classList.add('middle');
            tr.appendChild(td);
            let remove: HTMLAnchorElement = document.createElement('a');
            remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" style="margin-top:4px"><path d="m400-325 80-80 80 80 51-51-80-80 80-80-51-51-80 80-80-80-51 51 80 80-80 80 51 51Zm-88 181q-29.7 0-50.85-21.15Q240-186.3 240-216v-480h-48v-72h192v-48h192v48h192v72h-48v479.57Q720-186 698.85-165T648-144H312Zm336-552H312v480h336v-480Zm-336 0v480-480Z"/></svg>' +
                '<span class="tooltiptext bottomTooltip">' + this.removeNotesText
                + '</span>';
            remove.classList.add('tooltip');
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

        document.getElementById('attributesButtons').classList.add('buttonArea');
        document.getElementById('attributesButtons').classList.remove('hidden');

        document.getElementById('propButtons').classList.add('hidden');
        document.getElementById('propButtons').classList.remove('buttonArea');

        document.getElementById('notesButtons').classList.add('hidden');
        document.getElementById('notesButtons').classList.remove('buttonArea');
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

        document.getElementById('attributesButtons').classList.remove('buttonArea');
        document.getElementById('attributesButtons').classList.add('hidden');

        document.getElementById('propButtons').classList.remove('hidden');
        document.getElementById('propButtons').classList.add('buttonArea');

        document.getElementById('notesButtons').classList.add('hidden');
        document.getElementById('notesButtons').classList.remove('buttonArea');
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

        document.getElementById('attributesButtons').classList.remove('buttonArea');
        document.getElementById('attributesButtons').classList.add('hidden');

        document.getElementById('propButtons').classList.add('hidden');
        document.getElementById('propButtons').classList.remove('buttonArea');

        document.getElementById('notesButtons').classList.remove('hidden');
        document.getElementById('notesButtons').classList.add('buttonArea');
    }

    saveAttributes(): void {
        let creationid: string = (document.getElementById('creationid') as HTMLInputElement).value;
        let creationdate: string = (document.getElementById('creationdate') as HTMLInputElement).value;
        let creationtool: string = (document.getElementById('creationtool') as HTMLInputElement).value;
        let creationtoolversion: string = (document.getElementById('creationtoolversion') as HTMLInputElement).value;
        let changeid: string = (document.getElementById('changeid') as HTMLInputElement).value;
        let changedate: string = (document.getElementById('changedate') as HTMLInputElement).value;
        let segtype: string = (document.getElementById('segtype') as HTMLSelectElement).value;
        let o_tmf: string = (document.getElementById('o-tmf') as HTMLInputElement).value;
        let srclang: string = (document.getElementById('srclang') as HTMLSelectElement).value;
        let adminlang: string = (document.getElementById('adminlang') as HTMLSelectElement).value;
        let datatype: string = (document.getElementById('datatype') as HTMLInputElement).value;
        let o_encoding: string = (document.getElementById('o-encoding') as HTMLInputElement).value;

        // required: creationtool, creationtoolversion, segtype, o-tmf, adminlang, srclang, datatype.
        if (creationtool === '') {
            this.electron.ipcRenderer.send('show-message', { parent: 'fileInfo', group: 'fileInfo', key: 'creationtool' });
            return;
        }
        if (creationtoolversion === '') {
            this.electron.ipcRenderer.send('show-message', { parent: 'fileInfo', group: 'fileInfo', key: 'creationtoolversion' });
            return;
        }
        if (segtype === '') {
            this.electron.ipcRenderer.send('show-message', { parent: 'fileInfo', group: 'fileInfo', key: 'segtype' });
            return;
        }
        if (o_tmf === '') {
            this.electron.ipcRenderer.send('show-message', { parent: 'fileInfo', group: 'fileInfo', key: 'o-tmf' });
            return;
        }
        if (adminlang === '' || adminlang === 'none') {
            this.electron.ipcRenderer.send('show-message', { parent: 'fileInfo', group: 'fileInfo', key: 'adminlang' });
            return;
        }
        if (srclang === '') {
            this.electron.ipcRenderer.send('show-message', { parent: 'fileInfo', group: 'fileInfo', key: 'srclang' });
            return;
        }
        if (datatype === '') {
            this.electron.ipcRenderer.send('show-message', { parent: 'fileInfo', group: 'fileInfo', key: 'datatype' });
            return;
        }
        this.electron.ipcRenderer.send('save-file-attributes', {
            creationid: creationid,
            creationdate: creationdate,
            creationtool: creationtool,
            creationtoolversion: creationtoolversion,
            changeid: changeid,
            changedate: changedate,
            segtype: segtype,
            o_tmf: o_tmf,
            srclang: srclang,
            adminlang: adminlang,
            datatype: datatype,
            o_encoding: o_encoding
        });
    }

    deleteProperty(property: string[]): void {
        for (let pair of this.properties) {
            if (pair[0] === property[0] && pair[1] === property[1]) {
                this.properties.splice(this.properties.indexOf(pair), 1);
                break;
            }
        }
        this.drawProperties();
    }

    saveProperties(): void {
        this.electron.ipcRenderer.send('save-file-properties', this.properties);
    }

    deleteNotes(i: number): void {
        this.notes.splice(i, 1);
        this.drawNotes();
    }

    saveNotes(): void {
        this.electron.ipcRenderer.send('save-file-notes', this.notes);
    }
}
