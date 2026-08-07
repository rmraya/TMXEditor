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

export class ConvertSDLTM {

    langs: string[] = [];
    columns: number = 0;

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.on('set-sdltmfile', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setSdltmFile(arg);
        });
        ipcRenderer.on('converted-tmx-file', (event: Electron.IpcRendererEvent, arg: string) => {
            (document.getElementById('tmxFile') as HTMLInputElement).value = arg;
        });
        (document.getElementById('browseSdltmFiles') as HTMLButtonElement).addEventListener('click', () => {
            ipcRenderer.send('get-sdltmfile');
        });
        (document.getElementById('browseTmxFiles') as HTMLButtonElement).addEventListener('click', () => {
            this.browseTmxFiles();
        });
        (document.getElementById('convert') as HTMLButtonElement).addEventListener('click', () => {
            this.convertFile();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                ipcRenderer.send('close-convertSdltm');
            }
        });
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'convertSdltm', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    setSdltmFile(file: string): void {
        let sdltmFile: HTMLInputElement = (document.getElementById('sdltmFile') as HTMLInputElement);
        sdltmFile.value = file;

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
        let value: string = (document.getElementById('sdltmFile') as HTMLInputElement).value;
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
        let sdltmFile: HTMLInputElement = (document.getElementById('sdltmFile') as HTMLInputElement);
        if (sdltmFile.value === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertSDLTM', key: 'selectSDLTM', parent: 'convertSDLTM' });
            return;
        }
        let tmxFile: HTMLInputElement = (document.getElementById('tmxFile') as HTMLInputElement);
        if (tmxFile.value === '') {
            ipcRenderer.send('show-message', { type: 'warning', group: 'convertSDLTM', key: 'selectTmx', parent: 'convertSDLTM' });
            return;
        }

        let arg: any = {
            sdltmFile: sdltmFile.value,
            tmxFile: tmxFile.value,
            openTMX: (document.getElementById('openTMX') as HTMLInputElement).checked
        }
        ipcRenderer.send('convert-sdltm-tmx', arg);
    }
}
