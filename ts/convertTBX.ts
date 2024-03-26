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

class ConvertTBX {

    electron = require('electron');

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.on('set-tbxfile', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setTbxFile(arg);
        });
        this.electron.ipcRenderer.on('converted-tmx-file', (event: Electron.IpcRendererEvent, arg: string) => {
            (document.getElementById('tmxFile') as HTMLInputElement).value = arg;
        });
        document.getElementById('browseTbxFiles').addEventListener('click', () => {
            this.browseTbxFiles();
        });
        document.getElementById('browseTmxFiles').addEventListener('click', () => {
            this.browseTmxFiles();
        });
        document.getElementById('convert').addEventListener('click', () => {
            this.convertFile();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => { KeyboardHandler.keyListener(event); });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-convertTbx');
            }
        });
        this.electron.ipcRenderer.send('convertTbx-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    browseTbxFiles(): void {
        this.electron.ipcRenderer.send('get-tbxfile');
    }

    setTbxFile(arg: string): void {
        let tbxFile = (document.getElementById('tbxFile') as HTMLInputElement);
        tbxFile.value = arg;

        let tmxFile = (document.getElementById('tmxFile') as HTMLInputElement);
        if (tmxFile.value === '') {
            let index: number = arg.lastIndexOf('.');
            if (index !== -1) {
                tmxFile.value = arg.substring(0, index) + '.tmx';
            } else {
                tmxFile.value = arg + '.tmx';
            }
        }
    }

    browseTmxFiles(): void {
        let value: string = (document.getElementById('tbxFile') as HTMLInputElement).value;
        if (value !== '') {
            let index: number = value.lastIndexOf('.');
            if (index !== -1) {
                value = value.substring(0, index) + '.tmx';
            } else {
                value = value + '.tmx';
            }
        }
        this.electron.ipcRenderer.send('get-converted-tmx', { default: value });
    }

    convertFile(): void {
        let tbxFile = (document.getElementById('tbxFile') as HTMLInputElement);
        if (tbxFile.value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'convertTBX', key: 'selectTbx', parent: 'convertTBX' });
            return;
        }
        let tmxFile = (document.getElementById('tmxFile') as HTMLInputElement);
        if (tmxFile.value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', group: 'convertTBX', key: 'selectTmx', parent: 'convertTBX' });
            return;
        }

        let arg = {
            tbxFile: tbxFile.value,
            tmxFile: tmxFile.value,
            openTMX: (document.getElementById('openTMX') as HTMLInputElement).checked
        }
        this.electron.ipcRenderer.send('convert-tbx-tmx', arg);
    }
}