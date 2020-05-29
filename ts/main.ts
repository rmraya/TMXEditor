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

class Main {

    electron = require('electron');

    languages: any;
    isLoaded: boolean = false;

    currentPage: number = 0;
    maxPage: number = 0;
    unitsPage: number = 200;
    unitsCount: number;

    attributes: Array<string[]>;
    attributesType: string;
    properties: Array<string[]>;
    notes: string[];

    currentId: string = null;
    currentLang: string = null;
    currentCell: Element = null;
    currentContent: string = null;
    currentTags: string[] = [];
    selectedUnits: string[] = [];
    textArea: HTMLTextAreaElement = null;

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event, arg) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.on('save-edit', () => {
            this.saveEdit();
        });
        this.electron.ipcRenderer.on('data-saved', (event, arg) => {
            this.dataSaved(arg);
        });
        this.electron.ipcRenderer.on('cancel-edit', () => {
            this.cancelEdit();
        });
        this.electron.ipcRenderer.on('request-delete', () => {
            this.deleteUnits();
        });
        this.electron.ipcRenderer.on('sort-on', () => {
            document.getElementById('sortUnits').classList.add('active');
        });
        this.electron.ipcRenderer.on('sort-off', () => {
            document.getElementById('sortUnits').classList.remove('active');
        });
        this.electron.ipcRenderer.on('filters-on', () => {
            document.getElementById('filterUnits').classList.add('active');
        });
        this.electron.ipcRenderer.on('filters-off', () => {
            document.getElementById('filterUnits').classList.remove('active');
        });
        this.electron.ipcRenderer.on('start-waiting', () => {
            document.getElementById('body').classList.add("wait");
        });
        this.electron.ipcRenderer.on('end-waiting', () => {
            document.getElementById('body').classList.remove("wait");
        });
        this.electron.ipcRenderer.on('set-status', (event, arg) => {
            this.setStatus(arg);
        });
        this.electron.ipcRenderer.on('status-changed', (event, arg) => {
            this.statusChanged(arg);
        });
        this.electron.ipcRenderer.on('update-languages', (event, arg) => {
            this.updateLanguages(arg);
        });
        this.electron.ipcRenderer.on('file-loaded', (event, arg) => {
            this.fileLoaded(arg);
        });
        this.electron.ipcRenderer.on('file-closed', () => {
            this.fileClosed();
        });
        this.electron.ipcRenderer.on('update-segments', (event, arg) => {
            this.updateSegments(arg);
        });
        this.electron.ipcRenderer.on('update-properties', (event, arg) => {
            this.updateProperties(arg);
        });
        this.electron.ipcRenderer.on('set-first-page', () => {
            this.setFirstPage();
        });
        this.electron.ipcRenderer.on('first-page', () => {
            this.firstPage();
        });
        this.electron.ipcRenderer.on('previous-page', () => {
            this.previousPage();
        });
        this.electron.ipcRenderer.on('next-page', () => {
            this.nextPage();
        });
        this.electron.ipcRenderer.on('last-page', () => {
            this.lastPage();
        });
        (document.getElementById('units_page') as HTMLInputElement).addEventListener('keydown', (ev: KeyboardEvent) => {
            this.setUnitsPage(ev);
        });
        (document.getElementById('page') as HTMLInputElement).addEventListener('keydown', (ev: KeyboardEvent) => {
            this.setPage(ev);
        });
        this.electron.ipcRenderer.on('unit-inserted', (event, arg) => {
            this.unitInserted(arg);
        });
        document.getElementById('openFile').addEventListener('click', () => {
            this.openFile();
        });
        document.getElementById('newFile').addEventListener('click', () => {
            this.newFile();
        });
        document.getElementById('saveFile').addEventListener('click', () => {
            this.saveFile();
        });
        document.getElementById('showFileInfo').addEventListener('click', () => {
            this.showFileInfo();
        });
        document.getElementById('saveEdit').addEventListener('click', () => {
            this.saveEdit();
        });
        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.cancelEdit();
        });
        document.getElementById('replaceText').addEventListener('click', () => {
            this.replaceText();
        });
        document.getElementById('insertUnit').addEventListener('click', () => {
            this.insertUnit();
        });
        document.getElementById('deleteUnits').addEventListener('click', () => {
            this.deleteUnits();
        });
        document.getElementById('sortUnits').addEventListener('click', () => {
            this.sortUnits();
        });
        document.getElementById('filterUnits').addEventListener('click', () => {
            this.filterUnits();
        });
        document.getElementById('convertCSV').addEventListener('click', () => {
            this.convertCSV();
        });
        document.getElementById('openHelp').addEventListener('click', () => {
            this.openHelp();
        });
        document.getElementById('selectAll').addEventListener('click', () => {
            this.toggleSelectAll();
        });
        document.getElementById('editAttributes').addEventListener('click', () => {
            this.editAttributes();
        });
        document.getElementById('editProperties').addEventListener('click', () => {
            this.editProperties();
        });
        document.getElementById('editNotes').addEventListener('click', () => {
            this.editNotes();
        });
        document.getElementById('first').addEventListener('click', () => {
            this.firstPage();
        });
        document.getElementById('previous').addEventListener('click', () => {
            this.previousPage();
        });
        document.getElementById('next').addEventListener('click', () => {
            this.nextPage();
        });
        document.getElementById('last').addEventListener('click', () => {
            this.lastPage();
        });
    }

    openFile(): void {
        this.electron.ipcRenderer.send('open-file');
    }

    newFile(): void {
        this.electron.ipcRenderer.send('new-file');
    }

    saveFile(): void {
        this.electron.ipcRenderer.send('save-file');
    }

    showFileInfo(): void {
        this.electron.ipcRenderer.send('show-file-info');
    }

    saveEdit(): void {
        if (!this.isLoaded) {
            return;
        }
        if (this.textArea !== null) {
            if (this.currentContent === this.textArea.value) {
                this.cancelEdit();
                return;
            }
            let edited: string = this.restoretags(this.textArea.value, this.currentTags);
            this.currentCell.innerHTML = edited;
            this.electron.ipcRenderer.send('save-data', { id: this.currentId, lang: this.currentLang, data: edited });
        }
    }

    dataSaved(arg: any): void {
        var tr: HTMLElement = document.getElementById(arg.id);
        var children: HTMLCollection = tr.children;
        let length: number = children.length;
        for (let i = 0; i < length; i++) {
            var td: HTMLElement = children.item(i) as HTMLElement;
            if (td.lang === arg.lang) {
                td.innerHTML = arg.data;
                break;
            }
        }
    }

    cancelEdit(): void {
        if (!this.isLoaded) {
            return;
        }
        this.currentCell.innerHTML = this.currentContent;
        this.textArea = null;
    }

    replaceText(): void {
        this.electron.ipcRenderer.send('replace-text');
    }

    insertUnit(): void {
        this.electron.ipcRenderer.send('insert-unit');
    }

    deleteUnits(): void {
        this.getSelected();
        this.electron.ipcRenderer.send('delete-units', this.selectedUnits);
    }

    getSelected(): void {
        this.selectedUnits = [];
        var collection: HTMLCollection = document.getElementsByClassName('rowCheck');
        let length: number = collection.length
        for (let i = 0; i < length; i++) {
            var check = collection[i] as HTMLInputElement;
            if (check.checked) {
                this.selectedUnits.push(check.parentElement.parentElement.id);
            }
        }
    }

    sortUnits(): void {
        this.electron.ipcRenderer.send('sort-units');
    }

    filterUnits(): void {
        this.electron.ipcRenderer.send('filter-units');
    }

    convertCSV(): void {
        this.electron.ipcRenderer.send('convert-csv');
    }

    openHelp(): void {
        this.electron.ipcRenderer.send('show-help');
    }

    editAttributes(): void {
        if (!this.isLoaded) {
            return;
        }
        if (this.currentId === null || this.currentId === '') {
            return;
        }
        this.electron.ipcRenderer.send('edit-attributes', { id: this.currentId, atts: this.attributes, type: this.attributesType });
    }

    editProperties(): void {
        if (!this.isLoaded) {
            return;
        }
        if (this.currentId === null || this.currentId === '') {
            return;
        }
        this.electron.ipcRenderer.send('edit-properties', { id: this.currentId, props: this.properties, type: this.attributesType });
    }

    editNotes(): void {
        if (!this.isLoaded) {
            return;
        }
        if (this.currentId === null || this.currentId === '') {
            return;
        }
        this.electron.ipcRenderer.send('edit-notes', { id: this.currentId, notes: this.notes, type: this.attributesType });
    }

    setStatus(arg: any): void {
        var status: HTMLDivElement = document.getElementById('status') as HTMLDivElement;
        status.innerHTML = arg;
        if (arg.length > 0) {
            status.style.display = 'block';
        } else {
            status.style.display = 'none';
        }
    }

    statusChanged(arg: any): void {
        if (arg.status === 'Success') {
            if (arg.count != undefined) {
                document.getElementById('units').innerText = arg.count;
                this.maxPage = Math.ceil(arg.count / this.unitsPage);
                document.getElementById('pages').innerText = '' + this.maxPage;
            }
        }
    }

    updateLanguages(arg: any): void {
        this.languages = arg;
        var row = '<tr  class="dark_background"><th class="dark_background fixed"><input type="checkbox" id="selectAll" onclick="toggleSelectAll()"></th><th class="dark_background fixed">#</th>';
        let length: number = this.languages.length;
        for (let index = 0; index < length; ++index) {
            row = row + '<th class="dark_background">' + this.languages[index].code + ' - ' + arg[index].name + '</th>';
        }

        document.getElementById('tableHeader').innerHTML = row + '</tr>';
    }

    fileLoaded(arg: any): void {
        if (arg.count != undefined) {
            this.unitsCount = arg.count;
            document.getElementById('units').innerText = '' + this.unitsCount;
            this.maxPage = Math.ceil(this.unitsCount / this.unitsPage);
            document.getElementById('pages').innerText = '' + this.maxPage;
        }
        document.getElementById('filterUnits').classList.remove('active');
        document.getElementById('sortUnits').classList.remove('active');
        this.isLoaded = true;
        this.firstPage();
    }

    fileClosed(): void {
        document.getElementById("tableBody").innerHTML = '';
        document.getElementById("tableHeader").innerHTML = '<tr class="dark_background"><th class="fixed dark_background"><input type="checkbox" id="selectAll"></th><th class="fixed dark_background">#</th><th class="dark_background">&nbsp;</th><th class="dark_background">&nbsp;</th></tr>';
        (document.getElementById('page') as HTMLInputElement).value = '0';
        document.getElementById('pages').innerHTML = '0';
        document.getElementById('units').innerHTML = '';
        document.getElementById('attributesTable').innerHTML = '';
        document.getElementById('attributesSpan').innerHTML = 'TU';
        document.getElementById('propertiesTable').innerHTML = '';
        document.getElementById('propertiesSpan').innerHTML = 'TU';
        document.getElementById('notesTable').innerHTML = '';
        document.getElementById('notesSpan').innerHTML = 'TU';
        document.getElementById('filterUnits').classList.remove('active');
        document.getElementById('sortUnits').classList.remove('active');
        this.currentPage = 0;
        this.maxPage = 0;
        this.isLoaded = false;

        this.currentId = null;
        this.currentLang = null;
        this.currentCell = null;
        this.currentContent = null;
        this.currentTags = [];
        this.selectedUnits = [];
        this.textArea = null;
    }

    updateSegments(arg: any): void {
        this.setStatus('Preparing...');
        var rows: string = '';
        let length: number = arg.units.length;
        for (let i = 0; i < length; i++) {
            rows = rows + arg.units[i];
        }
        document.getElementById("tableBody").innerHTML = rows;
        var cells = document.getElementsByClassName('lang');
        length = cells.length;
        for (let i = 0; i < length; i++) {
            cells[i].addEventListener('click', (ev: MouseEvent) => this.clickListener(ev));
        }
        var fixed = document.getElementsByClassName('fixed');
        length = fixed.length;
        for (let i = 0; i < length; i++) {
            fixed[i].addEventListener('click', (ev: MouseEvent) => this.fixedListener(ev));
        }
        document.getElementById('attributesTable').innerHTML = '';
        document.getElementById('attributesSpan').innerHTML = 'TU';
        document.getElementById('propertiesTable').innerHTML = '';
        document.getElementById('propertiesSpan').innerHTML = 'TU';
        document.getElementById('notesTable').innerHTML = '';
        document.getElementById('notesSpan').innerHTML = 'TU';
        this.currentId = null;
        this.setStatus('');
    }

    fixedListener(event: MouseEvent): void {
        if (!this.isLoaded) {
            return;
        }
        var element: Element = (event.target as Element);
        if (element.parentElement.tagName === 'TH') {
            // clicked header
            return;
        }
        var x: string = element.tagName;
        var id: string;
        var lang: string;
        if ('TD' === x || 'INPUT' === x) {
            var composed = event.composedPath();
            if ('TR' === (composed[0] as Element).tagName) {
                id = (composed[0] as Element).id;
            } else if ('TR' === (composed[1] as Element).tagName) {
                id = (composed[1] as Element).id;
            } else if ('TR' === (composed[2] as Element).tagName) {
                id = (composed[2] as Element).id;
            }
            lang = (event.target as Element).getAttribute('lang');
        }
        if (this.textArea !== null && (this.currentId !== id || this.currentLang !== lang)) {
            this.saveEdit();
        }

        if (id) {
            this.currentId = id;
            if (this.currentCell != null) {
                this.currentCell = null;
                this.currentContent = null;
            }
            this.electron.ipcRenderer.send('get-row-properties', { id: this.currentId });
        }
    }

    clickListener(event: MouseEvent): void {
        if (!this.isLoaded) {
            return;
        }
        var element: Element = (event.target as Element);
        if (element.parentElement.tagName === 'TH') {
            // clicked header
            return;
        }
        var x: string = element.tagName;
        if ('TEXTAREA' === x) {
            // already editing
            return;
        }
        var id: string;
        var lang: string;
        if ('TD' === x || 'INPUT' === x) {
            var composed = event.composedPath();
            if ('TR' === (composed[0] as Element).tagName) {
                id = (composed[0] as Element).id;
            } else if ('TR' === (composed[1] as Element).tagName) {
                id = (composed[1] as Element).id;
            } else if ('TR' === (composed[2] as Element).tagName) {
                id = (composed[2] as Element).id;
            }
            lang = (event.target as Element).getAttribute('lang');
        }
        if (this.textArea !== null && (this.currentId !== id || this.currentLang !== lang)) {
            this.saveEdit();
        }

        if (id) {
            this.currentId = id;
            if (this.currentCell) {
                this.currentCell = null;
                this.currentContent = null;
            }
            if (lang) {
                this.currentLang = lang;
                this.currentCell = (event.target as Element);
                this.currentContent = this.currentCell.innerHTML;
                this.textArea = document.createElement('textarea');
                this.textArea.setAttribute('style', 'height: ' + (this.currentCell.clientHeight - 8) + 'px; width: ' + (this.currentCell.clientWidth - 8) + 'px;')
                this.textArea.innerHTML = this.cleanTags(this.currentContent);
                this.currentCell.innerHTML = '';
                this.currentCell.parentElement.style.padding = '0px';
                this.currentCell.appendChild(this.textArea);
                this.textArea.focus();
                this.electron.ipcRenderer.send('get-cell-properties', { id: this.currentId, lang: this.currentLang });
            }
        }
    }

    updateProperties(arg: any): void {
        this.attributesType = arg.type;
        document.getElementById('attributesSpan').innerHTML = this.attributesType;
        var table = document.getElementById('attributesTable');
        table.innerHTML = '';
        this.attributes = arg.attributes;
        let length: number = this.attributes.length;
        for (let i = 0; i < length; i++) {
            let pair = this.attributes[i];
            let tr = document.createElement('tr');
            table.appendChild(tr);
            let left = document.createElement('td');
            left.style.whiteSpace = 'nowrap';
            left.textContent = pair[0];
            tr.appendChild(left);
            let right = document.createElement('td');
            right.textContent = pair[1];
            right.className = 'noWrap';
            tr.appendChild(right);
        }

        document.getElementById('propertiesSpan').innerHTML = arg.type;
        table = document.getElementById('propertiesTable');
        table.innerHTML = '';
        this.properties = arg.properties;
        length = this.properties.length
        for (let i = 0; i < length; i++) {
            let pair = this.properties[i];
            let tr = document.createElement('tr');
            table.appendChild(tr);
            let left = document.createElement('td');
            left.textContent = pair[0];
            left.style.whiteSpace = 'nowrap';
            tr.appendChild(left);
            let right = document.createElement('td');
            right.textContent = pair[1];
            right.className = 'noWrap';
            tr.appendChild(right);
        }

        document.getElementById('notesSpan').innerHTML = arg.type;
        table = document.getElementById('notesTable');
        table.innerHTML = '';
        this.notes = arg.notes;
        length = this.notes.length;
        for (let i = 0; i < length; i++) {
            let tr = document.createElement('tr');
            table.appendChild(tr);
            let n = document.createElement('td');
            n.textContent = this.notes[i];
            n.className = 'noWrap';
            tr.appendChild(n);
        }
    }

    getSegments(): void {
        this.electron.ipcRenderer.send('get-segments', {
            start: this.currentPage * this.unitsPage,
            count: this.unitsPage
        });
    }

    setFirstPage(): void {
        this.currentPage = 0;
        (document.getElementById('page') as HTMLInputElement).value = '1';
    }

    firstPage(): void {
        this.currentPage = 0;
        (document.getElementById('page') as HTMLInputElement).value = '1';
        this.getSegments();
    }

    previousPage(): void {
        if (this.currentPage > 0) {
            this.currentPage--;
            (document.getElementById('page') as HTMLInputElement).value = '' + (this.currentPage + 1);
            this.getSegments();
        }
    }

    nextPage(): void {
        if (this.currentPage < this.maxPage - 1) {
            this.currentPage++;
            (document.getElementById('page') as HTMLInputElement).value = '' + (this.currentPage + 1);
            this.getSegments();
        }
    }

    lastPage(): void {
        this.currentPage = this.maxPage - 1;
        (document.getElementById('page') as HTMLInputElement).value = '' + this.maxPage;
        this.getSegments();
    }

    setUnitsPage(ev: KeyboardEvent): void {
        if (!this.isLoaded) {
            return;
        }
        if (ev.keyCode == 13) {
            this.unitsPage = Number.parseInt((document.getElementById('units_page') as HTMLInputElement).value);
            if (this.unitsPage < 1) {
                this.unitsPage = 1;
            }
            if (this.unitsPage > this.unitsCount) {
                this.unitsPage = this.unitsCount;
            }
            (document.getElementById('units_page') as HTMLInputElement).value = '' + this.unitsPage;
            this.maxPage = Math.ceil(this.unitsCount / this.unitsPage);
            document.getElementById('pages').innerText = '' + this.maxPage;
            this.firstPage();
        }
    }

    setPage(ev: KeyboardEvent): void {
        if (!this.isLoaded) {
            return;
        }
        if (ev.keyCode == 13) {
            this.currentPage = Number.parseInt((document.getElementById('page') as HTMLInputElement).value) - 1;
            if (this.currentPage < 0) {
                this.currentPage = 0;
            }
            if (this.currentPage > this.maxPage - 1) {
                this.currentPage = this.maxPage - 1;
            }
            (document.getElementById('page') as HTMLInputElement).value = '' + (this.currentPage + 1);
            this.getSegments();
        }
    }

    cleanTags(unit: string): string {
        var index: number = unit.indexOf('<img ');
        var tagNumber: number = 1;
        this.currentTags = [];
        while (index >= 0) {
            let start: string = unit.slice(0, index);
            let rest: string = unit.slice(index + 1);
            let end: number = rest.indexOf('>');
            let tag: string = '<' + rest.slice(0, end) + '/>';
            this.currentTags.push(tag);
            unit = start + '[[' + tagNumber++ + ']]' + rest.slice(end + 1);
            index = unit.indexOf('<img ');
        }
        index = unit.indexOf('<span');
        while (index >= 0) {
            let start: string = unit.slice(0, index);
            let rest: string = unit.slice(index + 1);
            let end: number = rest.indexOf('>');
            unit = start + rest.slice(end + 1);
            index = unit.indexOf('<span');
        }
        index = unit.indexOf('</span>');
        while (index >= 0) {
            unit = unit.replace('</span>', '');
            index = unit.indexOf('</span>');
        }
        return unit;
    }

    restoretags(text: string, originalTags: string[]): string {
        let length: number = originalTags.length;
        for (let i: number = 0; i < length; i++) {
            text = text.replace('[[' + (i + 1) + ']]', originalTags[i]);
        }
        return text;
    }

    toggleSelectAll(): void {
        if (!this.isLoaded) {
            return;
        }
        var selectAll = (document.getElementById('selectAll') as HTMLInputElement);
        var collection: HTMLCollection = document.getElementsByClassName('rowCheck');
        let length: number = collection.length;
        for (let i = 0; i < length; i++) {
            var check = collection[i] as HTMLInputElement;
            check.checked = selectAll.checked;
        }
    }

    unitInserted(arg: any): void {
        var tr: string = '<tr id="' + arg + '"><td class="fixed"><input type="checkbox" class="rowCheck"></td><td class="fixed">0</td>';
        let length: number = this.languages.length;
        for (let index = 0; index < length; ++index) {
            tr = tr + '<td lang="' + this.languages[index].code + '"></td>';
        }
        tr = tr + '</tr>';
        document.getElementById("tableBody").innerHTML = tr + document.getElementById("tableBody").innerHTML;
    }
}

new Main();