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
import { Preferences } from "./preferences.js";

export class PreferencesDialog {

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
            ipcRenderer.send('get-preferences');
        });
        ipcRenderer.on('set-preferences', (event: Electron.IpcRendererEvent, arg: Preferences) => {
            this.setPreferences(arg);
        });
        (document.getElementById('savePreferences') as HTMLButtonElement).addEventListener('click', () => {
            this.savePreferences();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Enter' || event.code === 'NumpadEnter') {
                this.savePreferences();
            }
            if (event.code === 'Escape') {
                ipcRenderer.send('close-preferences');
            }
        });
        (document.getElementById('appLangSelect') as HTMLSelectElement).focus();
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'preferencesDialog', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 200);
    }

    setPreferences(arg: Preferences): void {
        (document.getElementById('themeColor') as HTMLSelectElement).value = arg.theme;
        (document.getElementById('indentation') as HTMLInputElement).value = '' + arg.indentation;
        (document.getElementById('appLangSelect') as HTMLSelectElement).value = arg.appLang;
        (document.getElementById('changeId') as HTMLInputElement).checked = arg.changeId;
    }

    savePreferences(): void {
        let theme: string = (document.getElementById('themeColor') as HTMLSelectElement).value;
        let indent: number = Number.parseInt((document.getElementById('indentation') as HTMLInputElement).value);
        let appLang: string = (document.getElementById('appLangSelect') as HTMLSelectElement).value;
        let changeId: boolean = (document.getElementById('changeId') as HTMLInputElement).checked;
        let prefs: Preferences = { theme: theme, indentation: indent, appLang: appLang, changeId: changeId };
        ipcRenderer.send('save-preferences', prefs);
    }
}
