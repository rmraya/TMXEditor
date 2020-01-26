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

const _f = require("electron");

function togleSourceLanguage(): void {
    var checked: boolean = (document.getElementById('filterUntranslated') as HTMLInputElement).checked;
    (document.getElementById('sourceLanguage') as HTMLSelectElement).disabled = !checked;
}

_f.ipcRenderer.send('get-filter-languages');

_f.ipcRenderer.on('filter-languages', (event, arg) => {
    var sourceLanguage: HTMLSelectElement = document.getElementById('sourceLanguage') as HTMLSelectElement;
    var filterLanguage: HTMLSelectElement = document.getElementById('filterLanguage') as HTMLSelectElement;
    var options: string = '';
    for (let i: number = 0; i < arg.length; i++) {
        let lang: any = arg[i];
        options = options + '<option value="' + lang.code + '">' + lang.name + '</option>'
    }
    sourceLanguage.innerHTML = options;
    filterLanguage.innerHTML = options;
    _f.ipcRenderer.send('get-filter-options');
});

_f.ipcRenderer.on('set-filter-options', (event, arg) => {
    if (arg.filterText !== undefined) {
        (document.getElementById('filterText') as HTMLInputElement).value = arg.filterText;
    }
    if (arg.filterLanguage !== undefined) {
        (document.getElementById('filterLanguage') as HTMLSelectElement).value = arg.filterLanguage;
    }
    if (arg.caseSensitiveFilter !== undefined) {
        (document.getElementById('caseSensitiveFilter') as HTMLInputElement).checked = arg.caseSensitiveFilter;
    }
    if (arg.filterUntranslated !== undefined) {
        (document.getElementById('filterUntranslated') as HTMLInputElement).checked = arg.filterUntranslated;
    }
    if (arg.regExp !== undefined) {
        (document.getElementById('regularExpression') as HTMLInputElement).checked = arg.regExp;
    }
    if (arg.filterSrcLanguage !== undefined) {
        (document.getElementById('sourceLanguage') as HTMLSelectElement).value = arg.filterSrcLanguage;
    }
});

function applyFilters(): void {
    var filterText: string = (document.getElementById('filterText') as HTMLInputElement).value;
    var filterLanguage: string = (document.getElementById('filterLanguage') as HTMLSelectElement).value;
    var caseSensitiveFilter: boolean = (document.getElementById('caseSensitiveFilter') as HTMLInputElement).checked;
    var regExp: boolean = (document.getElementById('regularExpression') as HTMLInputElement).checked;
    var filterUntranslated: boolean = (document.getElementById('filterUntranslated') as HTMLInputElement).checked;
    var filterSrcLanguage: string = (document.getElementById('sourceLanguage') as HTMLSelectElement).value;
    if (!filterUntranslated && filterText.length === 0) {
        _f.ipcRenderer.send('show-message', { type: 'warning', message: 'Enter text to search' });
        return;
    }
    var filterOptions: any = {
        filterText: filterText,
        filterLanguage: filterLanguage,
        caseSensitiveFilter: caseSensitiveFilter,
        filterUntranslated: filterUntranslated,
        regExp: regExp,
        filterSrcLanguage: filterSrcLanguage
    };
    _f.ipcRenderer.send('filter-options', filterOptions);
}

function clearFilters(): void {
    _f.ipcRenderer.send('clear-filter-options');
}