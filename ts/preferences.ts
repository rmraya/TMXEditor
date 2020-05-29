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
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                window.close();
            }
            if (event.key === 'Enter') {
                this.savePreferences();
            }
        });
        document.getElementById('savePreferences').addEventListener('click', () => {
            this.savePreferences();
        });
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

new Preferences();