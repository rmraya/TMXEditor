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

export interface SearchArgs {
    searchText: string;
    caseSensitive: boolean;
    useRegex: boolean;
}

export class SearchReplace {

    private matchFound: boolean = false;

    constructor() {
        ipcRenderer.send('get-theme');
        ipcRenderer.on('set-theme', (event: Electron.IpcRendererEvent, css: string) => {
            (document.getElementById('theme') as HTMLLinkElement).href = css;
        });
        ipcRenderer.on('match-found', (event: Electron.IpcRendererEvent, found: boolean) => {
            this.matchFound = found;
            this.updateReplaceButtonState();
        });
        document.getElementById('find')?.addEventListener('click', () => {
            this.find();
        });
        document.getElementById('findNext')?.addEventListener('click', () => {
            this.findNext();
        });
        document.getElementById('replace')?.addEventListener('click', () => {
            this.replace();
        });
        document.getElementById('replaceAll')?.addEventListener('click', () => {
            this.replaceAll();
        });
        document.getElementById('searchText')?.addEventListener('input', () => {
            this.updateReplaceButtonState();
        });
        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                ipcRenderer.send('close-replaceText');
            }
        });
        (document.getElementById('searchText') as HTMLInputElement).focus();
        setTimeout(() => {
            ipcRenderer.send('set-height', { window: 'replaceText', width: document.body.clientWidth, height: document.body.clientHeight });
        }, 150);
    }

    private updateReplaceButtonState(): void {
        (document.getElementById('replace') as HTMLButtonElement).disabled = !this.matchFound;
    }

    private getSearchArgs(): SearchArgs {
        return {
            searchText: (document.getElementById('searchText') as HTMLInputElement).value,
            caseSensitive: (document.getElementById('caseSensitive') as HTMLInputElement).checked,
            useRegex: (document.getElementById('regularExpression') as HTMLInputElement).checked
        };
    }

    private find(): void {
        let args: SearchArgs = this.getSearchArgs();
        if (!args.searchText.trim()) {
            ipcRenderer.send('show-message', { type: 'warning', group: 'searchReplace', key: 'enterSearchText', parent: 'searchReplace' });
            return;
        }
        this.matchFound = false;
        this.updateReplaceButtonState();
        ipcRenderer.send('find-text', args);
        (document.getElementById('find') as HTMLButtonElement).blur();
    }

    private findNext(): void {
        let args: SearchArgs = this.getSearchArgs();
        if (!args.searchText.trim()) {
            ipcRenderer.send('show-message', { type: 'warning', group: 'searchReplace', key: 'enterSearchText', parent: 'searchReplace' });
            return;
        }
        this.matchFound = false;
        this.updateReplaceButtonState();
        ipcRenderer.send('find-next-text', args);
        (document.getElementById('findNext') as HTMLButtonElement).blur();
    }

    private replace(): void {
        let replaceText: string = (document.getElementById('replaceText') as HTMLInputElement).value;
        ipcRenderer.send('replace-current', replaceText);
        (document.getElementById('replace') as HTMLButtonElement).blur();
    }

    private replaceAll(): void {
        let args: SearchArgs = this.getSearchArgs();
        if (!args.searchText.trim()) {
            ipcRenderer.send('show-message', { type: 'warning', group: 'searchReplace', key: 'enterSearchText', parent: 'searchReplace' });
            return;
        }
        let replaceText: string = (document.getElementById('replaceText') as HTMLInputElement).value;
        ipcRenderer.send('replace-all', { searchText: args.searchText, replaceText: replaceText, caseSensitive: args.caseSensitive, useRegex: args.useRegex });
        (document.getElementById('replaceAll') as HTMLButtonElement).blur();
    }
}
