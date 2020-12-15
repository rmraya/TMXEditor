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
    currentTags: string[] = [];
    selectedUnits: string[] = [];

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

        this.mainPanel.style.height = (height - this.topBar.clientHeight - this.bottomBar.clientHeight - 2) + 'px';
        this.mainPanel.style.width = width + 'px';
    }

    createTopToolbar() {
        this.topBar = document.getElementById('topBar') as HTMLDivElement;

        let openFile: HTMLAnchorElement = document.createElement('a');
        openFile.id = 'openFile';
        openFile.classList.add('tooltip');
        openFile.innerHTML = '<svg version="1.1" viewBox="0 0 24 24" height="24" width="24"><path style="stroke-width:0.816497" id="path299" d="m 20.0575,11.2 -1.154167,7.2 H 5.0966667 L 3.9425,11.2 Z M 8.6433333,4 h -5.81 l 0.595,4 H 5.1125 L 4.755,5.6 H 7.8333333 C 8.76,6.7104 9.46,7.2 11.3975,7.2 h 7.735833 L 18.966667,8 h 1.7 l 0.5,-2.4 H 11.3975 C 9.7491667,5.6 9.6966667,5.2664 8.6433333,4 Z M 22,9.6 H 2 L 3.6666667,20 H 20.333333 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Open File</span>';
        openFile.addEventListener('click', () => {
            this.openFile();
        });
        this.topBar.appendChild(openFile);

        let newFile: HTMLAnchorElement = document.createElement('a');
        newFile.id = 'newFile';
        newFile.classList.add('tooltip');
        newFile.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path style="stroke-width:0.825723" d="m 21,16.166667 h -2.454545 v -2.5 h -1.636364 v 2.5 h -2.454546 v 1.666666 h 2.454546 v 2.5 h 1.636364 v -2.5 H 21 Z m -5.727273,4.166666 V 22 H 3 V 2 h 8.336455 c 2.587909,0 8.027181,6.0191667 8.027181,8.011667 V 12 h -1.636363 v -1.285833 c 0,-3.4225003 -4.909091,-2.0475003 -4.909091,-2.0475003 0,0 1.242,-5 -2.158364,-5 H 4.6363636 V 20.333333 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">New File</span>';
        newFile.addEventListener('click', () => {
            this.newFile();
        });
        this.topBar.appendChild(newFile);

        let saveFile: HTMLAnchorElement = document.createElement('a');
        saveFile.id = 'saveFile';
        saveFile.classList.add('tooltip');
        saveFile.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path style="stroke-width:0.805077" d="m 13.555556,3.6666667 v 9.1666663 h 1.952222 L 12,17.008333 8.4922222,12.833333 H 10.444444 V 3.6666667 Z M 15.111111,2 H 8.8888889 v 9.166667 H 5 L 12,19.5 19,11.166667 h -3.888889 z m 2.333333,15.833333 v 2.5 H 6.5555556 v -2.5 H 5 V 22 h 14 v -4.166667 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Save File</span>';
        saveFile.addEventListener('click', () => {
            this.saveFile();
        });
        this.topBar.appendChild(saveFile);

        let showFileInfo: HTMLAnchorElement = document.createElement('a');
        showFileInfo.id = 'showFileInfo';
        showFileInfo.classList.add('tooltip');
        showFileInfo.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path style="stroke-width:0.833333" d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 0.833333,15 h -1.666666 v -6.666667 h 1.666666 z M 12,6.7916667 c 0.575,0 1.041667,0.4666666 1.041667,1.0416666 C 13.041667,8.4083333 12.575,8.875 12,8.875 c -0.575,0 -1.041667,-0.4666667 -1.041667,-1.0416667 0,-0.575 0.466667,-1.0416666 1.041667,-1.0416666 z" /></svg>' +
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
        saveEdit.id = 'saveEdit';
        saveEdit.classList.add('tooltip');
        saveEdit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path style="stroke-width:0.833333" d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 3.660833,6.25 -4.7025,4.82 L 8.755,10.981667 7.2083333,12.53 l 3.7499997,3.636667 6.25,-6.369167 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Confirm Edit</span>';
        saveEdit.addEventListener('click', () => {
            this.saveEdit();
        });
        this.topBar.appendChild(saveEdit);

        let cancelEdit: HTMLAnchorElement = document.createElement('a');
        cancelEdit.id = 'cancelEdit';
        cancelEdit.classList.add('tooltip');
        cancelEdit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path style="stroke-width:0.833333" d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 5,13.781667 -3.826667,-3.79 L 16.961667,8.1691667 15.781667,7 11.994167,10.824167 8.1708333,7.0383333 7,8.2091667 10.8275,12.0025 7.0383333,15.829167 8.2091667,17 12.005,13.17 l 3.825833,3.791667 z" /></svg>' +
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
        replaceText.id = 'replaceText';
        replaceText.classList.add('tooltip');
        replaceText.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path style="stroke-width:0.833333" d="M 13.515011,15.871667 C 12.454179,16.535833 11.243347,16.918333 10.013349,17 L 9.5658494,15.3475 c 1.7358316,-0.01583 3.4433286,-0.7925 4.5749936,-2.27 1.779165,-2.325 1.519998,-5.575 -0.479166,-7.615 L 12.185013,7.3908333 10.710015,2 h 5.537492 l -1.564164,2.1275 c 2.562496,2.4508333 3.067496,6.3825 1.185831,9.385 L 22,19.643333 19.643336,22 Z M 4.3283562,14.935 C 2.8025249,13.480833 2.0050259,11.496667 2.000026,9.5 1.9958593,7.91 2.4933586,6.315 3.5333573,4.9566667 4.8975221,3.175 6.9091862,2.1516667 8.9908502,2.0158333 l 0.4533327,1.6508334 c -1.7391644,0.0125 -3.4516622,0.8241666 -4.584994,2.305 C 3.0766912,8.3008333 3.3408575,11.559167 5.3500216,13.6 L 6.828353,11.669167 8.3100177,17 H 2.7775249 Z" /></svg>' +
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
        insertUnit.id = 'insertUnit';
        insertUnit.classList.add('tooltip');
        insertUnit.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path style="stroke-width:0.833333" d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 5,10.833333 H 12.833333 V 17 H 11.166667 V 12.833333 H 7 v -1.666666 h 4.166667 V 7 h 1.666666 v 4.166667 H 17 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Insert Unit</span>';
        insertUnit.addEventListener('click', () => {
            this.insertUnit();
        });
        this.topBar.appendChild(insertUnit);

        let deleteUnits: HTMLAnchorElement = document.createElement('a');
        deleteUnits.id = 'deleteUnits';
        deleteUnits.classList.add('tooltip');
        deleteUnits.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path style="stroke-width:0.833333" d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 5,10.833333 H 7 v -1.666666 h 10 z" /></svg>' +
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
        sortUnits.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path style="stroke-width:0.805077" d="m 8.666667,10.444444 v 3.111112 H 12 L 7,19 2,13.555556 H 5.333333 V 10.444444 H 2 L 7,5 12,10.444444 Z M 22,14.333333 h -8.333333 v 1.555556 H 22 Z M 22,19 H 13.666667 V 17.444444 H 22 Z m 0,-6.222222 H 13.666667 V 11.222222 H 22 Z M 22,9.6666667 H 13.666667 V 8.1111111 H 22 Z M 22,6.5555556 H 13.666667 V 5 H 22 Z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Sort Units</span>';
        sortUnits.addEventListener('click', () => {
            this.sortUnits();
        });
        this.topBar.appendChild(sortUnits);

        let filterUnits: HTMLAnchorElement = document.createElement('a');
        filterUnits.id = 'filterUnits';
        filterUnits.classList.add('tooltip');
        filterUnits.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 24 24" height="24" width="24"><path style="stroke-width:0.829702" d="M 18.091348,3.6666667 11.913044,14.119167 v 4.936666 l -0.826087,-0.5 V 14.119167 L 4.9086522,3.6666667 Z M 21,2 H 2 L 9.4347826,14.578333 V 19.5 L 13.565217,22 v -7.421667 z" /></svg>' +
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
        maintenance.id = 'maintenance';
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
        convertCSV.id = 'convertCSV';
        convertCSV.classList.add('tooltip');
        convertCSV.innerHTML = '<svg version="1.1" viewBox="0 0 24 24" height="24" width="24"><path style="stroke-width:0.802308" d="M 18.617507,14.296663 H 22 v 1.549444 H 18.617507 V 19 h -1.661751 v -3.153893 h -3.382494 v -1.549444 h 3.382494 V 11.14277 h 1.661751 z m -6.647003,4.648332 H 2 v -1.549444 h 9.970504 z m 0,-3.117481 H 2 V 14.27807 h 9.970504 z m 0,-3.080295 H 2 v -1.549444 h 9.970504 z M 21.941008,9.6483316 H 2 V 8.0988877 h 19.941008 z m 0,-3.0988877 H 2 V 5 h 19.941008 z" /></svg>' +
            '<span class="tooltiptext bottomTooltip">Convert CSV to TMX</span>';
        convertCSV.addEventListener('click', () => {
            this.convertCSV();
        });
        this.topBar.appendChild(convertCSV);

        let filler: HTMLSpanElement = document.createElement('span');
        filler.classList.add('fill_width');
        filler.innerHTML = '&nbsp;';
        this.topBar.appendChild(filler);

        let openHelp: HTMLAnchorElement = document.createElement('a');
        openHelp.id = 'openHelp';
        openHelp.classList.add('tooltip');
        openHelp.innerHTML = '<svg version="1.1" viewBox="0 0 24 24" height="24" width="24"><path style="stroke-width:0.833333" d="M 12,3.6666667 C 16.595,3.6666667 20.333333,7.405 20.333333,12 20.333333,16.595 16.595,20.333333 12,20.333333 7.405,20.333333 3.6666667,16.595 3.6666667,12 3.6666667,7.405 7.405,3.6666667 12,3.6666667 Z M 12,2 C 6.4775,2 2,6.4775 2,12 2,17.5225 6.4775,22 12,22 17.5225,22 22,17.5225 22,12 22,6.4775 17.5225,2 12,2 Z m 1.041667,14.166667 c 0,0.575 -0.465834,1.041666 -1.041667,1.041666 -0.574167,0 -1.041667,-0.466666 -1.041667,-1.041666 0,-0.575 0.4675,-1.041667 1.041667,-1.041667 0.575833,0 1.041667,0.466667 1.041667,1.041667 z M 14.2025,7.835 C 13.695833,7.3216667 12.94,7.0391667 12.076667,7.0391667 10.26,7.0391667 9.085,8.3308333 9.085,10.330833 h 1.675833 c 0,-1.238333 0.690834,-1.6774997 1.281667,-1.6774997 0.528333,0 1.089167,0.3508334 1.136667,1.0216667 0.05167,0.705833 -0.325,1.064167 -0.801667,1.5175 -1.176667,1.119167 -1.198333,1.660833 -1.193333,2.89 H 12.855 c -0.01083,-0.553333 0.025,-1.0025 0.779167,-1.815 0.564166,-0.608333 1.265833,-1.365 1.28,-2.5183333 0.0092,-0.77 -0.236667,-1.4325 -0.711667,-1.9141667 z" /></svg>' +
            '<span class="tooltiptext bottomRightTooltip">User Guide</span>';
        openHelp.addEventListener('click', () => {
            this.openHelp();
        });
        this.topBar.appendChild(openHelp);
    }

    createCenterPanel(): void {
        this.mainPanel = document.getElementById('mainPanel') as HTMLDivElement;

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
        leftPanel.classList.add('divContainer');

        let mainTable: HTMLTableElement = document.createElement('table');
        mainTable.id = 'mainTable';
        mainTable.classList.add('stripes');
        leftPanel.appendChild(mainTable);

        let thead: HTMLTableSectionElement = document.createElement('thead');
        thead.id = 'tableHeader';
        mainTable.appendChild(thead);

        let tr: HTMLTableRowElement = document.createElement('tr');
        tr.classList.add('dark_background');
        thead.appendChild(tr);

        let th1: HTMLTableHeaderCellElement = document.createElement('th');
        th1.classList.add('fixed');
        th1.classList.add('dark_background');
        tr.appendChild(th1);

        let selectAll: HTMLInputElement = document.createElement('input');
        selectAll.id = 'selectAll';
        selectAll.type = 'checkbox';
        selectAll.addEventListener('click', () => {
            this.toggleSelectAll();
        });
        th1.appendChild(selectAll);

        let th2: HTMLTableHeaderCellElement = document.createElement('th');
        th2.classList.add('dark_background');
        tr.appendChild(th2);

        let th3: HTMLTableHeaderCellElement = document.createElement('th');
        th3.classList.add('dark_background');
        tr.appendChild(th3);

        let tableBody: HTMLTableSectionElement = document.createElement('tbody');
        tableBody.id = 'tableBody';
        mainTable.appendChild(tableBody);
    }

    buildRightPanels(rightPanel: HTMLDivElement): void {
        let divider: ThreeHorizontalPanels = new ThreeHorizontalPanels(rightPanel);

        this.createAttributesPanel(divider.topPanel());
        this.createPropertiesPanel(divider.centerPanel());
        this.createNotesPanel(divider.bottomPanel());
    }

    createAttributesPanel(topPanel: HTMLDivElement): void {
        topPanel.id = 'topPanel';

        let toolbar: HTMLDivElement = document.createElement('div');
        toolbar.classList.add('toolbar');
        topPanel.appendChild(toolbar);

        let attributesSpan: HTMLSpanElement = document.createElement('span');
        attributesSpan.id = 'attributesSpan';
        attributesSpan.classList.add('noWrap');
        attributesSpan.innerText = 'TU';
        toolbar.appendChild(attributesSpan);

        let span: HTMLSpanElement = document.createElement('span');
        span.innerText = 'Attributes';
        span.classList.add('fill_width');
        span.style.marginLeft = '4px';
        toolbar.appendChild(span);

        let editAttributes: HTMLAnchorElement = document.createElement('a');
        editAttributes.id = 'editAttributes';
        editAttributes.classList.add('tooltip');
        editAttributes.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke-width="2" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke-width="2" /></svg>' +
            '<span class="tooltiptext bottomRightTooltip">Edit Attributes</span>';
        editAttributes.addEventListener('click', () => {
            this.editAttributes();
        });
        toolbar.appendChild(editAttributes);

        let attributesPanel: HTMLDivElement = document.createElement('div');
        attributesPanel.id = 'attributesPanel';
        attributesPanel.classList.add('divContainer');
        topPanel.appendChild(attributesPanel);

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
                    attributesPanel.style.height = (topPanel.clientHeight - toolbar.clientHeight) + 'px';
                    attributesPanel.style.width = topPanel.clientWidth + 'px';
                }
            }
        });
        observer.observe(topPanel, config);
    }

    createPropertiesPanel(centerPanel: HTMLDivElement): void {
        centerPanel.id = 'centerPanel';

        let toolbar: HTMLDivElement = document.createElement('div');
        toolbar.classList.add('toolbar');
        centerPanel.appendChild(toolbar);

        let propertiesSpan: HTMLSpanElement = document.createElement('span');
        propertiesSpan.id = 'propertiesSpan';
        propertiesSpan.classList.add('noWrap');
        propertiesSpan.innerText = 'TU';
        toolbar.appendChild(propertiesSpan);

        let span: HTMLSpanElement = document.createElement('span');
        span.innerText = 'Properties';
        span.classList.add('fill_width');
        span.style.marginLeft = '4px';
        toolbar.appendChild(span);

        let editProperties: HTMLAnchorElement = document.createElement('a');
        editProperties.id = 'editProperties';
        editProperties.classList.add('tooltip');
        editProperties.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke-width="2" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke-width="2" /></svg>' +
            '<span class="tooltiptext bottomRightTooltip">Edit Properties</span>';
        editProperties.addEventListener('click', () => {
            this.editProperties();
        });
        toolbar.appendChild(editProperties);

        let propertiesPanel: HTMLDivElement = document.createElement('div');
        propertiesPanel.id = 'propertiesPanel';
        centerPanel.appendChild(propertiesPanel);

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
                    propertiesPanel.style.height = (centerPanel.clientHeight - toolbar.clientHeight) + 'px';
                    propertiesPanel.style.width = centerPanel.clientWidth + 'px';
                }
            }
        });
        observer.observe(centerPanel, config);
    }

    createNotesPanel(bottomPanel: HTMLDivElement): void {
        bottomPanel.id = 'bottomPanel';

        let toolbar: HTMLDivElement = document.createElement('div');
        toolbar.classList.add('toolbar');
        bottomPanel.appendChild(toolbar);

        let notesSpan: HTMLSpanElement = document.createElement('span');
        notesSpan.id = 'notesSpan';
        notesSpan.classList.add('noWrap');
        notesSpan.innerText = 'TU';
        toolbar.appendChild(notesSpan);

        let span: HTMLSpanElement = document.createElement('span');
        span.innerText = 'Notes';
        span.classList.add('fill_width');
        span.style.marginLeft = '4px';
        toolbar.appendChild(span);

        let editNotes: HTMLAnchorElement = document.createElement('a');
        editNotes.id = 'editNotes';
        editNotes.classList.add('tooltip');
        editNotes.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" class="feather feather-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke-width="2" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke-width="2" /></svg>' +
            '<span class="tooltiptext bottomRightTooltip">Edit Notes</span>';
        editNotes.addEventListener('click', () => {
            this.editNotes();
        });
        toolbar.appendChild(editNotes);

        let notesPanel: HTMLDivElement = document.createElement('div');
        notesPanel.id = 'notesPanel';
        bottomPanel.appendChild(notesPanel);

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
                    notesPanel.style.height = (bottomPanel.clientHeight - toolbar.clientHeight) + 'px';
                    notesPanel.style.width = bottomPanel.clientWidth + 'px';
                }
            }
        });
        observer.observe(bottomPanel, config);
    }

    createBottomToolbar(): void {
        this.bottomBar = document.getElementById('bottomBar') as HTMLDivElement;
        this.bottomBar.classList.add('toolbar');

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
        var row = '<tr class="dark_background"><th class="dark_background fixed"><input type="checkbox" id="selectAll"></th><th class="dark_background fixed">#</th>';
        let length: number = this.languages.length;
        for (let index = 0; index < length; ++index) {
            row = row + '<th class="dark_background">' + this.languages[index].code + ' - ' + arg[index].name + '</th>';
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
        this.currentTags = [];
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