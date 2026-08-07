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

export class AddProperty {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        (document.getElementById('saveProperty') as HTMLButtonElement).addEventListener('click', () => {
            this.saveProperty();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.saveProperty();
            }
            if (event.code === 'Escape') {
                ipcRenderer.send('close-addProperty');
            }
        });
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'addProperty', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    saveProperty(): void {
        let type: string = (document.getElementById('type') as HTMLInputElement).value;
        if (type === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'addProperty', key: 'enterType', parent: 'addProperty' });
            return;
        }
        let value: string = (document.getElementById('value') as HTMLInputElement).value;
        if (value === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'addProperty', key: 'enterValue', parent: 'addProperty' });
            return;
        }
        if (!this.validateType(type)) {
            ipcRenderer.send('show-message', { type: 'warning', group: 'addProperty', key: 'invalidType', parent: 'addProperty' });
            return;
        }
        ipcRenderer.send('add-new-property', { type: type, value: value });
    }

    validateType(type: string): boolean {
        let length: number = type.length;
        for (let i: number = 0; i < length; i++) {
            let c: string = type.charAt(i);
            if (c === ' ' || c === '<' || c === '&') {
                return false;
            }
        }
        return true;
    }
}
