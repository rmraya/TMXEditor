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

export class ConvertTBX {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.on('set-tbxfile', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setTbxFile(arg);
        });
        ipcRenderer.on('converted-tmx-file', (event: Electron.IpcRendererEvent, arg: string) => {
            (document.getElementById('tmxFile') as HTMLInputElement).value = arg;
        });
        (document.getElementById('browseTbxFiles') as HTMLButtonElement).addEventListener('click', () => {
            ipcRenderer.send('get-tbxfile');
        });
        (document.getElementById('browseTmxFiles') as HTMLButtonElement).addEventListener('click', () => {
            this.browseTmxFiles();
        });
        (document.getElementById('convert') as HTMLButtonElement).addEventListener('click', () => {
            this.convertFile();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                ipcRenderer.send('close-convertTbx');
            }
        });
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'convertTbx', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    setTbxFile(file: string): void {
        let tbxFile: HTMLInputElement = (document.getElementById('tbxFile') as HTMLInputElement);
        tbxFile.value = file;

        let tmxFile: HTMLInputElement = (document.getElementById('tmxFile') as HTMLInputElement);
        if (tmxFile.value === '') {
            let index: number = file.lastIndexOf('.');
            if (index !== -1) {
                tmxFile.value = file.substring(0, index) + '.tmx';
            } else {
                tmxFile.value = file + '.tmx';
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
        ipcRenderer.send('get-converted-tmx', { default: value });
    }

    convertFile(): void {
        let tbxFile: HTMLInputElement = (document.getElementById('tbxFile') as HTMLInputElement);
        if (tbxFile.value === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertTBX', key: 'selectTbx', parent: 'convertTBX' });
            return;
        }
        let tmxFile: HTMLInputElement = (document.getElementById('tmxFile') as HTMLInputElement);
        if (tmxFile.value === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertTBX', key: 'selectTmx', parent: 'convertTBX' });
            return;
        }

        let arg: any = {
            tbxFile: tbxFile.value,
            tmxFile: tmxFile.value,
            openTMX: (document.getElementById('openTMX') as HTMLInputElement).checked
        }
        ipcRenderer.send('convert-tbx-tmx', arg);
    }
}