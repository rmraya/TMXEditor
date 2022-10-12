/*******************************************************************************
 * Copyright (c) 2018-2022 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

class Main {

    electron = require('electron');

    languages: any;
    isLoaded: boolean = false;

    topBar: HTMLDivElement;
    mainPanel: HTMLDivElement;
    bottomBar: HTMLDivElement;

    currentPage: number = 0;
    maxPage: number = 0;
    unitsPage: number = 500;
    unitsCount: number;

    attributes: Array<string[]>;
    attributesType: string;
    properties: Array<string[]>;
    notes: string[];

    currentId: string = null;
    currentLang: string = null;
    currentCell: HTMLTableCellElement = null;
    currentContent: string = null;
    selectedUnits: string[] = [];

    static EDIT: string = '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M2.25 15.75H5.0625L13.3575 7.45502L10.545 4.64252L2.25 12.9375V15.75ZM3.75 13.56L10.545 6.76502L11.235 7.45502L4.44 14.25H3.75V13.56Z" />' +
        '<path d="M13.7775 2.46751C13.485 2.17501 13.0125 2.17501 12.72 2.46751L11.3475 3.84001L14.16 6.65251L15.5325 5.28001C15.825 4.98751 15.825 4.51501 15.5325 4.22251L13.7775 2.46751Z" />' +
        '</svg>';

    constructor() {

        this.createTopToolbar();
        this.createCenterPanel();
        this.createBottomToolbar();

        setTimeout(() => {
            this.resize();
        }, 200);

        window.addEventListener('resize', () => { this.resize(); });

        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('request-theme', () => {
            this.electron.ipcRenderer.send('get-theme');
        });
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
        this.electron.ipcRenderer.on('unit-inserted', (event, arg) => {
            this.unitInserted(arg);
        });
    }

    resize(): void {
        let height: number = document.body.clientHeight;
        let width: number = document.body.clientWidth;

        this.mainPanel.style.height = (height - this.topBar.clientHeight - this.bottomBar.clientHeight) + 'px';
        this.mainPanel.style.width = width + 'px';
    }

    createTopToolbar() {
        this.topBar = document.getElementById('topBar') as HTMLDivElement;

        let openFile: HTMLAnchorElement = document.createElement('a');
        openFile.classList.add('tooltip');
        openFile.innerHTML = '<svg version="1.1" viewBox="0 0 24 24" height="24" width="24"><path  id="path299" d="m 20.0575,11.2 -1.154167,7.2 H 5.0966667 L 3.9425,11.2 Z M 8.6433333,4 h -5.81 l 0.595,4 H 5.1125 L 4.755,5.6 H 7.8333333 C 8.76,6.7104 9.46,7.2 11.3975,7.2 h 7.735833 L 18.966667,8 h 1.7 l 0.5,-2.4 H 11.3975 C 9.7491667,5.6 9.6966667,5.2664 8.6433333,4 Z M 22,9.6 H 2 L 3.6666667,20 H 20.333333 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Open File</span>';
        openFile.addEventListener('click', () => {
            this.openFile();
        });
        this.topBar.appendChild(openFile);

        let newFile: HTMLAnchorElement = document.createElement('a');
        newFile.classList.add('tooltip');
        newFile.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path  d="m 21,16.166667 h -2.454545 v -2.5 h -1.636364 v 2.5 h -2.454546 v 1.666666 h 2.454546 v 2.5 h 1.636364 v -2.5 H 21 Z m -5.727273,4.166666 V 22 H 3 V 2 h 8.336455 c 2.587909,0 8.027181,6.0191667 8.027181,8.011667 V 12 h -1.636363 v -1.285833 c 0,-3.4225003 -4.909091,-2.0475003 -4.909091,-2.0475003 0,0 1.242,-5 -2.158364,-5 H 4.6363636 V 20.333333 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">New File</span>';
        newFile.addEventListener('click', () => {
            this.newFile();
        });
        this.topBar.appendChild(newFile);

        let saveFile: HTMLAnchorElement = document.createElement('a');
        saveFile.classList.add('tooltip');
        saveFile.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path  d="m 13.555556,3.6666667 v 9.1666663 h 1.952222 L 12,17.008333 8.4922222,12.833333 H 10.444444 V 3.6666667 Z M 15.111111,2 H 8.8888889 v 9.166667 H 5 L 12,19.5 19,11.166667 h -3.888889 z m 2.333333,15.833333 v 2.5 H 6.5555556 v -2.5 H 5 V 22 h 14 v -4.166667 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Save File</span>';
        saveFile.addEventListener('click', () => {
            this.saveFile();
        });
        this.topBar.appendChild(saveFile);

        let showFileInfo: HTMLAnchorElement = document.createElement('a');
        showFileInfo.classList.add('tooltip');
        showFileInfo.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 0.833333,15 h -1.666666 v -6.666667 h 1.666666 z M 12,6.7916667 c 0.575,0 1.041667,0.4666666 1.041667,1.0416666 C 13.041667,8.4083333 12.575,8.875 12,8.875 c -0.575,0 -1.041667,-0.4666667 -1.041667,-1.0416667 0,-0.575 0.466667,-1.0416666 1.041667,-1.0416666 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">File Properties</span>';
        showFileInfo.addEventListener('click', () => {
            this.showFileInfo();
        });
        this.topBar.appendChild(showFileInfo);

        let span1: HTMLSpanElement = document.createElement('span');
        span1.style.width = '30px';
        span1.innerHTML = '&nbsp;';
        this.topBar.appendChild(span1);

        let saveEdit: HTMLAnchorElement = document.createElement('a');
        saveEdit.classList.add('tooltip');
        saveEdit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 3.660833,6.25 -4.7025,4.82 L 8.755,10.981667 7.2083333,12.53 l 3.7499997,3.636667 6.25,-6.369167 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Confirm Edit</span>';
        saveEdit.addEventListener('click', () => {
            this.saveEdit();
        });
        this.topBar.appendChild(saveEdit);

        let cancelEdit: HTMLAnchorElement = document.createElement('a');
        cancelEdit.classList.add('tooltip');
        cancelEdit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 5,13.781667 -3.826667,-3.79 L 16.961667,8.1691667 15.781667,7 11.994167,10.824167 8.1708333,7.0383333 7,8.2091667 10.8275,12.0025 7.0383333,15.829167 8.2091667,17 12.005,13.17 l 3.825833,3.791667 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Cancel Edit</span>';
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
        replaceText.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 13.515011,15.871667 C 12.454179,16.535833 11.243347,16.918333 10.013349,17 L 9.5658494,15.3475 c 1.7358316,-0.01583 3.4433286,-0.7925 4.5749936,-2.27 1.779165,-2.325 1.519998,-5.575 -0.479166,-7.615 L 12.185013,7.3908333 10.710015,2 h 5.537492 l -1.564164,2.1275 c 2.562496,2.4508333 3.067496,6.3825 1.185831,9.385 L 22,19.643333 19.643336,22 Z M 4.3283562,14.935 C 2.8025249,13.480833 2.0050259,11.496667 2.000026,9.5 1.9958593,7.91 2.4933586,6.315 3.5333573,4.9566667 4.8975221,3.175 6.9091862,2.1516667 8.9908502,2.0158333 l 0.4533327,1.6508334 c -1.7391644,0.0125 -3.4516622,0.8241666 -4.584994,2.305 C 3.0766912,8.3008333 3.3408575,11.559167 5.3500216,13.6 L 6.828353,11.669167 8.3100177,17 H 2.7775249 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Replace Text</span>';
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
        insertUnit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 5,10.833333 H 12.833333 V 17 H 11.166667 V 12.833333 H 7 v -1.666666 h 4.166667 V 7 h 1.666666 v 4.166667 H 17 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Insert Unit</span>';
        insertUnit.addEventListener('click', () => {
            this.insertUnit();
        });
        this.topBar.appendChild(insertUnit);

        let deleteUnits: HTMLAnchorElement = document.createElement('a');
        deleteUnits.classList.add('tooltip');
        deleteUnits.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 5,10.833333 H 7 v -1.666666 h 10 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Delete Selected Units</span>';
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
        sortUnits.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="m 8.666667,10.444444 v 3.111112 H 12 L 7,19 2,13.555556 H 5.333333 V 10.444444 H 2 L 7,5 12,10.444444 Z M 22,14.333333 h -8.333333 v 1.555556 H 22 Z M 22,19 H 13.666667 V 17.444444 H 22 Z m 0,-6.222222 H 13.666667 V 11.222222 H 22 Z M 22,9.6666667 H 13.666667 V 8.1111111 H 22 Z M 22,6.5555556 H 13.666667 V 5 H 22 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Sort Units</span>';
        sortUnits.addEventListener('click', () => {
            this.sortUnits();
        });
        this.topBar.appendChild(sortUnits);

        let filterUnits: HTMLAnchorElement = document.createElement('a');
        filterUnits.id = 'filterUnits';
        filterUnits.classList.add('tooltip');
        filterUnits.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 18.091348,3.6666667 11.913044,14.119167 v 4.936666 l -0.826087,-0.5 V 14.119167 L 4.9086522,3.6666667 Z M 21,2 H 2 L 9.4347826,14.578333 V 19.5 L 13.565217,22 v -7.421667 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Filter Units</span>';
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
        maintenance.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M11 7h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6zM7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zM20.1 3H3.9c-.5 0-.9.4-.9.9v16.2c0 .4.4.9.9.9h16.2c.4 0 .9-.5.9-.9V3.9c0-.5-.5-.9-.9-.9zM19 19H5V5h14v14z"/></svg>' +
            '<span class="tooltiptext bottomTooltip">Maintenance Dashboard</span>';
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
        convertCSV.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M19,5v3H5V5H19z M19,10v4H5v-4H19z M5,19v-3h14v3H5z"/></svg>' +
            '<span class="tooltiptext bottomTooltip">Convert CSV File to TMX</span>';
        convertCSV.addEventListener('click', () => {
            this.convertCSV();
        });
        this.topBar.appendChild(convertCSV);

        let convertExcel: HTMLAnchorElement = document.createElement('a');
        convertExcel.classList.add('tooltip');
        convertExcel.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g>' +
            '<path d="M13.5 23.5C13.4745 23.5 13.4491 23.498 13.424 23.494L0.424 21.494C0.305983 21.4759 0.198357 21.4161 0.120589 21.3255C0.0428206 21.2349 4.54341e-05 21.1194 0 21L0 4C6.66312e-05 3.88691 0.0384697 3.77718 0.10894 3.68873C0.179409 3.60028 0.277783 3.53833 0.388 3.513L13.388 0.513002C13.4613 0.495567 13.5376 0.495025 13.6111 0.511416C13.6847 0.527807 13.7535 0.560702 13.8125 0.607615C13.8714 0.654528 13.9189 0.714231 13.9514 0.782209C13.9839 0.850187 14.0005 0.924662 14 1V23C14.0005 23.0658 13.988 23.1311 13.963 23.192C13.9381 23.2529 13.9013 23.3082 13.8547 23.3547C13.8082 23.4013 13.7529 23.4381 13.692 23.463C13.6311 23.488 13.5658 23.5005 13.5 23.5V23.5ZM1 20.571L13 22.417V1.628L1 4.398V20.571V20.571Z"/>' +
            '<path d="M23.5 21.5H13.5C13.3674 21.5 13.2402 21.4473 13.1464 21.3536C13.0527 21.2598 13 21.1326 13 21C13 20.8674 13.0527 20.7402 13.1464 20.6464C13.2402 20.5527 13.3674 20.5 13.5 20.5H23V3.5H13.5C13.3674 3.5 13.2402 3.44732 13.1464 3.35355C13.0527 3.25979 13 3.13261 13 3C13 2.86739 13.0527 2.74021 13.1464 2.64645C13.2402 2.55268 13.3674 2.5 13.5 2.5H23.5C23.6326 2.5 23.7598 2.55268 23.8536 2.64645C23.9473 2.74021 24 2.86739 24 3V21C24 21.1326 23.9473 21.2598 23.8536 21.3536C23.7598 21.4473 23.6326 21.5 23.5 21.5ZM9.5 16.5C9.41514 16.5003 9.33163 16.4788 9.25741 16.4377C9.18319 16.3966 9.12073 16.3371 9.076 16.265L4.076 8.265C4.0412 8.20932 4.01771 8.14733 4.00686 8.08257C3.99602 8.01781 3.99804 7.95155 4.0128 7.88757C4.04262 7.75836 4.12255 7.64628 4.235 7.576C4.34745 7.50572 4.48322 7.48299 4.61243 7.5128C4.74164 7.54262 4.85372 7.62255 4.924 7.735L9.924 15.735C9.9713 15.8107 9.99749 15.8977 9.99983 15.9869C10.0022 16.0761 9.98059 16.1643 9.93732 16.2424C9.89406 16.3204 9.83068 16.3855 9.75378 16.4308C9.67688 16.4761 9.58925 16.5 9.5 16.5V16.5Z"/>' +
            '<path d="M4.5 16.5C4.41075 16.5 4.32312 16.4761 4.24622 16.4308C4.16932 16.3855 4.10595 16.3204 4.06268 16.2424C4.01941 16.1643 3.99783 16.0761 4.00017 15.9869C4.00251 15.8977 4.0287 15.8107 4.076 15.735L9.076 7.735C9.14628 7.62255 9.25836 7.54262 9.38757 7.5128C9.51678 7.48299 9.65255 7.50572 9.765 7.576C9.87745 7.64628 9.95738 7.75836 9.9872 7.88757C10.017 8.01678 9.99428 8.15255 9.924 8.265L4.924 16.265C4.87906 16.3369 4.81656 16.3962 4.74239 16.4373C4.66821 16.4784 4.5848 16.5 4.5 16.5V16.5ZM17.5 21.5C17.3674 21.5 17.2402 21.4473 17.1464 21.3536C17.0527 21.2598 17 21.1326 17 21V3C17 2.86739 17.0527 2.74021 17.1464 2.64645C17.2402 2.55268 17.3674 2.5 17.5 2.5C17.6326 2.5 17.7598 2.55268 17.8536 2.64645C17.9473 2.74021 18 2.86739 18 3V21C18 21.1326 17.9473 21.2598 17.8536 21.3536C17.7598 21.4473 17.6326 21.5 17.5 21.5Z" />' +
            '<path d="M23.5 18.5H13.5C13.3674 18.5 13.2402 18.4473 13.1464 18.3536C13.0527 18.2598 13 18.1326 13 18C13 17.8674 13.0527 17.7402 13.1464 17.6464C13.2402 17.5527 13.3674 17.5 13.5 17.5H23.5C23.6326 17.5 23.7598 17.5527 23.8536 17.6464C23.9473 17.7402 24 17.8674 24 18C24 18.1326 23.9473 18.2598 23.8536 18.3536C23.7598 18.4473 23.6326 18.5 23.5 18.5ZM23.5 15.5H13.5C13.3674 15.5 13.2402 15.4473 13.1464 15.3536C13.0527 15.2598 13 15.1326 13 15C13 14.8674 13.0527 14.7402 13.1464 14.6464C13.2402 14.5527 13.3674 14.5 13.5 14.5H23.5C23.6326 14.5 23.7598 14.5527 23.8536 14.6464C23.9473 14.7402 24 14.8674 24 15C24 15.1326 23.9473 15.2598 23.8536 15.3536C23.7598 15.4473 23.6326 15.5 23.5 15.5ZM23.5 12.5H13.5C13.3674 12.5 13.2402 12.4473 13.1464 12.3536C13.0527 12.2598 13 12.1326 13 12C13 11.8674 13.0527 11.7402 13.1464 11.6464C13.2402 11.5527 13.3674 11.5 13.5 11.5H23.5C23.6326 11.5 23.7598 11.5527 23.8536 11.6464C23.9473 11.7402 24 11.8674 24 12C24 12.1326 23.9473 12.2598 23.8536 12.3536C23.7598 12.4473 23.6326 12.5 23.5 12.5ZM23.5 9.5H13.5C13.3674 9.5 13.2402 9.44732 13.1464 9.35355C13.0527 9.25979 13 9.13261 13 9C13 8.86739 13.0527 8.74021 13.1464 8.64645C13.2402 8.55268 13.3674 8.5 13.5 8.5H23.5C23.6326 8.5 23.7598 8.55268 23.8536 8.64645C23.9473 8.74021 24 8.86739 24 9C24 9.13261 23.9473 9.25979 23.8536 9.35355C23.7598 9.44732 23.6326 9.5 23.5 9.5ZM23.5 6.5H13.5C13.3674 6.5 13.2402 6.44732 13.1464 6.35355C13.0527 6.25979 13 6.13261 13 6C13 5.86739 13.0527 5.74021 13.1464 5.64645C13.2402 5.55268 13.3674 5.5 13.5 5.5H23.5C23.6326 5.5 23.7598 5.55268 23.8536 5.64645C23.9473 5.74021 24 5.86739 24 6C24 6.13261 23.9473 6.25979 23.8536 6.35355C23.7598 6.44732 23.6326 6.5 23.5 6.5Z"/>' +
            '</g></svg>' +
            '<span class="tooltiptext bottomTooltip">Convert Excel File to TMX</span>';
        convertExcel.addEventListener('click', () => {
            this.convertExcel();
        });
        this.topBar.appendChild(convertExcel);

        let convertSDLTM: HTMLAnchorElement = document.createElement('a');
        convertSDLTM.classList.add('tooltip');
        convertSDLTM.innerHTML = '<svg version="1.1" width="24" height="24" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" 	 viewBox="0 0 24 24" style="enable-background:new 0 0 24 24;" xml:space="preserve"> <path d="M20.8,6.8V4.4c0-0.1,0.1-0.6-0.3-1c-0.3-0.4-0.7-0.5-0.8-0.5c-3.8,0-7.5,0-11.3,0C8.2,3,7.9,3.1,7.6,3.4 	C7.4,3.7,7.3,4,7.3,4.1c0,0.6,0,1.1-0.1,1.7h1.5V4.7c0,0,0-0.1,0.1-0.2C8.9,4.4,8.9,4.3,9,4.3c1.7,0,3.4,0,5,0c0,0.5,0,1,0,1.5 	c0.3,0,0.6,0,1,0.1c0.2,0,0.8,0.2,1.3,0.7c0.4,0.4,0.6,0.9,0.6,1.1c0,1.7,0,3,0,3.3c0,0.1,0,0.3-0.2,0.6c-0.1,0.1-0.2,0.3-0.2,0.3 	c0.1,0.1,0.2,0.2,0.3,0.4c0,0,0.1,0.1,0.1,0.3c0.1,0.3,0.1,1.6,0.1,3.4c0,0.1-0.1,0.4-0.2,0.6c-0.1,0.2-0.2,0.3-0.3,0.4 	c0.1,0.1,0.3,0.4,0.4,0.7c0.1,0.4,0.1,0.7,0.1,0.8h2.4c0.8,0,1.4-0.6,1.4-1.4v-2.4c0-0.8-0.6-1.4-1.4-1.4c0.8,0,1.4-0.6,1.4-1.4V9.6 	c0-0.8-0.6-1.4-1.4-1.4C20.1,8.2,20.8,7.6,20.8,6.8z"/> <path d="M16.2,10.6V8.2c0-0.8-0.6-1.4-1.4-1.4H4c-0.8,0-1.4,0.6-1.4,1.4v2.4C2.7,11.3,3.3,12,4,12c-0.8,0-1.4,0.6-1.4,1.4v2.4 	c0,0.8,0.6,1.4,1.4,1.4c-0.8,0-1.4,0.6-1.4,1.4V21c0,0.8,0.6,1.4,1.4,1.4h10.8c0.8,0,1.4-0.6,1.4-1.4v-2.4c0-0.8-0.6-1.4-1.4-1.4 	c0.8,0,1.4-0.6,1.4-1.4v-2.4c0-0.8-0.6-1.4-1.4-1.4C15.6,12,16.2,11.3,16.2,10.6z M9.4,20.9h-5c0,0-0.1,0-0.2-0.1 	c0-0.1-0.1-0.1-0.1-0.2c0-0.6,0-1.1,0-1.7c0,0,0-0.1,0-0.2c0,0,0.1-0.1,0.2-0.1c0.3,0,4.7,0,5,0V20.9z M9.4,15.7h-5 	c0,0-0.1,0-0.2-0.1c0-0.1-0.1-0.1-0.1-0.2c0-0.6,0-1.1,0-1.7c0,0,0-0.1,0-0.2c0,0,0.1-0.1,0.2-0.1c0.3,0,4.7,0,5,0V15.7z M9.4,10.5 	h-5c0,0-0.1,0-0.2-0.1c0-0.1-0.1-0.1-0.1-0.2c0-0.6,0-1.1,0-1.7c0,0,0-0.1,0-0.2c0,0,0.1-0.1,0.2-0.1c0.3,0,4.7,0,5,0V10.5z"/> </svg> ' +
            '<span class="tooltiptext bottomTooltip">Convert SDLTM File to TMX</span>';
        convertSDLTM.addEventListener('click', () => {
            this.convertSDLTM();
        });
        this.topBar.appendChild(convertSDLTM);

        let filler: HTMLSpanElement = document.createElement('span');
        filler.classList.add('fill_width');
        filler.innerHTML = '&nbsp;';
        this.topBar.appendChild(filler);

        let openHelp: HTMLAnchorElement = document.createElement('a');
        openHelp.classList.add('tooltip');
        openHelp.innerHTML = '<svg version="1.1" viewBox="0 0 24 24" height="24" width="24"><path d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 1.041667,14.166667 c 0,0.575 -0.465834,1.041666 -1.041667,1.041666 -0.574167,0 -1.041667,-0.466666 -1.041667,-1.041666 0,-0.575 0.4675,-1.041667 1.041667,-1.041667 0.575833,0 1.041667,0.466667 1.041667,1.041667 z M 14.2025,7.835 C 13.695833,7.3216667 12.94,7.0391667 12.076667,7.0391667 10.26,7.0391667 9.085,8.3308333 9.085,10.330833 h 1.675833 c 0,-1.238333 0.690834,-1.6774997 1.281667,-1.6774997 0.528333,0 1.089167,0.3508334 1.136667,1.0216667 0.05167,0.705833 -0.325,1.064167 -0.801667,1.5175 -1.176667,1.119167 -1.198333,1.660833 -1.193333,2.89 H 12.855 c -0.01083,-0.553333 0.025,-1.0025 0.779167,-1.815 0.564166,-0.608333 1.265833,-1.365 1.28,-2.5183333 0.0092,-0.77 -0.236667,-1.4325 -0.711667,-1.9141667 z" /></svg>' +
            '<span class="tooltiptext bottomRightTooltip">User Guide</span>';
        openHelp.addEventListener('click', () => {
            this.openHelp();
        });
        this.topBar.appendChild(openHelp);
    }

    createCenterPanel(): void {
        this.mainPanel = document.getElementById('mainPanel') as HTMLDivElement;
        this.mainPanel.classList.add('lighter');

        let split: VerticalSplit = new VerticalSplit(this.mainPanel);
        split.setWeights([80, 20]);

        this.buildTable(split.leftPanel());
        this.buildRightPanels(split.rightPanel());

        this.mainPanel.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'PageUp' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
                event.preventDefault();
                event.cancelBubble = true;
                this.firstPage();
            }
            if (event.key === 'PageUp' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
                event.preventDefault();
                event.cancelBubble = true;
                this.previousPage();
            }
            if (event.key === 'PageDown' && (event.ctrlKey || event.metaKey) && !event.shiftKey) {
                event.preventDefault();
                event.cancelBubble = true;
                this.nextPage();
            }
            if (event.key === 'PageDown' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
                event.preventDefault();
                event.cancelBubble = true;
                this.lastPage();
            }
            if (this.currentCell !== null && (event.key === 'PageDown' || event.key === 'PageUp') && !(event.ctrlKey || event.metaKey)) {
                // prevent scrolling while editing
                event.preventDefault();
                event.cancelBubble = true;
            }
        });
    }

    buildTable(leftPanel: HTMLDivElement): void {

        let tableContainer: HTMLDivElement = document.createElement('div');
        tableContainer.classList.add('leftPaddedPanel');
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

        let th1: HTMLTableHeaderCellElement = document.createElement('th');
        th1.classList.add('fixed');
        tr.appendChild(th1);

        let selectAll: HTMLInputElement = document.createElement('input');
        selectAll.id = 'selectAll';
        selectAll.type = 'checkbox';
        selectAll.addEventListener('click', () => {
            this.toggleSelectAll();
        });
        th1.appendChild(selectAll);

        let th2: HTMLTableHeaderCellElement = document.createElement('th');
        tr.appendChild(th2);

        let th3: HTMLTableHeaderCellElement = document.createElement('th');
        tr.appendChild(th3);

        let tableBody: HTMLTableSectionElement = document.createElement('tbody');
        tableBody.id = 'tableBody';
        mainTable.appendChild(tableBody);
    }

    buildRightPanels(rightPanel: HTMLDivElement): void {
        let panelsContainer: HTMLDivElement = document.createElement('div');
        panelsContainer.classList.add('rightPaddedPanel');
        rightPanel.appendChild(panelsContainer);

        let config: any = { attributes: true, childList: false, subtree: false };
        let observer = new MutationObserver((mutationsList) => {
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

        let titleTable: HTMLTableElement = document.createElement('table');
        titleTable.classList.add('titlePanel');
        panelsContainer.appendChild(titleTable);

        let tableRow: HTMLTableRowElement = document.createElement('tr');
        titleTable.appendChild(tableRow);

        let attributesCell: HTMLTableCellElement = document.createElement('td');
        attributesCell.id = 'attributesSpan';
        attributesCell.classList.add('noWrap');
        attributesCell.innerText = 'TU';
        tableRow.appendChild(attributesCell);

        let cell: HTMLTableCellElement = document.createElement('td');
        cell.innerText = 'Attributes';
        cell.classList.add('fill_width');
        cell.style.marginLeft = '4px';
        tableRow.appendChild(cell);

        let editCell: HTMLTableCellElement = document.createElement('td');
        tableRow.appendChild(editCell);

        let editAttributes: HTMLAnchorElement = document.createElement('a');
        editAttributes.id = 'editAttributes';
        editAttributes.innerHTML = Main.EDIT;
        editAttributes.addEventListener('click', () => {
            this.editAttributes();
        });
        editCell.appendChild(editAttributes);

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
                    attributesPanel.style.height = (panelsContainer.clientHeight - titleTable.clientHeight) + 'px';
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

        let titleTable: HTMLTableElement = document.createElement('table');
        titleTable.classList.add('titlePanel');
        panelsContainer.appendChild(titleTable);

        let tableRow: HTMLTableRowElement = document.createElement('tr');
        titleTable.appendChild(tableRow);

        let propertiesCell: HTMLTableCellElement = document.createElement('td');
        propertiesCell.id = 'propertiesSpan';
        propertiesCell.classList.add('noWrap');
        propertiesCell.innerText = 'TU';
        tableRow.appendChild(propertiesCell);

        let cell: HTMLTableCellElement = document.createElement('td');
        cell.innerText = 'Properties';
        cell.classList.add('fill_width');
        cell.style.marginLeft = '4px';
        tableRow.appendChild(cell);

        let editCell: HTMLTableCellElement = document.createElement('td');
        tableRow.appendChild(editCell);

        let editProperties: HTMLAnchorElement = document.createElement('a');
        editProperties.id = 'editProperties';
        editProperties.innerHTML = Main.EDIT;
        editProperties.addEventListener('click', () => {
            this.editProperties();
        });
        editCell.appendChild(editProperties);

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
                    propertiesPanel.style.height = (panelsContainer.clientHeight - titleTable.clientHeight) + 'px';
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

        let titleTable: HTMLTableElement = document.createElement('table');
        titleTable.classList.add('titlePanel');
        panelsContainer.appendChild(titleTable);

        let tableRow: HTMLTableRowElement = document.createElement('tr');
        titleTable.appendChild(tableRow);

        let notesCell: HTMLTableCellElement = document.createElement('td');
        notesCell.id = 'notesSpan';
        notesCell.classList.add('noWrap');
        notesCell.innerText = 'TU';
        tableRow.appendChild(notesCell);

        let cell: HTMLTableCellElement = document.createElement('td');
        cell.innerText = 'Notes';
        cell.classList.add('fill_width');
        cell.style.marginLeft = '4px';
        tableRow.appendChild(cell);

        let editCell: HTMLTableCellElement = document.createElement('td');
        tableRow.appendChild(editCell);

        let editNotes: HTMLAnchorElement = document.createElement('a');
        editNotes.id = 'editNotes';
        editNotes.innerHTML = Main.EDIT;
        editNotes.addEventListener('click', () => {
            this.editNotes();
        });
        editCell.appendChild(editNotes);

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
                    notesPanel.style.height = (panelsContainer.clientHeight - titleTable.clientHeight) + 'px';
                    notesPanel.style.width = panelsContainer.clientWidth + 'px';
                }
            }
        });
        observer.observe(bottomPanel, config);
    }

    createBottomToolbar(): void {
        this.bottomBar = document.getElementById('bottomBar') as HTMLDivElement;

        let first: HTMLAnchorElement = document.createElement('a');
        first.id = 'first';
        first.classList.add('tooltip');
        first.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M18.41 16.59L13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z" /></svg>' +
            '<span class="tooltiptext topTooltip">First Page</span>';
        first.addEventListener('click', () => {
            this.firstPage();
        });
        this.bottomBar.appendChild(first);

        let previous: HTMLAnchorElement = document.createElement('a');
        previous.id = 'previous';
        previous.classList.add('tooltip');
        previous.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" /></svg>' +
            '<span class="tooltiptext topTooltip">Previous Page</span>';
        previous.addEventListener('click', () => {
            this.previousPage();
        });
        this.bottomBar.appendChild(previous);

        let span: HTMLSpanElement = document.createElement('span');
        span.innerText = 'Page';
        span.style.marginLeft = '10px';
        span.style.marginTop = '4px';
        this.bottomBar.appendChild(span);

        let pageDiv: HTMLDivElement = document.createElement('div');
        pageDiv.classList.add('tooltip');
        this.bottomBar.appendChild(pageDiv);

        let page: HTMLInputElement = document.createElement('input');
        page.id = 'page';
        page.type = 'number';
        page.value = '0';
        page.style.marginLeft = '10px';
        page.style.marginTop = '4px';
        page.style.width = '50px';
        page.addEventListener('keydown', (ev: KeyboardEvent) => {
            this.setPage(ev);
        });
        pageDiv.appendChild(page);

        let pageTooltip: HTMLSpanElement = document.createElement('span');
        pageTooltip.classList.add('tooltiptext');
        pageTooltip.classList.add('topTooltip');
        pageTooltip.innerText = 'Enter page number and press ENTER';
        pageDiv.appendChild(pageTooltip);

        let ofSpan: HTMLSpanElement = document.createElement('span');
        ofSpan.innerText = 'of ';
        ofSpan.style.marginLeft = '10px';
        ofSpan.style.marginTop = '4px';
        this.bottomBar.appendChild(ofSpan);

        let pages: HTMLSpanElement = document.createElement('span');
        pages.id = 'pages';
        pages.innerText = '0';
        pages.style.marginLeft = '10px';
        pages.style.marginTop = '4px';
        pages.style.width = '60px';
        this.bottomBar.appendChild(pages);

        let next: HTMLAnchorElement = document.createElement('a');
        next.id = 'next';
        next.classList.add('tooltip');
        next.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" /></svg>' +
            '<span class="tooltiptext topTooltip">Next Page</span>';
        next.addEventListener('click', () => {
            this.nextPage();
        });
        this.bottomBar.appendChild(next);

        let last: HTMLAnchorElement = document.createElement('a');
        last.id = 'last';
        last.classList.add('tooltip');
        last.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M5.59 7.41L10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z" /></svg>' +
            '<span class="tooltiptext topTooltip">Last Page</span>';
        last.addEventListener('click', () => {
            this.lastPage();
        });
        this.bottomBar.appendChild(last);

        let unitsPage: HTMLSpanElement = document.createElement('span');
        unitsPage.innerText = 'Units Page';
        unitsPage.style.marginLeft = '10px';
        unitsPage.style.marginTop = '4px';
        this.bottomBar.appendChild(unitsPage);

        let unitsDiv: HTMLDivElement = document.createElement('div');
        unitsDiv.classList.add('tooltip');
        this.bottomBar.appendChild(unitsDiv);

        let units: HTMLInputElement = document.createElement('input');
        units.id = 'units_page';
        units.type = 'number';
        units.value = '500';
        units.style.marginLeft = '10px';
        units.style.marginTop = '4px';
        units.style.width = '50px';
        units.addEventListener('keydown', (ev: KeyboardEvent) => {
            this.setUnitsPage(ev);
        });
        unitsDiv.appendChild(units);

        let unitsTooltip: HTMLSpanElement = document.createElement('span');
        unitsTooltip.innerText = 'Enter number of units/page and press ENTER';
        unitsTooltip.classList.add('tooltiptext');
        unitsTooltip.classList.add('topTooltip');
        unitsDiv.appendChild(unitsTooltip);

        let unitsLabel: HTMLSpanElement = document.createElement('span');
        unitsLabel.innerText = 'Units: ';
        unitsLabel.style.marginLeft = '10px';
        unitsLabel.style.marginTop = '4px';
        this.bottomBar.appendChild(unitsLabel);

        let unitsCount: HTMLSpanElement = document.createElement('span');
        unitsCount.id = 'units';
        unitsCount.innerText = '0';
        unitsCount.style.marginLeft = '10px';
        unitsCount.style.marginTop = '4px';
        unitsCount.style.minWidth = '100px';
        this.bottomBar.appendChild(unitsCount);
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
        if (this.currentCell != null && this.currentCell.isContentEditable) {
            if (this.currentContent === this.currentCell.innerHTML) {
                this.cancelEdit();
                return;
            }
            this.electron.ipcRenderer.send('save-data', { id: this.currentId, lang: this.currentLang, data: this.currentCell.innerHTML });
            this.currentContent = this.currentCell.innerHTML;
            this.currentCell.contentEditable = 'false';
            this.currentCell.classList.remove('editing');
            this.currentCell = null;
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
        if (this.currentCell) {
            this.currentCell.innerHTML = this.currentContent;
            this.currentCell.contentEditable = 'false';
            this.currentCell.classList.remove('editing');
        }
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

    maintenanceDashboard(): void {
        this.electron.ipcRenderer.send('maintenance-dashboard');
    }

    convertCSV(): void {
        this.electron.ipcRenderer.send('convert-csv');
    }

    convertExcel(): void {
        this.electron.ipcRenderer.send('convert-excel');
    }

    convertSDLTM(): void {
        this.electron.ipcRenderer.send('convert-sdltm');
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
        var row = '<tr><th class="fixed"><input type="checkbox" id="selectAll"></th><th class="fixed">#</th>';
        let length: number = this.languages.length;
        for (let index = 0; index < length; ++index) {
            row = row + '<th>' + this.languages[index].code + ' - ' + arg[index].name + '</th>';
        }
        document.getElementById('tableHeader').innerHTML = row + '</tr>';
        document.getElementById('selectAll').addEventListener('click', () => {
            this.toggleSelectAll();
        });
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
        document.getElementById("tableHeader").innerHTML = '<tr><th class="fixed"><input type="checkbox" id="selectAll"></th><th class="fixed">#</th><th>&nbsp;</th><th>&nbsp;</th></tr>';
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
        document.getElementById('selectAll').addEventListener('click', () => {
            this.toggleSelectAll();
        });
        this.currentPage = 0;
        this.maxPage = 0;
        this.isLoaded = false;

        this.currentId = null;
        this.currentLang = null;
        this.currentCell = null;
        this.currentContent = null;
        this.selectedUnits = [];
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
        if (this.currentCell != null && this.currentCell.isContentEditable) {
            this.saveEdit();
        }
        var element: Element = (event.target as Element);
        if (element.parentElement.tagName === 'TH') {
            // clicked header
            return;
        }
        var x: string = element.tagName;
        var id: string;
        if ('TD' === x || 'INPUT' === x) {
            var composed = event.composedPath();
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
        if (this.currentCell !== null && this.currentCell.isContentEditable && (this.currentId !== id || this.currentLang !== lang)) {
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
                this.currentCell = (event.target as HTMLTableCellElement);
                this.currentContent = this.currentCell.innerHTML;
                this.currentCell.contentEditable = 'true';
                this.currentCell.classList.add('editing');
                this.currentCell.focus();
                this.electron.ipcRenderer.send('get-cell-properties', { id: this.currentId, lang: this.currentLang });
            }
        }
    }

    updateProperties(arg: any): void {
        console.log(JSON.stringify(arg))
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
        if (this.currentCell !== null && this.currentCell.isContentEditable) {
            this.saveEdit();
        }
        this.currentPage = 0;
        (document.getElementById('page') as HTMLInputElement).value = '1';
        this.getSegments();
    }

    previousPage(): void {
        if (this.currentPage > 0) {
            if (this.currentCell !== null && this.currentCell.isContentEditable) {
                this.saveEdit();
            }
            this.currentPage--;
            (document.getElementById('page') as HTMLInputElement).value = '' + (this.currentPage + 1);
            this.getSegments();
        }
    }

    nextPage(): void {
        if (this.currentPage < this.maxPage - 1) {
            if (this.currentCell !== null && this.currentCell.isContentEditable) {
                this.saveEdit();
            }
            this.currentPage++;
            (document.getElementById('page') as HTMLInputElement).value = '' + (this.currentPage + 1);
            this.getSegments();
        }
    }

    lastPage(): void {
        if (this.currentCell !== null && this.currentCell.isContentEditable) {
            this.saveEdit();
        }
        this.currentPage = this.maxPage - 1;
        (document.getElementById('page') as HTMLInputElement).value = '' + this.maxPage;
        this.getSegments();
    }

    setUnitsPage(event: KeyboardEvent): void {
        if (!this.isLoaded) {
            return;
        }
        if (event.code === 'Enter' || event.code === 'NumpadEnter') {
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
            if (this.currentCell !== null && this.currentCell.isContentEditable) {
                this.saveEdit();
            }
            this.firstPage();
        }
    }

    setPage(event: KeyboardEvent): void {
        if (!this.isLoaded) {
            return;
        }
        if (event.code === 'Enter' || event.code === 'NumpadEnter') {
            this.currentPage = Number.parseInt((document.getElementById('page') as HTMLInputElement).value) - 1;
            if (this.currentPage < 0) {
                this.currentPage = 0;
            }
            if (this.currentPage > this.maxPage - 1) {
                this.currentPage = this.maxPage - 1;
            }
            if (this.currentCell !== null && this.currentCell.isContentEditable) {
                this.saveEdit();
            }
            (document.getElementById('page') as HTMLInputElement).value = '' + (this.currentPage + 1);
            this.getSegments();
        }
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
        let tr: HTMLTableRowElement = document.createElement('tr');
        tr.id = arg;

        let td1: HTMLTableCellElement = document.createElement('td');
        td1.classList.add('fixed');
        td1.addEventListener('click', (ev: MouseEvent) => this.clickListener(ev));
        tr.appendChild(td1);

        let check: HTMLInputElement = document.createElement('input');
        check.type = 'checkbox';
        check.classList.add('rowCheck');
        td1.appendChild(check);

        let td2: HTMLTableCellElement = document.createElement('td');
        td2.classList.add('fixed');
        td2.innerText = '0';
        td1.addEventListener('click', (ev: MouseEvent) => this.clickListener(ev));
        tr.appendChild(td2);

        let length: number = this.languages.length;
        for (let index = 0; index < length; ++index) {
            let td: HTMLTableCellElement = document.createElement('td');
            td.lang = this.languages[index].code;
            td.classList.add("lang");
            td.contentEditable = 'false';
            td.addEventListener('click', (ev: MouseEvent) => this.clickListener(ev));
            tr.appendChild(td);
        }

        document.getElementById('tableBody').insertBefore(tr, document.getElementById('tableBody').firstChild);
    }
}

new Main();