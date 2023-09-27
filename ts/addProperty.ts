/*******************************************************************************
 * Copyright (c) 2023 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

class AddProperty {

    electron = require('electron');

    currentId: string;
    currentType: string;

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        document.getElementById('saveProperty').addEventListener('click', () => {
            this.saveProperty();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.saveProperty();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-addProperty');
            }
        });
        this.electron.ipcRenderer.send('addProperty-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    saveProperty(): void {
        let type: string = (document.getElementById('type') as HTMLInputElement).value;
        if (type === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'addProperty', key: 'enterType', parent: 'addProperty' });
            return;
        }
        let value: string = (document.getElementById('value') as HTMLInputElement).value;
        if (value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'addProperty', key: 'enterValue', parent: 'addProperty' });
            return;
        }
        if (!this.validateType(type)) {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'addProperty', key: 'invalidType', parent: 'addProperty' });
            return;
        }
        this.electron.ipcRenderer.send('add-new-property', { type: type, value: value });
    }

    validateType(type: string): boolean {
        let length: number = type.length;
        for (let i = 0; i < length; i++) {
            let c: string = type.charAt(i);
            if (c === ' ' || c === '<' || c === '&') {
                return false;
            }
        }
        return true;
    }
}
