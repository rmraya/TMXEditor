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

class Preferences {

    electron = require("electron");

    constructor() {
        this.electron.ipcRenderer.send('get-theme');
        this.electron.ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, arg: any) => {
            (document.getElementById('theme') as HTMLLinkElement).href = arg;
        });
        this.electron.ipcRenderer.on('set-preferences', (event: Electron.IpcRendererEvent, arg: any) => {
            this.setPreferences(arg);
        });
        this.electron.ipcRenderer.send('get-preferences');
        document.getElementById('savePreferences').addEventListener('click', () => {
            this.savePreferences();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.savePreferences();
            }
            if (event.code === 'Escape') {
                this.electron.ipcRenderer.send('close-preferences');
            }
        });
        document.getElementById('themeColor').focus();
        this.electron.ipcRenderer.send('preferences-height', { width: document.body.clientWidth, height: document.body.clientHeight });
    }

    setPreferences(arg: any): void {
        (document.getElementById('themeColor') as HTMLSelectElement).value = arg.theme;
        (document.getElementById('indentation') as HTMLInputElement).value = '' + arg.indentation;
        (document.getElementById('threshold') as HTMLSelectElement).value = '' + arg.threshold;
    }

    savePreferences(): void {
        var theme: string = (document.getElementById('themeColor') as HTMLSelectElement).value;
        var indent: number = Number.parseInt((document.getElementById('indentation') as HTMLInputElement).value);
        var threshold: number = Number.parseInt((document.getElementById('threshold') as HTMLSelectElement).value);
        var prefs: any = { theme: theme, threshold: threshold, indentation: indent }
        this.electron.ipcRenderer.send('save-preferences', prefs);
    }
}
