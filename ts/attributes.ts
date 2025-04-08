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

class Attributes {

    electron = require('electron');

    currentId: string;
    currentType: string;

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        this.electron.ipcRenderer.send('get-file-languages');
        this.electron.ipcRenderer.on('file-languages', (event: Electron.IpcRendererEvent, arg: Language[]) => {
            this.filterLanguages(arg);
        });
        this.electron.ipcRenderer.on('set-unit-attributes', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setUnitAttributes(arg);
        });
        document.getElementById('saveAttributes').addEventListener('click', () => {
            this.saveAttributes();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.saveAttributes();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-attributes');
            }
        });
        this.electron.ipcRenderer.send('attributes-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    setUnitAttributes(arg: any): void {
        this.currentId = arg.id;
        this.currentType = arg.type;
        document.getElementById('title').innerHTML = this.currentType + ' Attributes';

        let attributes: Array<string[]> = arg.atts;
        for (let pair of attributes) {
            if (pair[0] === 'xml:lang' || pair[0] === 'lang') {
                continue;
            }
            if (pair[0] === 'segtype') {
                (document.getElementById('segtype') as HTMLSelectElement).value = pair[1];
            } else if (pair[0] === 'srclang') {
                (document.getElementById('srclang') as HTMLSelectElement).value = pair[1];
            } else {
                (document.getElementById(pair[0]) as HTMLInputElement).value = pair[1];
            }
        }

        if (this.currentType !== 'TU') {
            (document.getElementById('topRow') as HTMLTableRowElement).style.display = 'none';
        }
        this.electron.ipcRenderer.send('attributes-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    filterLanguages(langs: Language[]): void {
        let language: HTMLSelectElement = document.getElementById('srclang') as HTMLSelectElement;
        let options: string = '<option value=""></option><option value="*all*">*all*</option>';
        for (let lang of langs){
            options = options + '<option value="' + lang.code + '">' + lang.code + '</option>'
        }
        language.innerHTML = options;
        this.electron.ipcRenderer.send('get-unit-attributes');
    }

    saveAttributes(): void {
        let lang = this.currentType === 'TU' ? '' : this.currentType;
        let array: Array<string[]> = [];
        let oencoding = (document.getElementById('o-encoding') as HTMLInputElement).value;
        if (oencoding) {
            const pair: string[] = ['o-encoding', oencoding];
            array.push(pair);
        }
        let datatype = (document.getElementById('datatype') as HTMLInputElement).value;
        if (datatype) {
            const pair: string[] = ['datatype', datatype];
            array.push(pair);
        }
        let usagecount = (document.getElementById('usagecount') as HTMLInputElement).value;
        if (usagecount) {
            const pair: string[] = ['usagecount', usagecount];
            array.push(pair);
        }
        let lastusagedate = (document.getElementById('lastusagedate') as HTMLInputElement).value;
        if (lastusagedate) {
            const pair: string[] = ['lastusagedate', lastusagedate];
            array.push(pair);
        }
        let creationtool = (document.getElementById('creationtool') as HTMLInputElement).value;
        if (creationtool) {
            const pair: string[] = ['creationtool', creationtool];
            array.push(pair);
        }
        let creationtoolversion = (document.getElementById('creationtoolversion') as HTMLInputElement).value;
        if (creationtoolversion) {
            const pair: string[] = ['creationtoolversion', creationtoolversion];
            array.push(pair);
        }
        let creationdate = (document.getElementById('creationdate') as HTMLInputElement).value;
        if (creationdate) {
            const pair: string[] = ['creationdate', creationdate];
            array.push(pair);
        }
        let creationid = (document.getElementById('creationid') as HTMLInputElement).value;
        if (creationid) {
            const pair: string[] = ['creationid', creationid];
            array.push(pair);
        }
        let changedate = (document.getElementById('changedate') as HTMLInputElement).value;
        if (changedate) {
            const pair: string[] = ['changedate', changedate];
            array.push(pair);
        }
        let segtype = (document.getElementById('segtype') as HTMLSelectElement).value;
        if (segtype) {
            const pair: string[] = ['segtype', segtype];
            array.push(pair);
        }
        let changeid = (document.getElementById('changeid') as HTMLInputElement).value;
        if (changeid) {
            const pair: string[] = ['changeid', changeid];
            array.push(pair);
        }
        let otmf = (document.getElementById('o-tmf') as HTMLInputElement).value;
        if (otmf) {
            const pair: string[] = ['o-tmf', otmf];
            array.push(pair);
        }
        let srclang = (document.getElementById('srclang') as HTMLSelectElement).value;
        if (srclang) {
            const pair: string[] = ['srclang', srclang];
            array.push(pair);
        }
        let tuid = (document.getElementById('tuid') as HTMLInputElement).value;
        if (tuid) {
            const pair: string[] = ['tuid', tuid];
            array.push(pair);
        }

        if (lang) {
            const pair: string[] = ['xml:lang', lang];
            array.push(pair);
        }

        let arg = {
            id: this.currentId,
            lang: lang,
            attributes: array
        }
        this.electron.ipcRenderer.send('save-attributes', arg);
    }
}
