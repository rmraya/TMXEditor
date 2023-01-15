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

class ConvertSDLTM {

    electron = require('electron');

    langs: string[] = [];
    columns: number = 0;

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.on('set-sdltmfile', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setSdltmFile(arg);
        });
        this.electron.ipcRenderer.on('converted-tmx-file', (event: Electron.IpcRendererEvent, arg: string) => {
            (document.getElementById('tmxFile') as HTMLInputElement).value = arg;
        });
        document.getElementById('browseSdltmFiles').addEventListener('click', () => {
            this.browseSdltmFiles();
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
                this.electron.ipcRenderer.send('close-convertSdltm');
            }
        });
        this.electron.ipcRenderer.send('convertSdltm-height', { width: document.body.clientWidth, height: document.body.clientHeight + 10 });
    }

    browseSdltmFiles(): void {
        this.electron.ipcRenderer.send('get-sdltmfile');
    }

    setSdltmFile(arg: string): void {
        let sdltmFile = (document.getElementById('sdltmFile') as HTMLInputElement);
        sdltmFile.value = arg;

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
        let value: string = (document.getElementById('sdltmFile') as HTMLInputElement).value;
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
        let sdltmFile = (document.getElementById('sdltmFile') as HTMLInputElement);
        if (sdltmFile.value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select SDLTM file', parent: 'convertSDLTM' });
            return;
        }
        let tmxFile = (document.getElementById('tmxFile') as HTMLInputElement);
        if (tmxFile.value === '') {
            this.electron.ipcRenderer.send('show-message', { type: 'warning', message: 'Select TMX file', parent: 'convertSDLTM' });
            return;
        }

        let arg = {
            sdltmFile: sdltmFile.value,
            tmxFile: tmxFile.value,
            openTMX: (document.getElementById('openTMX') as HTMLInputElement).checked
        }
        this.electron.ipcRenderer.send('convert-sdltm-tmx', arg);
    }
}
