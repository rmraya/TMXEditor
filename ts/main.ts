/*******************************************************************************
 * Copyright (c) 2018-2026 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { ipcRenderer } from "electron";
import { ThreeHorizontalPanels, VerticalSplit } from "./divider.js";
import { Language } from "./language.js";

export class Main {

    languages: Language[] = [];
    isLoaded: boolean = false;

    topBar: HTMLDivElement;
    mainPanel: HTMLDivElement;

    UNITSLOAD: number = 200;
    SAFETYUNITS: number = 40;
    AVERAGE: number = 0;
    unitsCount: number = 0;
    start: number = 0;
    count: number = this.UNITSLOAD;
    scroll: boolean = false;
    firstRow: number = 0;
    lastRow: number = this.UNITSLOAD - 1;

    fetchingData: boolean = false;
    fetchingTop: boolean = false;
    fetchingBottom: boolean = false;
    checkingScroll: boolean = false;

    scrollToFirst: boolean = false;
    scrollToLast: boolean = false;

    currentPage: number = 0;
    maxPage: number = 0;
    unitsPage: number = 500;

    attributes: Array<string[]> = [];
    attributesType: string | undefined;
    properties: Array<string[]> = [];
    notes: string[] = [];

    currentId: string | undefined;
    currentLang: string | undefined;
    currentCell: HTMLTableCellElement | undefined;
    currentContent: string | undefined;
    selectedUnits: string[] = [];
    lastClickedRow: HTMLTableRowElement | undefined;
    pendingEditId: string | undefined;
    pendingMatch: { id: string, lang: string, searchText: string, caseSensitive: boolean, useRegex: boolean } | undefined;
    lastMatchEnd: number = -1;

    static readonly EDIT: string = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M2.25 15.75H5.0625L13.3575 7.45502L10.545 4.64252L2.25 12.9375V15.75ZM3.75 13.56L10.545 6.76502L11.235 7.45502L4.44 14.25H3.75V13.56Z" />' +
        '<path d="M13.7775 2.46751C13.485 2.17501 13.0125 2.17501 12.72 2.46751L11.3475 3.84001L14.16 6.65251L15.5325 5.28001C15.825 4.98751 15.825 4.51501 15.5325 4.22251L13.7775 2.46751Z" />' +
        '</svg>';

    constructor() {

        this.topBar = document.getElementById('topBar') as HTMLDivElement;
        this.createTopToolbar();

        this.mainPanel = document.getElementById('mainPanel') as HTMLDivElement;
        this.mainPanel.classList.add('lighter');
        this.createCenterPanel();

        setTimeout(() => {
            this.resize();
        }, 200);

        window.addEventListener('resize', () => { this.resize(); });

        ipcRenderer.send('get-theme');
        ipcRenderer.on('request-theme', () => {
            ipcRenderer.send('get-theme');
        });
        ipcRenderer.send('get-tooltips');
        ipcRenderer.on('set-tooltips', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setTooltips(arg);
        });
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.on('save-edit', () => {
            this.saveEdit();
        });
        ipcRenderer.on('data-saved', (event: Electron.IpcRendererEvent, arg: any) => {
            this.dataSaved(arg);
        });
        ipcRenderer.on('cancel-edit', () => {
            this.cancelEdit();
        });
        ipcRenderer.on('request-delete', () => {
            this.deleteUnits();
        });
        ipcRenderer.on('sort-on', () => {
            (document.getElementById('sortUnits') as HTMLAnchorElement).classList.add('active');
        });
        ipcRenderer.on('sort-off', () => {
            (document.getElementById('sortUnits') as HTMLAnchorElement).classList.remove('active');
        });
        ipcRenderer.on('filters-on', () => {
            (document.getElementById('filterUnits') as HTMLAnchorElement).classList.add('active');
        });
        ipcRenderer.on('filters-off', () => {
            (document.getElementById('filterUnits') as HTMLAnchorElement).classList.remove('active');
        });
        ipcRenderer.on('start-waiting', () => {
            document.body.classList.add("wait");
        });
        ipcRenderer.on('end-waiting', () => {
            document.body.classList.remove("wait");
        });
        ipcRenderer.on('set-status', (event: Electron.IpcRendererEvent, value: string) => {
            this.setStatus(value);
        });
        ipcRenderer.on('status-changed', (event: Electron.IpcRendererEvent, count: number) => {
            (document.getElementById('units') as HTMLSpanElement).innerText = '' + count;
        });
        ipcRenderer.on('update-languages', (event: Electron.IpcRendererEvent, langs: Language[]) => {
            this.updateLanguages(langs);
        });
        ipcRenderer.on('file-loaded', (event: Electron.IpcRendererEvent, count: number) => {
            this.fileLoaded(count);
        });
        ipcRenderer.on('file-closed', () => {
            this.fileClosed();
        });
        ipcRenderer.on('segments-reset', (event: Electron.IpcRendererEvent, arg: { count: number, start: number }) => {
            this.segmentsReset(arg);
        });
        ipcRenderer.on('get-search-start', (event: Electron.IpcRendererEvent, args: { searchText: string, caseSensitive: boolean, useRegex: boolean }) => {
            if (this.continueMatchInCurrentCell(args)) {
                ipcRenderer.send('match-found-notification', true);
                return;
            }
            let position: number = 0;
            let langIndex: number = 0;
            if (this.currentId) {
                let tr: HTMLElement | null = document.getElementById(this.currentId);
                position = tr ? Number.parseInt(tr.getAttribute('data-position') || '0') : 0;
            }
            if (this.currentLang) {
                let idx: number = this.languages.findIndex((lang: Language) => lang.code === this.currentLang);
                if (idx >= 0) {
                    langIndex = idx;
                }
            }
            ipcRenderer.send('search-start', { searchText: args.searchText, caseSensitive: args.caseSensitive, useRegex: args.useRegex, position: position, langIndex: langIndex });
        });
        ipcRenderer.on('select-match', (event: Electron.IpcRendererEvent, data: { id: string, position: number, lang: string, searchText: string, caseSensitive: boolean, useRegex: boolean }) => {
            this.selectMatch(data);
        });
        ipcRenderer.on('replace-selected-text', (event: Electron.IpcRendererEvent, replaceText: string) => {
            this.replaceSelectedText(replaceText);
        });
        ipcRenderer.on('update-segments', (event: Electron.IpcRendererEvent, arg: any) => {
            this.updateSegments(arg);
        });
        ipcRenderer.on('update-properties', (event: Electron.IpcRendererEvent, arg: any) => {
            this.updateProperties(arg);
        });
        ipcRenderer.on('unit-inserted', (event: Electron.IpcRendererEvent, arg: { id: string, count: number }) => {
            this.unitInserted(arg);
        });
        ipcRenderer.on('force-save', () => {
            this.saveEdit();
        });
        ipcRenderer.on('query-edit-changed', () => {
            let changed: boolean = this.currentCell !== undefined && this.currentCell.innerHTML !== this.currentContent;
            ipcRenderer.send('edit-changed-response', changed);
        });
        ipcRenderer.on('edit-attributes', () => {
            this.editAttributes();
        });
        ipcRenderer.on('edit-properties', () => {
            this.editProperties();
        });
        ipcRenderer.on('edit-notes', () => {
            this.editNotes();
        });
    }

    resize(): void {
        let height: number = document.body.clientHeight;
        let width: number = document.body.clientWidth;

        this.mainPanel.style.height = (height - this.topBar.clientHeight) + 'px';
        this.mainPanel.style.width = width + 'px';
    }

    createTopToolbar(): void {
        let openFile: HTMLAnchorElement = document.createElement('a');
        openFile.classList.add('tooltip');
        openFile.classList.add('bottomTooltip');
        openFile.innerHTML = '<svg version="1.1" viewBox="0 0 24 24" height="24" width="24"><path  id="path299" d="m 20.0575,11.2 -1.154167,7.2 H 5.0966667 L 3.9425,11.2 Z M 8.6433333,4 h -5.81 l 0.595,4 H 5.1125 L 4.755,5.6 H 7.8333333 C 8.76,6.7104 9.46,7.2 11.3975,7.2 h 7.735833 L 18.966667,8 h 1.7 l 0.5,-2.4 H 11.3975 C 9.7491667,5.6 9.6966667,5.2664 8.6433333,4 Z M 22,9.6 H 2 L 3.6666667,20 H 20.333333 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip" id="open"></span>';
        openFile.addEventListener('click', () => {
            this.openFile();
        });
        this.topBar.appendChild(openFile);

        let newFile: HTMLAnchorElement = document.createElement('a');
        newFile.classList.add('tooltip');
        newFile.classList.add('bottomTooltip');
        newFile.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path  d="m 21,16.166667 h -2.454545 v -2.5 h -1.636364 v 2.5 h -2.454546 v 1.666666 h 2.454546 v 2.5 h 1.636364 v -2.5 H 21 Z m -5.727273,4.166666 V 22 H 3 V 2 h 8.336455 c 2.587909,0 8.027181,6.0191667 8.027181,8.011667 V 12 h -1.636363 v -1.285833 c 0,-3.4225003 -4.909091,-2.0475003 -4.909091,-2.0475003 0,0 1.242,-5 -2.158364,-5 H 4.6363636 V 20.333333 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip" id="new"></span>';
        newFile.addEventListener('click', () => {
            this.newFile();
        });
        this.topBar.appendChild(newFile);

        let saveFile: HTMLAnchorElement = document.createElement('a');
        saveFile.classList.add('tooltip');
        saveFile.classList.add('bottomTooltip');
        saveFile.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path  d="m 13.555556,3.6666667 v 9.1666663 h 1.952222 L 12,17.008333 8.4922222,12.833333 H 10.444444 V 3.6666667 Z M 15.111111,2 H 8.8888889 v 9.166667 H 5 L 12,19.5 19,11.166667 h -3.888889 z m 2.333333,15.833333 v 2.5 H 6.5555556 v -2.5 H 5 V 22 h 14 v -4.166667 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip" id="save"></span>';
        saveFile.addEventListener('click', () => {
            this.saveFile();
        });
        this.topBar.appendChild(saveFile);

        let span1: HTMLSpanElement = document.createElement('span');
        span1.style.width = '30px';
        span1.innerHTML = '&nbsp;';
        this.topBar.appendChild(span1);

        let showFileInfo: HTMLAnchorElement = document.createElement('a');
        showFileInfo.classList.add('tooltip');
        showFileInfo.classList.add('bottomTooltip');
        showFileInfo.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 0.833333,15 h -1.666666 v -6.666667 h 1.666666 z M 12,6.7916667 c 0.575,0 1.041667,0.4666666 1.041667,1.0416666 C 13.041667,8.4083333 12.575,8.875 12,8.875 c -0.575,0 -1.041667,-0.4666667 -1.041667,-1.0416667 0,-0.575 0.466667,-1.0416666 1.041667,-1.0416666 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip" id="fileProperties"></span>';
        showFileInfo.addEventListener('click', () => {
            this.showFileInfo();
        });
        this.topBar.appendChild(showFileInfo);

        span1 = document.createElement('span');
        span1.style.width = '30px';
        span1.innerHTML = '&nbsp;';
        this.topBar.appendChild(span1);

        let saveEdit: HTMLAnchorElement = document.createElement('a');
        saveEdit.classList.add('tooltip');
        saveEdit.classList.add('bottomTooltip');
        saveEdit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 3.660833,6.25 -4.7025,4.82 L 8.755,10.981667 7.2083333,12.53 l 3.7499997,3.636667 6.25,-6.369167 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip" id="confirmEdit"></span>';
        saveEdit.addEventListener('click', () => {
            this.saveEdit();
        });
        this.topBar.appendChild(saveEdit);

        let cancelEdit: HTMLAnchorElement = document.createElement('a');
        cancelEdit.classList.add('tooltip');
        cancelEdit.classList.add('bottomTooltip');
        cancelEdit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 5,13.781667 -3.826667,-3.79 L 16.961667,8.1691667 15.781667,7 11.994167,10.824167 8.1708333,7.0383333 7,8.2091667 10.8275,12.0025 7.0383333,15.829167 8.2091667,17 12.005,13.17 l 3.825833,3.791667 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip" id="cancelEdit"></span>';
        cancelEdit.addEventListener('click', () => {
            this.cancelEdit();
        });
        this.topBar.appendChild(cancelEdit);

        let span2: HTMLSpanElement = document.createElement('span');
        span2.style.width = '30px';
        span2.innerHTML = '&nbsp;';
        this.topBar.appendChild(span2);

        let replaceText: HTMLAnchorElement = document.createElement('a');
        replaceText.classList.add('tooltip');
        replaceText.classList.add('bottomTooltip');
        replaceText.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 13.515011,15.871667 C 12.454179,16.535833 11.243347,16.918333 10.013349,17 L 9.5658494,15.3475 c 1.7358316,-0.01583 3.4433286,-0.7925 4.5749936,-2.27 1.779165,-2.325 1.519998,-5.575 -0.479166,-7.615 L 12.185013,7.3908333 10.710015,2 h 5.537492 l -1.564164,2.1275 c 2.562496,2.4508333 3.067496,6.3825 1.185831,9.385 L 22,19.643333 19.643336,22 Z M 4.3283562,14.935 C 2.8025249,13.480833 2.0050259,11.496667 2.000026,9.5 1.9958593,7.91 2.4933586,6.315 3.5333573,4.9566667 4.8975221,3.175 6.9091862,2.1516667 8.9908502,2.0158333 l 0.4533327,1.6508334 c -1.7391644,0.0125 -3.4516622,0.8241666 -4.584994,2.305 C 3.0766912,8.3008333 3.3408575,11.559167 5.3500216,13.6 L 6.828353,11.669167 8.3100177,17 H 2.7775249 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip" id="replaceText"></span>';
        replaceText.addEventListener('click', () => {
            this.replaceText();
        });
        this.topBar.appendChild(replaceText);

        let span3: HTMLSpanElement = document.createElement('span');
        span3.style.width = '30px';
        span3.innerHTML = '&nbsp;';
        this.topBar.appendChild(span3);

        let insertUnit: HTMLAnchorElement = document.createElement('a');
        insertUnit.classList.add('tooltip');
        insertUnit.classList.add('bottomTooltip');
        insertUnit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 5,10.833333 H 12.833333 V 17 H 11.166667 V 12.833333 H 7 v -1.666666 h 4.166667 V 7 h 1.666666 v 4.166667 H 17 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip" id="insertUnit"></span>';
        insertUnit.addEventListener('click', () => {
            this.insertUnit();
        });
        this.topBar.appendChild(insertUnit);

        let deleteUnits: HTMLAnchorElement = document.createElement('a');
        deleteUnits.classList.add('tooltip');
        deleteUnits.classList.add('bottomTooltip');
        deleteUnits.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 5,10.833333 H 7 v -1.666666 h 10 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip" id="deleteSelected"></span>';
        deleteUnits.addEventListener('click', () => {
            this.deleteUnits();
        });
        this.topBar.appendChild(deleteUnits);

        let span4: HTMLSpanElement = document.createElement('span');
        span4.style.width = '30px';
        span4.innerHTML = '&nbsp;';
        this.topBar.appendChild(span4);

        let sortUnits: HTMLAnchorElement = document.createElement('a');
        sortUnits.id = 'sortUnits';
        sortUnits.classList.add('tooltip');
        sortUnits.classList.add('bottomTooltip');
        sortUnits.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="m 8.666667,10.444444 v 3.111112 H 12 L 7,19 2,13.555556 H 5.333333 V 10.444444 H 2 L 7,5 12,10.444444 Z M 22,14.333333 h -8.333333 v 1.555556 H 22 Z M 22,19 H 13.666667 V 17.444444 H 22 Z m 0,-6.222222 H 13.666667 V 11.222222 H 22 Z M 22,9.6666667 H 13.666667 V 8.1111111 H 22 Z M 22,6.5555556 H 13.666667 V 5 H 22 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip" id="sortUnitsTip"></span>';
        sortUnits.addEventListener('click', () => {
            this.sortUnits();
        });
        this.topBar.appendChild(sortUnits);

        let filterUnits: HTMLAnchorElement = document.createElement('a');
        filterUnits.id = 'filterUnits';
        filterUnits.classList.add('tooltip');
        filterUnits.classList.add('bottomTooltip');
        filterUnits.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 18.091348,3.6666667 11.913044,14.119167 v 4.936666 l -0.826087,-0.5 V 14.119167 L 4.9086522,3.6666667 Z M 21,2 H 2 L 9.4347826,14.578333 V 19.5 L 13.565217,22 v -7.421667 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip" id="filterUnitsTip"></span>';
        filterUnits.addEventListener('click', () => {
            this.filterUnits();
        });
        this.topBar.appendChild(filterUnits);

        let span5: HTMLSpanElement = document.createElement('span');
        span5.style.width = '30px';
        span5.innerHTML = '&nbsp;';
        this.topBar.appendChild(span5);

        let maintenance: HTMLAnchorElement = document.createElement('a');
        maintenance.classList.add('tooltip');
        maintenance.classList.add('bottomTooltip');
        maintenance.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M11 7h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6zM7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zM20.1 3H3.9c-.5 0-.9.4-.9.9v16.2c0 .4.4.9.9.9h16.2c.4 0 .9-.5.9-.9V3.9c0-.5-.5-.9-.9-.9zM19 19H5V5h14v14z"/></svg>' +
            '<span class="tooltiptext bottomTooltip" id="maintenance"></span>';
        maintenance.addEventListener('click', () => {
            this.maintenanceDashboard();
        });
        this.topBar.appendChild(maintenance);

        let span6: HTMLSpanElement = document.createElement('span');
        span6.style.width = '30px';
        span6.innerHTML = '&nbsp;';
        this.topBar.appendChild(span6);

        let convertCSV: HTMLAnchorElement = document.createElement('a');
        convertCSV.classList.add('tooltip');
        convertCSV.classList.add('bottomTooltip');
        convertCSV.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,5v3H5V5H19z M19,10v4H5v-4H19z M5,19v-3h14v3H5z"/></svg>' +
            '<span class="tooltiptext bottomTooltip" id="convertCSV"></span>';
        convertCSV.addEventListener('click', () => {
            this.convertCSV();
        });
        this.topBar.appendChild(convertCSV);

        let convertExcel: HTMLAnchorElement = document.createElement('a');
        convertExcel.classList.add('tooltip');
        convertExcel.classList.add('bottomTooltip');
        convertExcel.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g>' +
            '<path d="M13.5 23.5C13.4745 23.5 13.4491 23.498 13.424 23.494L0.424 21.494C0.305983 21.4759 0.198357 21.4161 0.120589 21.3255C0.0428206 21.2349 4.54341e-05 21.1194 0 21L0 4C6.66312e-05 3.88691 0.0384697 3.77718 0.10894 3.68873C0.179409 3.60028 0.277783 3.53833 0.388 3.513L13.388 0.513002C13.4613 0.495567 13.5376 0.495025 13.6111 0.511416C13.6847 0.527807 13.7535 0.560702 13.8125 0.607615C13.8714 0.654528 13.9189 0.714231 13.9514 0.782209C13.9839 0.850187 14.0005 0.924662 14 1V23C14.0005 23.0658 13.988 23.1311 13.963 23.192C13.9381 23.2529 13.9013 23.3082 13.8547 23.3547C13.8082 23.4013 13.7529 23.4381 13.692 23.463C13.6311 23.488 13.5658 23.5005 13.5 23.5V23.5ZM1 20.571L13 22.417V1.628L1 4.398V20.571V20.571Z"/>' +
            '<path d="M23.5 21.5H13.5C13.3674 21.5 13.2402 21.4473 13.1464 21.3536C13.0527 21.2598 13 21.1326 13 21C13 20.8674 13.0527 20.7402 13.1464 20.6464C13.2402 20.5527 13.3674 20.5 13.5 20.5H23V3.5H13.5C13.3674 3.5 13.2402 3.44732 13.1464 3.35355C13.0527 3.25979 13 3.13261 13 3C13 2.86739 13.0527 2.74021 13.1464 2.64645C13.2402 2.55268 13.3674 2.5 13.5 2.5H23.5C23.6326 2.5 23.7598 2.55268 23.8536 2.64645C23.9473 2.74021 24 2.86739 24 3V21C24 21.1326 23.9473 21.2598 23.8536 21.3536C23.7598 21.4473 23.6326 21.5 23.5 21.5ZM9.5 16.5C9.41514 16.5003 9.33163 16.4788 9.25741 16.4377C9.18319 16.3966 9.12073 16.3371 9.076 16.265L4.076 8.265C4.0412 8.20932 4.01771 8.14733 4.00686 8.08257C3.99602 8.01781 3.99804 7.95155 4.0128 7.88757C4.04262 7.75836 4.12255 7.64628 4.235 7.576C4.34745 7.50572 4.48322 7.48299 4.61243 7.5128C4.74164 7.54262 4.85372 7.62255 4.924 7.735L9.924 15.735C9.9713 15.8107 9.99749 15.8977 9.99983 15.9869C10.0022 16.0761 9.98059 16.1643 9.93732 16.2424C9.89406 16.3204 9.83068 16.3855 9.75378 16.4308C9.67688 16.4761 9.58925 16.5 9.5 16.5V16.5Z"/>' +
            '<path d="M4.5 16.5C4.41075 16.5 4.32312 16.4761 4.24622 16.4308C4.16932 16.3855 4.10595 16.3204 4.06268 16.2424C4.01941 16.1643 3.99783 16.0761 4.00017 15.9869C4.00251 15.8977 4.0287 15.8107 4.076 15.735L9.076 7.735C9.14628 7.62255 9.25836 7.54262 9.38757 7.5128C9.51678 7.48299 9.65255 7.50572 9.765 7.576C9.87745 7.64628 9.95738 7.75836 9.9872 7.88757C10.017 8.01678 9.99428 8.15255 9.924 8.265L4.924 16.265C4.87906 16.3369 4.81656 16.3962 4.74239 16.4373C4.66821 16.4784 4.5848 16.5 4.5 16.5V16.5ZM17.5 21.5C17.3674 21.5 17.2402 21.4473 17.1464 21.3536C17.0527 21.2598 17 21.1326 17 21V3C17 2.86739 17.0527 2.74021 17.1464 2.64645C17.2402 2.55268 17.3674 2.5 17.5 2.5C17.6326 2.5 17.7598 2.55268 17.8536 2.64645C17.9473 2.74021 18 2.86739 18 3V21C18 21.1326 17.9473 21.2598 17.8536 21.3536C17.7598 21.4473 17.6326 21.5 17.5 21.5Z" />' +
            '<path d="M23.5 18.5H13.5C13.3674 18.5 13.2402 18.4473 13.1464 18.3536C13.0527 18.2598 13 18.1326 13 18C13 17.8674 13.0527 17.7402 13.1464 17.6464C13.2402 17.5527 13.3674 17.5 13.5 17.5H23.5C23.6326 17.5 23.7598 17.5527 23.8536 17.6464C23.9473 17.7402 24 17.8674 24 18C24 18.1326 23.9473 18.2598 23.8536 18.3536C23.7598 18.4473 23.6326 18.5 23.5 18.5ZM23.5 15.5H13.5C13.3674 15.5 13.2402 15.4473 13.1464 15.3536C13.0527 15.2598 13 15.1326 13 15C13 14.8674 13.0527 14.7402 13.1464 14.6464C13.2402 14.5527 13.3674 14.5 13.5 14.5H23.5C23.6326 14.5 23.7598 14.5527 23.8536 14.6464C23.9473 14.7402 24 14.8674 24 15C24 15.1326 23.9473 15.2598 23.8536 15.3536C23.7598 15.4473 23.6326 15.5 23.5 15.5ZM23.5 12.5H13.5C13.3674 12.5 13.2402 12.4473 13.1464 12.3536C13.0527 12.2598 13 12.1326 13 12C13 11.8674 13.0527 11.7402 13.1464 11.6464C13.2402 11.5527 13.3674 11.5 13.5 11.5H23.5C23.6326 11.5 23.7598 11.5527 23.8536 11.6464C23.9473 11.7402 24 11.8674 24 12C24 12.1326 23.9473 12.2598 23.8536 12.3536C23.7598 12.4473 23.6326 12.5 23.5 12.5ZM23.5 9.5H13.5C13.3674 9.5 13.2402 9.44732 13.1464 9.35355C13.0527 9.25979 13 9.13261 13 9C13 8.86739 13.0527 8.74021 13.1464 8.64645C13.2402 8.55268 13.3674 8.5 13.5 8.5H23.5C23.6326 8.5 23.7598 8.55268 23.8536 8.64645C23.9473 8.74021 24 8.86739 24 9C24 9.13261 23.9473 9.25979 23.8536 9.35355C23.7598 9.44732 23.6326 9.5 23.5 9.5ZM23.5 6.5H13.5C13.3674 6.5 13.2402 6.44732 13.1464 6.35355C13.0527 6.25979 13 6.13261 13 6C13 5.86739 13.0527 5.74021 13.1464 5.64645C13.2402 5.55268 13.3674 5.5 13.5 5.5H23.5C23.6326 5.5 23.7598 5.55268 23.8536 5.64645C23.9473 5.74021 24 5.86739 24 6C24 6.13261 23.9473 6.25979 23.8536 6.35355C23.7598 6.44732 23.6326 6.5 23.5 6.5Z"/>' +
            '</g></svg>' +
            '<span class="tooltiptext bottomTooltip" id="convertExcel"></span>';
        convertExcel.addEventListener('click', () => {
            this.convertExcel();
        });
        this.topBar.appendChild(convertExcel);

        let convertSDLTM: HTMLAnchorElement = document.createElement('a');
        convertSDLTM.classList.add('tooltip');
        convertSDLTM.classList.add('bottomTooltip');
        convertSDLTM.innerHTML = '<svg version="1.1" width="24" height="24" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 24 24" style="enable-background:new 0 0 24 24;" xml:space="preserve"> <path d="M20.8,6.8V4.4c0-0.1,0.1-0.6-0.3-1c-0.3-0.4-0.7-0.5-0.8-0.5c-3.8,0-7.5,0-11.3,0C8.2,3,7.9,3.1,7.6,3.4 	C7.4,3.7,7.3,4,7.3,4.1c0,0.6,0,1.1-0.1,1.7h1.5V4.7c0,0,0-0.1,0.1-0.2C8.9,4.4,8.9,4.3,9,4.3c1.7,0,3.4,0,5,0c0,0.5,0,1,0,1.5 	c0.3,0,0.6,0,1,0.1c0.2,0,0.8,0.2,1.3,0.7c0.4,0.4,0.6,0.9,0.6,1.1c0,1.7,0,3,0,3.3c0,0.1,0,0.3-0.2,0.6c-0.1,0.1-0.2,0.3-0.2,0.3 	c0.1,0.1,0.2,0.2,0.3,0.4c0,0,0.1,0.1,0.1,0.3c0.1,0.3,0.1,1.6,0.1,3.4c0,0.1-0.1,0.4-0.2,0.6c-0.1,0.2-0.2,0.3-0.3,0.4 	c0.1,0.1,0.3,0.4,0.4,0.7c0.1,0.4,0.1,0.7,0.1,0.8h2.4c0.8,0,1.4-0.6,1.4-1.4v-2.4c0-0.8-0.6-1.4-1.4-1.4c0.8,0,1.4-0.6,1.4-1.4V9.6 	c0-0.8-0.6-1.4-1.4-1.4C20.1,8.2,20.8,7.6,20.8,6.8z"/> <path d="M16.2,10.6V8.2c0-0.8-0.6-1.4-1.4-1.4H4c-0.8,0-1.4,0.6-1.4,1.4v2.4C2.7,11.3,3.3,12,4,12c-0.8,0-1.4,0.6-1.4,1.4v2.4 	c0,0.8,0.6,1.4,1.4,1.4c-0.8,0-1.4,0.6-1.4,1.4V21c0,0.8,0.6,1.4,1.4,1.4h10.8c0.8,0,1.4-0.6,1.4-1.4v-2.4c0-0.8-0.6-1.4-1.4-1.4 	c0.8,0,1.4-0.6,1.4-1.4v-2.4c0-0.8-0.6-1.4-1.4-1.4C15.6,12,16.2,11.3,16.2,10.6z M9.4,20.9h-5c0,0-0.1,0-0.2-0.1 	c0-0.1-0.1-0.1-0.1-0.2c0-0.6,0-1.1,0-1.7c0,0,0-0.1,0-0.2c0,0,0.1-0.1,0.2-0.1c0.3,0,4.7,0,5,0V20.9z M9.4,15.7h-5 	c0,0-0.1,0-0.2-0.1c0-0.1-0.1-0.1-0.1-0.2c0-0.6,0-1.1,0-1.7c0,0,0-0.1,0-0.2c0,0,0.1-0.1,0.2-0.1c0.3,0,4.7,0,5,0V15.7z M9.4,10.5 	h-5c0,0-0.1,0-0.2-0.1c0-0.1-0.1-0.1-0.1-0.2c0-0.6,0-1.1,0-1.7c0,0,0-0.1,0-0.2c0,0,0.1-0.1,0.2-0.1c0.3,0,4.7,0,5,0V10.5z"/> </svg> ' +
            '<span class="tooltiptext bottomTooltip" id="convertSDLTM"></span>';
        convertSDLTM.addEventListener('click', () => {
            this.convertSDLTM();
        });
        this.topBar.appendChild(convertSDLTM);

        let convertTBX: HTMLAnchorElement = document.createElement('a');
        convertTBX.classList.add('tooltip');
        convertTBX.classList.add('bottomTooltip');
        convertTBX.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g stroke-width="1.3"  fill="none" stroke-linecap="round">' +
            '<rect x="3" y="2" width="16" height="20" rx="2" ry="2" stroke-linejoin="round"/>' +
            '<path d="M 6 10.5 L 8.5 4.5"/>' +
            '<path d="M 8.5 4.5 L 11 10.5"/>' +
            '<path d="M 7 9 L 10 9"/>' +
            '<path d="M 6 13 L 16 13" />' +
            '<path d="M 6 16 L 16 16" />' +
            '<path d="M 6 19 L 16 19" />' +
            '</g></svg> ' +
            '<span class="tooltiptext bottomTooltip" id="convertTBX"></span>';
        convertTBX.addEventListener('click', () => {
            this.convertTBX();
        });
        this.topBar.appendChild(convertTBX);

        let unitsLabel: HTMLSpanElement = document.createElement('span');
        unitsLabel.id = 'unitsLabel';
        unitsLabel.innerText = 'Units: ';
        unitsLabel.style.marginLeft = '10px';
        unitsLabel.style.marginTop = '4px';
        this.topBar.appendChild(unitsLabel);

        let unitsCount: HTMLSpanElement = document.createElement('span');
        unitsCount.id = 'units';
        unitsCount.innerText = '0';
        unitsCount.style.marginLeft = '10px';
        unitsCount.style.marginTop = '4px';
        unitsCount.style.minWidth = '100px';
        this.topBar.appendChild(unitsCount);

        let filler: HTMLSpanElement = document.createElement('span');
        filler.classList.add('fill_width');
        filler.innerHTML = '&nbsp;';
        this.topBar.appendChild(filler);

        let openHelp: HTMLAnchorElement = document.createElement('a');
        openHelp.classList.add('tooltip');
        openHelp.classList.add('bottomRightTooltip');
        openHelp.innerHTML = '<svg version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 1.041667,14.166667 c 0,0.575 -0.465834,1.041666 -1.041667,1.041666 -0.574167,0 -1.041667,-0.466666 -1.041667,-1.041666 0,-0.575 0.4675,-1.041667 1.041667,-1.041667 0.575833,0 1.041667,0.466667 1.041667,1.041667 z M 14.2025,7.835 C 13.695833,7.3216667 12.94,7.0391667 12.076667,7.0391667 10.26,7.0391667 9.085,8.3308333 9.085,10.330833 h 1.675833 c 0,-1.238333 0.690834,-1.6774997 1.281667,-1.6774997 0.528333,0 1.089167,0.3508334 1.136667,1.0216667 0.05167,0.705833 -0.325,1.064167 -0.801667,1.5175 -1.176667,1.119167 -1.198333,1.660833 -1.193333,2.89 H 12.855 c -0.01083,-0.553333 0.025,-1.0025 0.779167,-1.815 0.564166,-0.608333 1.265833,-1.365 1.28,-2.5183333 0.0092,-0.77 -0.236667,-1.4325 -0.711667,-1.9141667 z" /></svg>' +
            '<span class="tooltiptext bottomRightTooltip" id="userGuide"></span>';
        openHelp.addEventListener('click', () => {
            this.openHelp();
        });
        this.topBar.appendChild(openHelp);
    }

    createCenterPanel(): void {
        let split: VerticalSplit = new VerticalSplit(this.mainPanel);
        split.setWeights([80, 20]);

        this.buildTable(split.leftPanel());
        this.buildRightPanels(split.rightPanel());

        this.mainPanel.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'PageUp' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
                event.preventDefault();
            }
            if (event.key === 'PageUp' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
                event.preventDefault();
            }
            if (event.key === 'PageDown' && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
                event.preventDefault();
            }
            if (event.key === 'PageDown' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
                event.preventDefault();
            }
            if (this.currentCell && (event.key === 'PageDown' || event.key === 'PageUp') && !(event.ctrlKey || event.metaKey)) {
                // prevent scrolling while editing
                event.preventDefault();
            }
        });
    }

    buildTable(leftPanel: HTMLDivElement): void {
        let tableContainer: HTMLDivElement = document.createElement('div');
        tableContainer.classList.add('leftPaddedPanel');
        tableContainer.id = 'tableContainer';
        tableContainer.addEventListener('scroll', (e) => {
            this.checkScroll(e);
        });
        tableContainer.addEventListener('scrollend', (e) => {
            this.checkScrollend(e);
        });
        leftPanel.appendChild(tableContainer);

        let mainTable: HTMLTableElement = document.createElement('table');
        mainTable.id = 'mainTable';
        mainTable.classList.add('stripes');
        tableContainer.appendChild(mainTable);

        let thead: HTMLTableSectionElement = document.createElement('thead');
        thead.id = 'tableHeader';
        mainTable.appendChild(thead);

        let tr: HTMLTableRowElement = document.createElement('tr');
        thead.appendChild(tr);

        let th1: HTMLTableCellElement = document.createElement('th');
        th1.classList.add('fixed');
        tr.appendChild(th1);

        let selectAll: HTMLInputElement = document.createElement('input');
        selectAll.id = 'selectAll';
        selectAll.type = 'checkbox';
        selectAll.addEventListener('click', () => {
            this.toggleSelectAll();
        });
        th1.appendChild(selectAll);

        let th2: HTMLTableCellElement = document.createElement('th');
        tr.appendChild(th2);

        let th3: HTMLTableCellElement = document.createElement('th');
        tr.appendChild(th3);

        let tableBody: HTMLTableSectionElement = document.createElement('tbody');
        tableBody.id = 'tableBody';
        mainTable.appendChild(tableBody);
    }

    setTooltips(tooltips: any): void {
        (document.getElementById('open') as HTMLSpanElement).innerText = tooltips.open;
        (document.getElementById('new') as HTMLSpanElement).innerText = tooltips.new;
        (document.getElementById('save') as HTMLSpanElement).innerText = tooltips.save;
        (document.getElementById('fileProperties') as HTMLSpanElement).innerText = tooltips.fileProperties;
        (document.getElementById('confirmEdit') as HTMLSpanElement).innerText = tooltips.confirmEdit;
        (document.getElementById('cancelEdit') as HTMLSpanElement).innerText = tooltips.cancelEdit;
        (document.getElementById('replaceText') as HTMLSpanElement).innerText = tooltips.replaceText;
        (document.getElementById('insertUnit') as HTMLSpanElement).innerText = tooltips.insertUnit;
        (document.getElementById('deleteSelected') as HTMLSpanElement).innerText = tooltips.deleteSelected;
        (document.getElementById('sortUnitsTip') as HTMLSpanElement).innerText = tooltips.sortUnits;
        (document.getElementById('filterUnitsTip') as HTMLSpanElement).innerText = tooltips.filterUnits;
        (document.getElementById('maintenance') as HTMLSpanElement).innerText = tooltips.maintenance;
        (document.getElementById('convertCSV') as HTMLSpanElement).innerText = tooltips.convertCSV;
        (document.getElementById('convertExcel') as HTMLSpanElement).innerText = tooltips.convertExcel;
        (document.getElementById('convertSDLTM') as HTMLSpanElement).innerText = tooltips.convertSDLTM;
        (document.getElementById('convertTBX') as HTMLSpanElement).innerText = tooltips.convertTBX;
        (document.getElementById('userGuide') as HTMLSpanElement).innerText = tooltips.userGuide;
        (document.getElementById('unitsLabel') as HTMLSpanElement).innerText = tooltips.unitsLabel;
        (document.getElementById('attributesSpan') as HTMLSpanElement).innerHTML = tooltips.tuAttributes;
        (document.getElementById('propertiesSpan') as HTMLSpanElement).innerHTML = tooltips.tuProperties;
        (document.getElementById('notesSpan') as HTMLSpanElement).innerHTML = tooltips.tuNotes;
        (document.getElementById('editAttributesTooltip') as HTMLSpanElement).innerText = tooltips.editAttributes;
        (document.getElementById('editPropertiesTooltip') as HTMLSpanElement).innerText = tooltips.editProperties;
        (document.getElementById('editNotesTooltip') as HTMLSpanElement).innerText = tooltips.editNotes;
    }

    buildRightPanels(rightPanel: HTMLDivElement): void {
        let panelsContainer: HTMLDivElement = document.createElement('div');
        panelsContainer.classList.add('rightPaddedPanel');
        rightPanel.appendChild(panelsContainer);

        let config: any = { attributes: true, childList: false, subtree: false };
        let observer: MutationObserver = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'attributes') {
                    panelsContainer.style.height = rightPanel.clientHeight + 'px';
                    panelsContainer.style.width = rightPanel.clientWidth + 'px';
                }
            }
        });
        observer.observe(rightPanel, config);

        let divider: ThreeHorizontalPanels = new ThreeHorizontalPanels(panelsContainer);

        this.createAttributesPanel(divider.topPanel());
        this.createPropertiesPanel(divider.centerPanel());
        this.createNotesPanel(divider.bottomPanel());
    }

    createAttributesPanel(topPanel: HTMLDivElement): void {
        topPanel.id = 'topPanel';

        let panelsContainer: HTMLDivElement = document.createElement('div');
        panelsContainer.classList.add('topPaddedPanel');
        topPanel.appendChild(panelsContainer);

        let titlePanel: HTMLDivElement = document.createElement('div');
        titlePanel.classList.add('titlePanel');
        titlePanel.classList.add('row');
        titlePanel.classList.add('noWrap');
        panelsContainer.appendChild(titlePanel);

        let attributesSpan: HTMLSpanElement = document.createElement('span');
        attributesSpan.id = 'attributesSpan';
        attributesSpan.classList.add('noWrap');
        attributesSpan.style.marginLeft = '4px';
        attributesSpan.style.marginTop = '4px';
        attributesSpan.innerText = 'TU';
        titlePanel.appendChild(attributesSpan);

        let fillerSpan: HTMLSpanElement = document.createElement('span');
        fillerSpan.innerHTML = '&nbsp;';
        fillerSpan.classList.add('fill_width');
        titlePanel.appendChild(fillerSpan);

        let editAttributes: HTMLAnchorElement = document.createElement('a');
        editAttributes.id = 'editAttributes';
        editAttributes.classList.add('tooltip');
        editAttributes.classList.add('bottomRightTooltip');
        editAttributes.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M2.25 15.75H5.0625L13.3575 7.45502L10.545 4.64252L2.25 12.9375V15.75ZM3.75 13.56L10.545 6.76502L11.235 7.45502L4.44 14.25H3.75V13.56Z" />' +
            '<path d="M13.7775 2.46751C13.485 2.17501 13.0125 2.17501 12.72 2.46751L11.3475 3.84001L14.16 6.65251L15.5325 5.28001C15.825 4.98751 15.825 4.51501 15.5325 4.22251L13.7775 2.46751Z" />' +
            '</svg>' + '<span class="tooltiptext bottomRightTooltip" id="editAttributesTooltip"></span>';
        editAttributes.addEventListener('click', () => {
            this.editAttributes();
        });
        titlePanel.appendChild(editAttributes);

        let attributesPanel: HTMLDivElement = document.createElement('div');
        attributesPanel.id = 'attributesPanel';
        attributesPanel.classList.add('divContainer');
        panelsContainer.appendChild(attributesPanel);

        let table: HTMLTableElement = document.createElement('table');
        table.classList.add('stripes');
        attributesPanel.appendChild(table);

        let tbody: HTMLTableSectionElement = document.createElement('tbody');
        tbody.id = 'attributesTable';
        table.appendChild(tbody);

        let config: any = { attributes: true, childList: false, subtree: false };
        let observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'attributes') {
                    attributesPanel.style.height = (panelsContainer.clientHeight - titlePanel.clientHeight) + 'px';
                    attributesPanel.style.width = panelsContainer.clientWidth + 'px';
                }
            }
        });
        observer.observe(topPanel, config);
    }

    createPropertiesPanel(centerPanel: HTMLDivElement): void {
        centerPanel.id = 'centerPanel';

        let panelsContainer: HTMLDivElement = document.createElement('div');
        panelsContainer.classList.add('centerPaddedPanel');
        centerPanel.appendChild(panelsContainer);

        let titlePanel: HTMLDivElement = document.createElement('div');
        titlePanel.classList.add('titlePanel');
        titlePanel.classList.add('row');
        titlePanel.classList.add('noWrap');
        panelsContainer.appendChild(titlePanel);

        let propertiesSpan: HTMLSpanElement = document.createElement('span');
        propertiesSpan.id = 'propertiesSpan';
        propertiesSpan.classList.add('noWrap');
        propertiesSpan.style.marginLeft = '4px';
        propertiesSpan.style.marginTop = '4px';
        propertiesSpan.innerText = 'TU';
        titlePanel.appendChild(propertiesSpan);

        let fillerSpan: HTMLSpanElement = document.createElement('span');
        fillerSpan.innerHTML = '&nbsp;';
        fillerSpan.classList.add('fill_width');
        titlePanel.appendChild(fillerSpan);

        let editProperties: HTMLAnchorElement = document.createElement('a');
        editProperties.id = 'editProperties';
        editProperties.classList.add('tooltip');
        editProperties.classList.add('bottomRightTooltip');
        editProperties.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M2.25 15.75H5.0625L13.3575 7.45502L10.545 4.64252L2.25 12.9375V15.75ZM3.75 13.56L10.545 6.76502L11.235 7.45502L4.44 14.25H3.75V13.56Z" />' +
            '<path d="M13.7775 2.46751C13.485 2.17501 13.0125 2.17501 12.72 2.46751L11.3475 3.84001L14.16 6.65251L15.5325 5.28001C15.825 4.98751 15.825 4.51501 15.5325 4.22251L13.7775 2.46751Z" />' +
            '</svg>' + '<span class="tooltiptext bottomRightTooltip" id="editPropertiesTooltip"></span>';
        editProperties.addEventListener('click', () => {
            this.editProperties();
        });
        titlePanel.appendChild(editProperties);

        let propertiesPanel: HTMLDivElement = document.createElement('div');
        propertiesPanel.id = 'propertiesPanel';
        panelsContainer.appendChild(propertiesPanel);

        let table: HTMLTableElement = document.createElement('table');
        table.classList.add('stripes');
        propertiesPanel.appendChild(table);

        let tbody: HTMLTableSectionElement = document.createElement('tbody');
        tbody.id = 'propertiesTable';
        table.appendChild(tbody);

        let config: any = { attributes: true, childList: false, subtree: false };
        let observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'attributes') {
                    propertiesPanel.style.height = (panelsContainer.clientHeight - titlePanel.clientHeight) + 'px';
                    propertiesPanel.style.width = panelsContainer.clientWidth + 'px';
                }
            }
        });
        observer.observe(centerPanel, config);
    }

    createNotesPanel(bottomPanel: HTMLDivElement): void {
        bottomPanel.id = 'bottomPanel';

        let panelsContainer: HTMLDivElement = document.createElement('div');
        panelsContainer.classList.add('bottomPaddedPanel');
        bottomPanel.appendChild(panelsContainer);

        let titlePanel: HTMLDivElement = document.createElement('div');
        titlePanel.classList.add('titlePanel');
        titlePanel.classList.add('row');
        titlePanel.classList.add('noWrap');
        panelsContainer.appendChild(titlePanel);

        let notesSpan: HTMLSpanElement = document.createElement('span');
        notesSpan.id = 'notesSpan';
        notesSpan.classList.add('noWrap');
        notesSpan.style.marginLeft = '4px';
        notesSpan.style.marginTop = '4px';
        notesSpan.innerText = 'TU';
        titlePanel.appendChild(notesSpan);

        let fillerSpan: HTMLSpanElement = document.createElement('span');
        fillerSpan.innerHTML = '&nbsp;';
        fillerSpan.classList.add('fill_width');
        titlePanel.appendChild(fillerSpan);

        let editNotes: HTMLAnchorElement = document.createElement('a');
        editNotes.id = 'editNotes';
        editNotes.classList.add('tooltip');
        editNotes.classList.add('bottomRightTooltip');
        editNotes.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M2.25 15.75H5.0625L13.3575 7.45502L10.545 4.64252L2.25 12.9375V15.75ZM3.75 13.56L10.545 6.76502L11.235 7.45502L4.44 14.25H3.75V13.56Z" />' +
            '<path d="M13.7775 2.46751C13.485 2.17501 13.0125 2.17501 12.72 2.46751L11.3475 3.84001L14.16 6.65251L15.5325 5.28001C15.825 4.98751 15.825 4.51501 15.5325 4.22251L13.7775 2.46751Z" />' +
            '</svg>' + '<span class="tooltiptext bottomRightTooltip" id="editNotesTooltip"></span>';
        editNotes.addEventListener('click', () => {
            this.editNotes();
        });
        titlePanel.appendChild(editNotes);

        let notesPanel: HTMLDivElement = document.createElement('div');
        notesPanel.id = 'notesPanel';
        panelsContainer.appendChild(notesPanel);

        let table: HTMLTableElement = document.createElement('table');
        table.classList.add('stripes');
        notesPanel.appendChild(table);

        let tbody: HTMLTableSectionElement = document.createElement('tbody');
        tbody.id = 'notesTable';
        table.appendChild(tbody);

        let config: any = { attributes: true, childList: false, subtree: false };
        let observer = new MutationObserver((mutationsList) => {
            for (let mutation of mutationsList) {
                if (mutation.type === 'attributes') {
                    notesPanel.style.height = (panelsContainer.clientHeight - titlePanel.clientHeight) + 'px';
                    notesPanel.style.width = panelsContainer.clientWidth + 'px';
                }
            }
        });
        observer.observe(bottomPanel, config);
    }

    openFile(): void {
        ipcRenderer.send('open-file');
    }

    newFile(): void {
        ipcRenderer.send('new-file');
    }

    saveFile(): void {
        ipcRenderer.send('save-file');
    }

    showFileInfo(): void {
        ipcRenderer.send('show-file-info');
    }

    saveEdit(): void {
        if (!this.isLoaded) {
            return;
        }
        if (this.currentCell?.isContentEditable) {
            if (this.currentContent === this.currentCell.innerHTML) {
                this.cancelEdit();
                return;
            }
            ipcRenderer.send('save-data', { id: this.currentId, lang: this.currentLang, data: this.removeSpan() });
            this.currentContent = this.currentCell.innerHTML;
            this.currentCell.contentEditable = 'false';
            this.currentCell.classList.remove('editing');
            this.currentCell.style.width = '';
            ipcRenderer.send('saved-edit', { id: this.currentId, lang: this.currentLang });
            this.currentCell = undefined;
        }
    }

    removeSpan(): string {
        let result: string = '';
        if (this.currentCell) {
            let nodes: NodeListOf<ChildNode> = this.currentCell.childNodes;
            let length: number = nodes.length;
            for (let i = 0; i < length; i++) {
                let node: Node = nodes[i];
                if (node.nodeType === Node.TEXT_NODE) {
                    result = result + node.nodeValue;
                }
                if (node.nodeType === Node.ELEMENT_NODE) {
                    let element: HTMLElement = node as HTMLElement;
                    if (element.tagName === 'SPAN') {
                        result = result + element.innerText;
                    } else {
                        result = result + element.outerHTML;
                    }
                }
            }
        }
        return result;
    }

    dataSaved(arg: any): void {
        if (arg.status !== 'Success') {
            return;
        }
        let tr: HTMLElement | null = document.getElementById(arg.id);
        if (tr) {
            let children: HTMLCollection = tr.children;
            let length: number = children.length;
            for (let i: number = 0; i < length; i++) {
                let td: HTMLElement = children.item(i) as HTMLElement;
                if (td.lang === arg.lang) {
                    td.innerHTML = arg.data;
                    break;
                }
            }
        }
    }

    cancelEdit(): void {
        if (!this.isLoaded) {
            return;
        }
        if (this.currentCell && this.currentContent !== undefined) {
            this.currentCell.innerHTML = this.currentContent;
            this.currentCell.contentEditable = 'false';
            this.currentCell.classList.remove('editing');
            this.currentCell.style.width = '';
            ipcRenderer.send('cancel-editing');
        }
    }

    selectMatch(data: { id: string, position: number, lang: string, searchText: string, caseSensitive: boolean, useRegex: boolean }): void {
        if (this.currentCell?.isContentEditable) {
            this.saveEdit();
        }
        let tr: HTMLElement | null = document.getElementById(data.id);
        if (tr) {
            let cell: HTMLTableCellElement | null = tr.querySelector('td.lang[lang="' + data.lang + '"]') as HTMLTableCellElement | null;
            if (cell) {
                this.startEditingCell(data.id, data.lang, cell);
                this.lastMatchEnd = -1;
                let match = this.findMatchInCell(cell, data.searchText, data.caseSensitive, data.useRegex, 0);
                if (match) {
                    this.applyRangeHighlight(match.node, match.start, match.end);
                }
            }
            return;
        }
        this.pendingMatch = { id: data.id, lang: data.lang, searchText: data.searchText, caseSensitive: data.caseSensitive, useRegex: data.useRegex };
        this.count = this.UNITSLOAD > this.unitsCount ? this.unitsCount : this.UNITSLOAD;
        this.start = data.position - Math.floor(this.UNITSLOAD / 2);
        if (this.start < 0) {
            this.start = 0;
        }
        if (this.start + this.count >= this.unitsCount) {
            this.start = Math.max(0, this.unitsCount - this.count);
        }
        this.scroll = true;
        this.getSegments(this.start, this.count);
    }

    replaceSelectedText(replaceText: string): void {
        if (!this.currentCell?.isContentEditable) {
            return;
        }
        let selection: Selection | null = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            return;
        }
        let range: Range = selection.getRangeAt(0);
        let originalLength: number = range.toString().length;
        range.deleteContents();
        range.insertNode(document.createTextNode(replaceText));
        selection.removeAllRanges();
        this.currentCell.normalize();
        this.lastMatchEnd = this.lastMatchEnd - originalLength + replaceText.length;
        this.saveEdit();
    }

    private continueMatchInCurrentCell(args: { searchText: string, caseSensitive: boolean, useRegex: boolean }): boolean {
        if (!this.currentCell || this.lastMatchEnd < 0) {
            return false;
        }
        let match = this.findMatchInCell(this.currentCell, args.searchText, args.caseSensitive, args.useRegex, this.lastMatchEnd);
        if (!match) {
            return false;
        }
        this.applyRangeHighlight(match.node, match.start, match.end);
        return true;
    }

    private collectTextNodes(cell: HTMLElement): { node: Text, start: number, end: number }[] {
        let result: { node: Text, start: number, end: number }[] = [];
        let offset: number = 0;
        let walker: TreeWalker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
            let text: string = node.nodeValue || '';
            result.push({ node: node as Text, start: offset, end: offset + text.length });
            offset += text.length;
        }
        return result;
    }

    private findMatchInCell(cell: HTMLElement, searchText: string, caseSensitive: boolean, useRegex: boolean, fromOffset: number): { node: Text, start: number, end: number } | null {
        let pattern: string = useRegex ? searchText : searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let regex: RegExp;
        try {
            regex = new RegExp(pattern, caseSensitive ? '' : 'i');
        } catch (error: unknown) {
            return null;
        }
        let segments: { node: Text, start: number, end: number }[] = this.collectTextNodes(cell);
        let flatText: string = segments.map((s) => s.node.nodeValue || '').join('');
        let match: RegExpMatchArray | null = flatText.substring(fromOffset).match(regex);
        if (!match || match.index === undefined) {
            return null;
        }
        let start: number = fromOffset + match.index;
        let end: number = start + match[0].length;
        for (let seg of segments) {
            if (start >= seg.start && end <= seg.end) {
                return { node: seg.node, start: start - seg.start, end: end - seg.start };
            }
        }
        return null;
    }

    private applyRangeHighlight(node: Text, start: number, end: number): void {
        let range: Range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        let selection: Selection | null = window.getSelection();
        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        }
        if (this.currentCell) {
            let segments: { node: Text, start: number, end: number }[] = this.collectTextNodes(this.currentCell);
            for (let seg of segments) {
                if (seg.node === node) {
                    this.lastMatchEnd = seg.start + end;
                    break;
                }
            }
        }
    }

    replaceText(): void {
        ipcRenderer.send('replace-text');
    }

    insertUnit(): void {
        ipcRenderer.send('insert-unit');
    }

    deleteUnits(): void {
        this.getSelected();
        ipcRenderer.send('delete-units', this.selectedUnits);
    }

    getSelected(): void {
        this.selectedUnits = [];
        let collection: HTMLCollection = document.getElementsByClassName('rowCheck');
        let length: number = collection.length
        for (let i: number = 0; i < length; i++) {
            let check: HTMLInputElement = collection[i] as HTMLInputElement;
            if (check.checked) {
                let id: string | undefined = check.parentElement?.parentElement?.id;
                if (id) {
                    this.selectedUnits.push(id);
                }
            }
        }
    }

    sortUnits(): void {
        ipcRenderer.send('sort-units');
    }

    filterUnits(): void {
        ipcRenderer.send('filter-units');
    }

    maintenanceDashboard(): void {
        ipcRenderer.send('maintenance-dashboard');
    }

    convertCSV(): void {
        ipcRenderer.send('convert-csv');
    }

    convertExcel(): void {
        ipcRenderer.send('convert-excel');
    }

    convertSDLTM(): void {
        ipcRenderer.send('convert-sdltm');
    }

    convertTBX(): void {
        ipcRenderer.send('convert-tbx');
    }

    openHelp(): void {
        ipcRenderer.send('show-help');
    }

    editAttributes(): void {
        if (!this.isLoaded) {
            return;
        }
        if (!this.currentId || this.currentId === null || this.currentId === '') {
            return;
        }
        ipcRenderer.send('edit-attributes', { id: this.currentId, atts: this.attributes, type: this.attributesType });
    }

    editProperties(): void {
        if (!this.isLoaded) {
            return;
        }
        if (!this.currentId || this.currentId === null || this.currentId === '') {
            return;
        }
        ipcRenderer.send('edit-properties', { id: this.currentId, props: this.properties, type: this.attributesType });
    }

    editNotes(): void {
        if (!this.isLoaded) {
            return;
        }
        if (!this.currentId || this.currentId === null || this.currentId === '') {
            return;
        }
        ipcRenderer.send('edit-notes', { id: this.currentId, notes: this.notes, type: this.attributesType });
    }

    setStatus(value: string): void {
        let status: HTMLDivElement = document.getElementById('status') as HTMLDivElement;
        status.innerHTML = value;
        if (value.length > 0) {
            status.style.display = 'block';
        } else {
            status.style.display = 'none';
        }
    }

    updateLanguages(langs: Language[]): void {
        this.languages = langs;
        let row: string = '<tr><th class="fixed"><input type="checkbox" id="selectAll"></th><th class="fixed">#</th>';
        let length: number = this.languages.length;
        for (let index = 0; index < length; ++index) {
            row = row + '<th>' + this.languages[index].code + ' - ' + langs[index].name + '</th>';
        }
        (document.getElementById('tableHeader') as HTMLTableSectionElement).innerHTML = row + '</tr>';
        (document.getElementById('selectAll') as HTMLInputElement).addEventListener('click', () => {
            this.toggleSelectAll();
        });
    }

    fileLoaded(count: number): void {
        this.unitsCount = count;
        (document.getElementById('units') as HTMLSpanElement).innerText = '' + this.unitsCount;
        document.getElementById('filterUnits')?.classList.remove('active');
        document.getElementById('sortUnits')?.classList.remove('active');
        this.isLoaded = true;

        this.count = this.UNITSLOAD > this.unitsCount ? this.unitsCount : this.UNITSLOAD;
        this.start = 0;
        this.scroll = false;
        let tableContainer: HTMLElement | null = document.getElementById('tableContainer');
        if (tableContainer) {
            tableContainer.scrollTop = 0;
        }
        ipcRenderer.send('get-segments', {
            start: this.start,
            count: this.count
        });
    }

    fileClosed(): void {
        (document.getElementById("tableBody") as HTMLTableSectionElement).innerHTML = '';
        (document.getElementById("tableHeader") as HTMLTableSectionElement).innerHTML = '<tr><th class="fixed"><input type="checkbox" id="selectAll"></th><th class="fixed">#</th><th>&nbsp;</th><th>&nbsp;</th></tr>';
        (document.getElementById('units') as HTMLSpanElement).innerText = '';
        (document.getElementById('attributesTable') as HTMLTableSectionElement).innerHTML = '';
        (document.getElementById('propertiesTable') as HTMLTableSectionElement).innerHTML = '';
        (document.getElementById('notesTable') as HTMLTableSectionElement).innerHTML = '';
        document.getElementById('filterUnits')?.classList.remove('active');
        document.getElementById('sortUnits')?.classList.remove('active');
        (document.getElementById('selectAll') as HTMLInputElement).addEventListener('click', () => {
            this.toggleSelectAll();
        });

        this.isLoaded = false;

        this.currentId = undefined;
        this.currentLang = undefined;
        this.currentCell = undefined;
        this.currentContent = undefined;
        this.selectedUnits = [];
    }

    getSegments(start: number, count: number): void {
        ipcRenderer.send('get-segments', {
            start: start,
            count: count
        });
    }

    updateSegments(arg: any): void {
        this.setStatus('Preparing...');

        if (this.fetchingTop) {
            this.updateTopSegments(arg);
            return;
        }
        if (this.fetchingBottom) {
            this.updateBottomSegments(arg);
            return;
        }

        this.unitsCount = arg.count;
        (document.getElementById('units') as HTMLSpanElement).innerText = '' + this.unitsCount;
        this.start = arg.start;
        this.count = arg.units.length;

        let rows: string = '';
        let length: number = arg.units.length;
        for (let i: number = 0; i < length; i++) {
            rows = rows + arg.units[i];
        }
        let tableBody: HTMLTableSectionElement = document.getElementById('tableBody') as HTMLTableSectionElement;
        tableBody.innerHTML = rows;

        this.firstRow = this.start;
        this.lastRow = this.start + this.count - 1;

        if (this.firstRow < 0) {
            this.firstRow = 0;
        }
        if (this.lastRow > this.unitsCount - 1) {
            this.lastRow = this.unitsCount - 1;
        }

        let loadHeight: number = tableBody.clientHeight;
        if (length > 0) {
            this.AVERAGE = loadHeight / length;
        }
        let totalHeight: number = this.AVERAGE * this.unitsCount;
        let topHeight: number = this.firstRow * this.AVERAGE;
        let bottomHeight: number = totalHeight - topHeight - loadHeight;

        let fillerTop: HTMLTableRowElement = document.createElement('tr');
        fillerTop.id = "fillerTop";
        fillerTop.style.height = '0px';

        let fillerBottom: HTMLTableRowElement = document.createElement('tr');
        fillerBottom.id = "fillerBottom";
        fillerBottom.style.height = '0px';

        tableBody.prepend(fillerTop);
        tableBody.appendChild(fillerBottom);

        fillerTop.style.height = topHeight + 'px';
        fillerBottom.style.height = bottomHeight + 'px';

        if (this.firstRow === 0) {
            fillerTop.style.height = '0px';
        }

        if (this.lastRow === this.unitsCount - 1) {
            fillerBottom.style.height = '0px';
        }

        this.lastClickedRow = undefined;

        let tableRows: HTMLCollectionOf<HTMLTableRowElement> = tableBody.getElementsByTagName('tr');
        for (let i: number = 0; i < tableRows.length; i++) {
            let row: HTMLTableRowElement = tableRows[i];
            row.addEventListener('click', () => {
                if (this.lastClickedRow) {
                    this.lastClickedRow.classList.remove('currentRow');
                }
                row.classList.add('currentRow');
                this.lastClickedRow = row;
            });
        }
        let cells: HTMLCollectionOf<Element> = document.getElementsByClassName('lang');
        length = cells.length;
        for (let i: number = 0; i < length; i++) {
            (cells[i] as HTMLTableCellElement).addEventListener('click', (ev: MouseEvent) => this.clickListener(ev));
        }
        let fixed: HTMLCollectionOf<Element> = document.getElementsByClassName('fixed');
        length = fixed.length;
        for (let i = 0; i < length; i++) {
            (fixed[i] as HTMLTableCellElement).addEventListener('click', (ev: MouseEvent) => this.fixedListener(ev));
        }

        (document.getElementById('attributesTable') as HTMLTableSectionElement).innerHTML = '';
        (document.getElementById('propertiesTable') as HTMLTableSectionElement).innerHTML = '';
        (document.getElementById('notesTable') as HTMLTableSectionElement).innerHTML = '';
        this.currentId = undefined;
        this.setStatus('');

        setTimeout(() => {
            if (this.firstRow === 0 && this.scrollToFirst && this.scroll) {
                let rowOne: HTMLTableRowElement = tableRows[0] as HTMLTableRowElement;
                rowOne.scrollIntoView({ behavior: "smooth", block: "start", inline: "start" });
                (document.getElementById('tableContainer') as HTMLElement).scrollTop = 0; // reset scroll position to the top
                this.scrollToFirst = false; // reset scroll to first
            }
            if (this.lastRow === (this.unitsCount - 1) && this.scrollToLast && this.scroll) {
                let rowMax: HTMLTableRowElement = tableRows[tableRows.length - 1] as HTMLTableRowElement;
                rowMax.scrollIntoView({ behavior: "smooth", block: "end", inline: "start" });
                (document.getElementById('tableContainer') as HTMLElement).scrollTop = totalHeight; // set scroll position to the bottom
                this.scrollToLast = false; // reset scroll to last
            }
            if (this.firstRow !== 0 && this.lastRow !== this.unitsCount - 1 && this.scroll) {
                let middleRow: HTMLTableRowElement = tableRows[Math.floor(tableRows.length / 2)] as HTMLTableRowElement;
                middleRow.scrollIntoView({ behavior: "smooth", block: "center", inline: "start" });
            }
            if (this.pendingEditId) {
                let newId: string = this.pendingEditId;
                this.pendingEditId = undefined;
                let tr: HTMLElement | null = document.getElementById(newId);
                let cell: HTMLTableCellElement | null = tr?.querySelector('td.lang') as HTMLTableCellElement | null;
                if (cell) {
                    this.startEditingCell(newId, cell.lang, cell);
                }
            }
            if (this.pendingMatch) {
                let match = this.pendingMatch;
                this.pendingMatch = undefined;
                let tr: HTMLElement | null = document.getElementById(match.id);
                let cell: HTMLTableCellElement | null = tr?.querySelector('td.lang[lang="' + match.lang + '"]') as HTMLTableCellElement | null;
                if (cell) {
                    this.startEditingCell(match.id, match.lang, cell);
                    this.lastMatchEnd = -1;
                    let found = this.findMatchInCell(cell, match.searchText, match.caseSensitive, match.useRegex, 0);
                    if (found) {
                        this.applyRangeHighlight(found.node, found.start, found.end);
                    }
                }
            }
            this.fetchingData = false;
            document.body.style.cursor = 'default';
            this.checkingScroll = false;
        }, 500);
    }

    updateTopSegments(arg: any): void {
        let tableBody: HTMLTableSectionElement = document.getElementById('tableBody') as HTMLTableSectionElement;
        let trs: HTMLCollectionOf<HTMLTableRowElement> = tableBody.getElementsByTagName('tr');
        let array: HTMLTableRowElement[] = Array.from(trs);

        let newRows: string[] = arg.units;
        let length: number = newRows.length;

        this.firstRow = this.firstRow - length - 1;
        this.lastRow = this.lastRow - length - 1;

        if (this.firstRow < 0) {
            this.firstRow = 0;
        }
        if (this.lastRow > this.unitsCount - 1) {
            this.lastRow = this.unitsCount - 1;
        }

        let removedHeight: number = 0;
        for (let i = Math.max(0, array.length - 2 - length); i < array.length - 1; i++) {
            let row: HTMLTableRowElement = trs[i];
            let height: number = row.clientHeight;
            removedHeight = removedHeight + height;
        }

        let holder: HTMLTableSectionElement = document.createElement('tbody');
        holder.style.width = tableBody.clientWidth + 'px';
        let html: string = '';
        for (let i = 0; i < length; i++) {
            html = html + newRows[i];
        }
        holder.innerHTML = html;
        let addedRows: HTMLTableRowElement[] = Array.from(holder.getElementsByTagName('tr'));

        array.splice(1, 0, ...addedRows); // add rows to the top
        array.splice(array.length - 1 - addedRows.length, addedRows.length); // remove rows from the bottom

        html = '';
        length = array.length;
        for (let i = 0; i < length; i++) {
            html = html + array[i].outerHTML;
        }
        tableBody.innerHTML = html;

        let realHeight: number = 0;
        let tableRows: HTMLCollectionOf<HTMLTableRowElement> = tableBody.getElementsByTagName('tr');
        for (let i = 1; i < array.length - 1; i++) {
            let row: HTMLTableRowElement = tableRows[i] as HTMLTableRowElement;
            let height: number = row.clientHeight;
            realHeight = realHeight + height;
        }

        let addedHeight: number = 0;
        for (let i = 0; i < addedRows.length; i++) {
            let row: HTMLTableRowElement = tableRows[i + 1] as HTMLTableRowElement;
            let height: number = row.clientHeight;
            addedHeight = addedHeight + height;
        }

        if (array.length > 2) {
            this.AVERAGE = realHeight / (array.length - 2);
        }

        let fillerTop: HTMLTableRowElement = document.getElementById('fillerTop') as HTMLTableRowElement;
        let fillerBottom: HTMLTableRowElement = document.getElementById('fillerBottom') as HTMLTableRowElement;
        let currentTop: number = fillerTop.clientHeight;
        let currentBottom: number = fillerBottom.clientHeight;
        let topHeight: number = currentTop - addedHeight;
        let bottomHeight: number = currentBottom + removedHeight;

        fillerTop.style.height = topHeight + 'px';
        fillerBottom.style.height = bottomHeight + 'px';

        if (this.firstRow === 0) {
            fillerTop.style.height = '0px';
        }

        if (this.lastRow === this.unitsCount - 1) {
            fillerBottom.style.height = '0px';
        }

        this.lastClickedRow = undefined;
        for (let i = 0; i < tableRows.length; i++) {
            let row: HTMLTableRowElement = tableRows[i];
            row.addEventListener('click', () => {
                if (this.lastClickedRow) {
                    this.lastClickedRow.classList.remove('currentRow');
                }
                row.classList.add('currentRow');
                this.lastClickedRow = row;
            });
        }
        let cells = document.getElementsByClassName('lang');
        length = cells.length;
        for (let i: number = 0; i < length; i++) {
            (cells[i] as HTMLTableCellElement).addEventListener('click', (ev: MouseEvent) => this.clickListener(ev));
        }
        let fixed: HTMLCollectionOf<Element> = document.getElementsByClassName('fixed');
        length = fixed.length;
        for (let i: number = 0; i < length; i++) {
            (fixed[i] as HTMLTableCellElement).addEventListener('click', (ev: MouseEvent) => this.fixedListener(ev));
        }

        (document.getElementById('attributesTable') as HTMLTableSectionElement).innerHTML = '';
        (document.getElementById('propertiesTable') as HTMLTableSectionElement).innerHTML = '';
        (document.getElementById('notesTable') as HTMLTableSectionElement).innerHTML = '';
        this.currentId = undefined;
        this.setStatus('');

        this.fetchingTop = false;
        document.body.style.cursor = 'default';
        this.checkingScroll = false;
    }

    updateBottomSegments(arg: any): void {
        let tableBody: HTMLTableSectionElement = document.getElementById('tableBody') as HTMLTableSectionElement;
        let trs: HTMLCollectionOf<HTMLTableRowElement> = tableBody.getElementsByTagName('tr');
        let array: HTMLTableRowElement[] = Array.from(trs);

        let newRows: string[] = arg.units;
        let length: number = newRows.length;

        this.firstRow = this.firstRow + length;
        this.lastRow = this.lastRow + length;

        if (this.firstRow < 0) {
            this.firstRow = 0;
        }
        if (this.lastRow > this.unitsCount - 1) {
            this.lastRow = this.unitsCount - 1;
        }

        let removedHeight: number = 0;
        for (let i: number = 0; i < length && i + 1 < trs.length; i++) {
            let row: HTMLTableRowElement = trs[i + 1];
            let height: number = row.clientHeight;
            removedHeight = removedHeight + height;
        }

        let holder: HTMLTableSectionElement = document.createElement('tbody');
        holder.style.width = tableBody.clientWidth + 'px';
        let html: string = '';
        for (let i: number = 0; i < length; i++) {
            html = html + newRows[i];
        }
        holder.innerHTML = html;
        let addedRows: HTMLTableRowElement[] = Array.from(holder.getElementsByTagName('tr'));

        array.splice(array.length - 1, 0, ...addedRows); // add rows to the bottom
        array.splice(1, addedRows.length); // remove rows from the top 

        html = '';
        length = array.length;
        for (let i: number = 0; i < length; i++) {
            html = html + array[i].outerHTML;
        }
        tableBody.innerHTML = html;

        let realHeight: number = 0;
        let tableRows: HTMLCollectionOf<HTMLTableRowElement> = tableBody.getElementsByTagName('tr');
        for (let i: number = 1; i < array.length - 1; i++) {
            let row: HTMLTableRowElement = tableRows[i] as HTMLTableRowElement;
            let height: number = row.clientHeight;
            realHeight = realHeight + height;
        }

        let addedHeight: number = 0;
        for (let i: number = array.length - 1 - addedRows.length; i < array.length - 1; i++) {
            let row: HTMLTableRowElement = tableRows[i] as HTMLTableRowElement;
            let height: number = row.clientHeight;
            addedHeight = addedHeight + height;
        }

        if (array.length > 2) {
            this.AVERAGE = realHeight / (array.length - 2);
        }

        let fillerTop: HTMLTableRowElement = document.getElementById('fillerTop') as HTMLTableRowElement;
        let fillerBottom: HTMLTableRowElement = document.getElementById('fillerBottom') as HTMLTableRowElement;
        let currentTop: number = fillerTop.clientHeight;
        let currentBottom: number = fillerBottom.clientHeight;
        let topHeight: number = currentTop + removedHeight;
        let bottomHeight: number = currentBottom - addedHeight;

        fillerTop.style.height = topHeight + 'px';
        fillerBottom.style.height = bottomHeight + 'px';

        if (this.firstRow === 0) {
            fillerTop.style.height = '0px';
        }

        if (this.lastRow === this.unitsCount - 1) {
            fillerBottom.style.height = '0px';
        }

        this.lastClickedRow = undefined;
        for (let i = 0; i < tableRows.length; i++) {
            let row: HTMLTableRowElement = tableRows[i];
            row.addEventListener('click', () => {
                if (this.lastClickedRow) {
                    this.lastClickedRow.classList.remove('currentRow');
                }
                row.classList.add('currentRow');
                this.lastClickedRow = row;
            });
        }
        let cells = document.getElementsByClassName('lang');
        length = cells.length;
        for (let i = 0; i < length; i++) {
            (cells[i] as HTMLTableCellElement).addEventListener('click', (ev: MouseEvent) => this.clickListener(ev));
        }
        let fixed = document.getElementsByClassName('fixed');
        length = fixed.length;
        for (let i = 0; i < length; i++) {
            (fixed[i] as HTMLTableCellElement).addEventListener('click', (ev: MouseEvent) => this.fixedListener(ev));
        }

        (document.getElementById('attributesTable') as HTMLTableSectionElement).innerHTML = '';
        (document.getElementById('propertiesTable') as HTMLTableSectionElement).innerHTML = '';
        (document.getElementById('notesTable') as HTMLTableSectionElement).innerHTML = '';
        this.currentId = undefined;
        this.setStatus('');

        this.fetchingBottom = false;
        document.body.style.cursor = 'default';
        this.checkingScroll = false;
    }

    checkScroll(e: Event): void {
        if (this.fetchingData || this.fetchingBottom || this.fetchingTop) {
            e.preventDefault();
            return;
        }
        if (this.checkingScroll) {
            e.preventDefault();
            return;
        }
    }

    checkScrollend(e: Event): void {
        if (this.fetchingData || this.fetchingBottom || this.fetchingTop) {
            e.preventDefault();
            return;
        }

        this.checkingScroll = true;
        if (this.checkingScroll) {
            e.preventDefault();
        }

        let tableBody: HTMLTableSectionElement = document.getElementById('tableBody') as HTMLTableSectionElement;
        let fillerTop: HTMLTableRowElement = document.getElementById('fillerTop') as HTMLTableRowElement;
        let fillerBottom: HTMLTableRowElement = document.getElementById('fillerBottom') as HTMLTableRowElement;

        let topHeight: number = fillerTop.clientHeight;
        let bottomHeight: number = fillerBottom.clientHeight;
        let contentHeight: number = tableBody.clientHeight - topHeight - bottomHeight;
        let tableBottom: number = topHeight + contentHeight;
        let fileHeight: number = tableBody.clientHeight;
        let safetyHeight: number = this.SAFETYUNITS * this.AVERAGE;

        let tableContainer = document.getElementById('tableContainer') as HTMLDivElement;
        let tableScroll: number = tableContainer.scrollTop;
        let scrollRow: number = Math.floor(tableScroll / this.AVERAGE);

        if (tableScroll <= this.AVERAGE * 15) {
            this.scrollToFirst = true;
        }

        if (tableScroll >= fileHeight - this.AVERAGE * 15) {
            this.scrollToLast = true;
        }

        if (scrollRow >= this.unitsCount) {
            scrollRow = this.unitsCount;
        }
        if (scrollRow < 0) {
            scrollRow = 0;
        }

        if (tableScroll < topHeight || tableScroll > tableBottom) {
            this.fetchingData = true;
            document.body.style.cursor = 'wait';

            this.start = scrollRow - (this.UNITSLOAD / 2);
            if (this.start < 0) {
                this.start = 0;
            }

            this.count = this.UNITSLOAD;
            if (this.count + this.start >= this.unitsCount) {
                this.start = this.unitsCount - this.UNITSLOAD;
                if (this.start < 0) {
                    this.start = 0;
                }
                this.count = this.unitsCount - this.start;
            }

            this.scroll = true;

            this.getSegments(this.start, this.count);

            return;
        }

        if (tableScroll > topHeight && tableScroll < topHeight + safetyHeight && tableScroll > safetyHeight) {

            if (this.firstRow === 0) {
                return;
            }

            this.fetchingTop = true;
            document.body.style.cursor = 'wait';

            this.start = this.firstRow - 1 - this.SAFETYUNITS;
            this.count = this.SAFETYUNITS;

            if (this.start < this.SAFETYUNITS) {
                this.start = 0;
                this.count = this.firstRow - 1;
            }

            this.scroll = true;

            this.getSegments(this.start, this.count);

            return;
        }

        if (tableScroll > tableBottom - safetyHeight && tableScroll < tableBottom) {
            if (this.lastRow === this.unitsCount - 1) {
                return;
            }

            this.fetchingBottom = true;
            document.body.style.cursor = 'wait';

            this.start = this.lastRow + 1;

            this.count = this.SAFETYUNITS;

            if (this.unitsCount - (this.start + this.count) < this.SAFETYUNITS) {
                this.count = this.unitsCount - this.start;
            }

            this.scroll = true;

            this.getSegments(this.start, this.count);

            return;
        }

        if (tableScroll > topHeight + safetyHeight && tableScroll < tableBottom - safetyHeight) {
            this.checkingScroll = false;
            return;
        }
    }

    fixedListener(event: MouseEvent): void {
        if (!this.isLoaded) {
            return;
        }
        if (this.currentCell?.isContentEditable) {
            this.saveEdit();
        }
        let element: Element = (event.target as Element);
        if (element.parentElement?.tagName === 'TH') {
            // clicked header
            return;
        }
        let x: string = element.tagName;
        let id: string | undefined;
        if ('TD' === x || 'INPUT' === x) {
            let composed: EventTarget[] = event.composedPath();
            if ('TR' === (composed[0] as Element).tagName) {
                id = (composed[0] as Element).id;
            } else if ('TR' === (composed[1] as Element).tagName) {
                id = (composed[1] as Element).id;
            } else if ('TR' === (composed[2] as Element).tagName) {
                id = (composed[2] as Element).id;
            }
        }
        if (id) {
            this.currentId = id;
            ipcRenderer.send('get-row-properties', this.currentId);
        }
    }

    clickListener(event: MouseEvent): void {
        if (!this.isLoaded) {
            return;
        }
        let element: Element = (event.target as Element);
        if (element.parentElement?.tagName === 'TH') {
            // clicked header
            return;
        }
        let x: string = element.tagName;
        let id: string | undefined;
        let lang: string | undefined;
        if ('TD' === x || 'INPUT' === x) {
            let composed: EventTarget[] = event.composedPath();
            if ('TR' === (composed[0] as Element).tagName) {
                id = (composed[0] as Element).id;
            } else if ('TR' === (composed[1] as Element).tagName) {
                id = (composed[1] as Element).id;
            } else if ('TR' === (composed[2] as Element).tagName) {
                id = (composed[2] as Element).id;
            }
            lang = (event.target as Element).getAttribute('lang') || undefined;
        }
        if (this.currentCell && this.currentCell.isContentEditable && (this.currentId !== id || this.currentLang !== lang)) {
            this.saveEdit();
        }

        if (id) {
            this.currentId = id;
            if (this.currentCell) {
                this.currentCell = undefined;
                this.currentContent = undefined;
            }
            if (lang) {
                this.startEditingCell(id, lang, event.target as HTMLTableCellElement);
            }
        }
    }

    startEditingCell(id: string, lang: string, cell: HTMLTableCellElement): void {
        this.currentId = id;
        this.currentLang = lang;
        this.currentCell = cell;
        this.currentContent = cell.innerHTML;
        cell.style.width = getComputedStyle(cell).width;
        if (cell.contentEditable !== 'true') {
            this.replaceSpan(cell);
        }
        cell.contentEditable = 'true';
        cell.classList.add('editing');
        cell.focus();
        ipcRenderer.send('get-cell-properties', { id: this.currentId, lang: this.currentLang });
        ipcRenderer.send('editing-started', { id: this.currentId, lang: this.currentLang });
    }

    replaceSpan(cell: HTMLTableCellElement): void {
        let nodes: NodeListOf<ChildNode> = cell.childNodes;
        let length: number = nodes.length;
        for (let i: number = 0; i < length; i++) {
            let node: Node = nodes[i];
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.nodeName === 'SPAN') {
                    let span: HTMLSpanElement = node as HTMLSpanElement;
                    if (span.classList.contains('spaces')) {
                        span.classList.remove('spaces');
                    }
                }
            }
        }
    }

    updateProperties(arg: any): void {
        this.attributesType = arg.type;
        (document.getElementById('attributesSpan') as HTMLSpanElement).innerHTML = arg.attributesType;
        let table: HTMLTableSectionElement = document.getElementById('attributesTable') as HTMLTableSectionElement;
        table.innerHTML = '';
        this.attributes = arg.attributes;
        let length: number = this.attributes.length;
        for (let i: number = 0; i < length; i++) {
            let pair = this.attributes[i];
            let tr = document.createElement('tr');
            table.appendChild(tr);
            let left: HTMLTableCellElement = document.createElement('td');
            left.style.whiteSpace = 'nowrap';
            left.textContent = pair[0];
            tr.appendChild(left);
            let right: HTMLTableCellElement = document.createElement('td');
            right.textContent = pair[1];
            right.className = 'noWrap';
            right.classList.add('leftBorder');
            right.classList.add('fill_width');
            tr.appendChild(right);
        }

        (document.getElementById('propertiesSpan') as HTMLSpanElement).innerHTML = arg.propertiesType;
        table = document.getElementById('propertiesTable') as HTMLTableSectionElement;
        table.innerHTML = '';
        this.properties = arg.properties;
        length = this.properties.length
        for (let i: number = 0; i < length; i++) {
            let pair = this.properties[i];
            let tr = document.createElement('tr');
            table.appendChild(tr);
            let left: HTMLTableCellElement = document.createElement('td');
            left.textContent = pair[0];
            left.style.whiteSpace = 'nowrap';
            tr.appendChild(left);
            let right: HTMLTableCellElement = document.createElement('td');
            right.textContent = pair[1];
            right.className = 'noWrap';
            right.classList.add('leftBorder');
            right.classList.add('fill_width');
            tr.appendChild(right);
        }

        (document.getElementById('notesSpan') as HTMLSpanElement).innerHTML = arg.notesType;
        table = document.getElementById('notesTable') as HTMLTableSectionElement;
        table.innerHTML = '';
        this.notes = arg.notes;
        length = this.notes.length;
        for (let i: number = 0; i < length; i++) {
            let tr = document.createElement('tr');
            table.appendChild(tr);
            let n: HTMLTableCellElement = document.createElement('td');
            n.textContent = this.notes[i];
            n.className = 'fill_width';
            tr.appendChild(n);
        }
    }

    toggleSelectAll(): void {
        if (!this.isLoaded) {
            return;
        }
        let selectAll: HTMLInputElement = (document.getElementById('selectAll') as HTMLInputElement);
        let collection: HTMLCollection = document.getElementsByClassName('rowCheck');
        let length: number = collection.length;
        for (let i = 0; i < length; i++) {
            let check: HTMLInputElement = collection[i] as HTMLInputElement;
            check.checked = selectAll.checked;
        }
    }

    unitInserted(arg: { id: string, count: number }): void {
        this.unitsCount = arg.count;
        (document.getElementById('units') as HTMLSpanElement).innerText = '' + this.unitsCount;
        this.count = this.UNITSLOAD > this.unitsCount ? this.unitsCount : this.UNITSLOAD;
        this.start = this.unitsCount - this.count;
        this.scroll = true;
        this.scrollToLast = true;
        this.pendingEditId = arg.id;
        this.getSegments(this.start, this.count);
    }

    segmentsReset(arg: { count: number, start: number }): void {
        this.unitsCount = arg.count;
        (document.getElementById('units') as HTMLSpanElement).innerText = '' + this.unitsCount;

        this.count = this.UNITSLOAD > this.unitsCount ? this.unitsCount : this.UNITSLOAD;
        this.start = arg.start - (this.UNITSLOAD / 2);
        if (this.start < 0) {
            this.start = 0;
        }
        if (this.count + this.start >= this.unitsCount) {
            this.start = this.unitsCount - this.count;
            if (this.start < 0) {
                this.start = 0;
            }
        }

        this.scroll = true;
        this.scrollToFirst = this.start === 0;
        this.scrollToLast = this.start + this.count >= this.unitsCount;
        this.getSegments(this.start, this.count);
    }
}