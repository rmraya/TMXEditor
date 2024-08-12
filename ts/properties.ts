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

class Properties {

    electron = require('electron');

    currentId: string;
    currentType: string;
    props: Array<string[]>;

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.send('get-unit-properties');
        this.electron.ipcRenderer.on('set-unit-properties', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setUnitProperties(arg);
        });
        this.electron.ipcRenderer.on('set-new-property', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setNewProperty(arg);
        });
        document.getElementById('addProperty').addEventListener('click', () => {
            this.addProperty();
        });
        document.getElementById('deleteProperties').addEventListener('click', () => {
            this.deleteProperties();
        });
        document.getElementById('save').addEventListener('click', () => {
            this.saveProperties();
        });

        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-properties');
            }
        });
        this.electron.ipcRenderer.send('properties-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    setUnitProperties(arg: any): void {
        this.currentId = arg.id;
        this.currentType = arg.type;
        this.props = arg.props;
        this.drawProperties();
    }

    saveProperties(): void {
        let lang = this.currentType === 'TU' ? '' : this.currentType;
        let arg = {
            id: this.currentId,
            lang: lang,
            properties: this.props
        }
        this.electron.ipcRenderer.send('save-properties', arg);
    }

    addProperty(): void {
        this.electron.ipcRenderer.send('show-add-property', 'properties');
    }

    setNewProperty(arg: any): void {
        let prop: string[] = [arg.type, arg.value];
        this.props.push(prop);
        this.drawProperties();
        (document.getElementById('save') as HTMLButtonElement).focus();
    }

    deleteProperties(): void {
        let collection: HTMLCollectionOf<Element> = document.getElementsByClassName('rowCheck');
        for (let check of collection) {
            if ((check as HTMLInputElement).checked) {
                this.removeProperty(check.id);
            }
        }
        this.drawProperties();
        (document.getElementById('save') as HTMLButtonElement).focus();
    }

    drawProperties(): void {
        let propsTable: HTMLTableElement = document.getElementById('propsTable') as HTMLTableElement;
        propsTable.innerHTML = '';
        for (let pair of this.props) {
            let tr: HTMLTableRowElement = document.createElement('tr');
            propsTable.appendChild(tr);
            let td: HTMLTableCellElement = document.createElement('td');
            td.classList.add('middle');
            tr.appendChild(td);
            let checkbox: HTMLInputElement = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.classList.add('rowCheck');
            checkbox.id = pair[0];
            td.appendChild(checkbox);
            td = document.createElement('td');
            td.classList.add('middle');
            td.classList.add('noWrap');
            td.innerHTML = pair[0];
            tr.appendChild(td);
            td = document.createElement('td');
            td.classList.add('middle');
            td.classList.add('fill_width');
            td.innerHTML = pair[1];
            tr.appendChild(td);
            tr.addEventListener('click', (event: MouseEvent) => {
                if ((event.target as HTMLElement).tagName !== 'INPUT') {
                    let checkbox: HTMLInputElement = document.getElementById(pair[0]) as HTMLInputElement;
                    checkbox.checked = !checkbox.checked;
                }
            });
        }
    }

    removeProperty(type: string): void {
        let copy: Array<string[]> = [];
        for (let pair of this.props) {
            if (pair[0] !== type) {
                copy.push(pair);
            }
        }
        this.props = copy;
    }
}
