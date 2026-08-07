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

export class Properties {

    currentId: string = '';
    currentType: string = '';
    properties: Array<string[]> = [];
    removePropertiesText: string = '';

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.send('get-unit-properties');
        ipcRenderer.on('set-unit-properties', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setUnitProperties(arg);
        });
        ipcRenderer.on('set-new-property', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setNewProperty(arg);
        });
        (document.getElementById('addProperty') as HTMLButtonElement).addEventListener('click', () => {
            this.addProperty();
        });
        (document.getElementById('save') as HTMLButtonElement).addEventListener('click', () => {
            this.saveProperties();
        });

        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                ipcRenderer.send('close-properties');
            }
        });
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'properties', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    setUnitProperties(arg: any): void {
        this.currentId = arg.id;
        this.currentType = arg.type;
        this.properties = arg.props;
        this.removePropertiesText = arg.removeText;
        this.drawProperties();
    }

    saveProperties(): void {
        let lang: string = this.currentType === 'TU' ? '' : this.currentType;
        let arg = {
            id: this.currentId,
            lang: lang,
            properties: this.properties
        }
        ipcRenderer.send('save-properties', arg);
    }

    addProperty(): void {
        ipcRenderer.send('show-add-property', 'properties');
    }

    setNewProperty(arg: any): void {
        let prop: string[] = [arg.type, arg.value];
        this.properties.push(prop);
        this.drawProperties();
        (document.getElementById('save') as HTMLButtonElement).focus();
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

    drawProperties(): void {
        let propsTable: HTMLTableElement = document.getElementById('propsTable') as HTMLTableElement;
        propsTable.innerHTML = '';
        for (let pair of this.properties) {
            let tr: HTMLTableRowElement = document.createElement('tr');
            propsTable.appendChild(tr);
            let td: HTMLTableCellElement = document.createElement('td');
            td.classList.add('middle');
            tr.appendChild(td);
            let remove: HTMLAnchorElement = document.createElement('a');
            remove.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" style="margin-top:4px"><path d="m400-325 80-80 80 80 51-51-80-80 80-80-51-51-80 80-80-80-51 51 80 80-80 80 51 51Zm-88 181q-29.7 0-50.85-21.15Q240-186.3 240-216v-480h-48v-72h192v-48h192v48h192v72h-48v479.57Q720-186 698.85-165T648-144H312Zm336-552H312v480h336v-480Zm-336 0v480-480Z"/></svg>' +
                '<span class="tooltiptext bottomTooltip">' + this.removePropertiesText
                + '</span>';
            remove.classList.add('tooltip');
            remove.classList.add('bottomTooltip');
            remove.addEventListener('click', () => {
                this.deleteProperty(pair);
            });
            td.appendChild(remove);
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
        }
    }
}
