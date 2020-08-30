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

import { Buffer } from "buffer";
import { execFileSync, spawn, ChildProcessWithoutNullStreams } from "child_process";
import { app, BrowserWindow, dialog, ipcMain, Menu, MenuItem, shell, Rectangle, nativeTheme, IpcMainEvent, OpenDialogReturnValue, SaveDialogReturnValue } from "electron";
import { existsSync, mkdirSync, readFile, readFileSync, writeFile, writeFileSync } from "fs";
import { ClientRequest, request, IncomingMessage } from "http";

const SUCCESS: string = 'Success';
const LOADING: string = 'Loading';
const COMPLETED: string = 'Completed';
const ERROR: string = 'Error';
const EXPIRED: string = 'Expired';
const SAVING: string = 'Saving';
const PROCESSING: string = 'Processing';

class App {

    static path = require('path');
    static https = require('https');

    static mainWindow: BrowserWindow;
    static newFileWindow: BrowserWindow;
    static messagesWindow: BrowserWindow;
    static aboutWindow: BrowserWindow;
    static licensesWindow: BrowserWindow;
    static settingsWindow: BrowserWindow;
    static fileInfoWindow: BrowserWindow;
    static attributesWindow: BrowserWindow;
    static propertiesWindow: BrowserWindow;
    static addPropertyWindow: BrowserWindow;
    static notesWindow: BrowserWindow;
    static addNotesWindow: BrowserWindow;
    static convertCsvWindow: BrowserWindow;
    static csvLanguagesWindow: BrowserWindow;
    static splitFileWindow: BrowserWindow;
    static mergeFilesWindow: BrowserWindow;
    static replaceTextWindow: BrowserWindow;
    static sortUnitsWindow: BrowserWindow;
    static filtersWindow: BrowserWindow;
    static addLanguageWindow: BrowserWindow;
    static changeLanguageWindow: BrowserWindow;
    static removeLanguageWindow: BrowserWindow;
    static srcLanguageWindow: BrowserWindow;
    static removeUntranslatedWindow: BrowserWindow;
    static consolidateWindow: BrowserWindow;

    static requestEvaluationWindow: BrowserWindow;
    static registerSubscriptionWindow: BrowserWindow;
    static registerExpiredWindow: BrowserWindow;
    static newSubscriptionWindow: BrowserWindow;

    static ls: ChildProcessWithoutNullStreams;
    static shouldQuit: boolean = false;
    static stopping: boolean = false;

    static javapath: string = App.path.join(app.getAppPath(), 'bin', 'java');

    static saved: boolean = true;
    static shouldClose: boolean = false;
    static currentFile: string = '';
    static currentDefaults: any;
    static currentPreferences: any;
    static currentCss: string;
    static currentStatus: any = {};
    static fileLanguages: any[];
    static argFile: string = '';
    static isReady: boolean = false;

    static csvEvent: IpcMainEvent;
    static propertyEvent: IpcMainEvent;
    static notesEvent: IpcMainEvent;

    static filterOptions: any = {};
    static loadOptions: any = {
        start: 0,
        count: 200
    };
    static sortOptions: any = {};
    static csvLangArgs: any;
    static attributesArg: any;
    static propertiesArg: any;
    static notesArg: any;

    static needsName: boolean = false;

    static verticalPadding: number = 46;

    constructor(args: string[]) {

        if (!existsSync(App.path.join(app.getPath('appData'), app.name))) {
            mkdirSync(App.path.join(app.getPath('appData'), app.name), { recursive: true });
        }

        if (process.platform === 'win32' && args.length > 1 && args[1] !== '.') {
            App.argFile = ''
            for (let i = 1; i < args.length; i++) {
                if (args[i] !== '.') {
                    if (App.argFile !== '') {
                        App.argFile = App.argFile + ' ';
                    }
                    App.argFile = App.argFile + args[i];
                }
            }
        }

        app.allowRendererProcessReuse = true;

        if (!app.requestSingleInstanceLock()) {
            app.quit();
        } else {
            if (App.mainWindow) {
                // Someone tried to run a second instance, we should focus our window.
                if (App.mainWindow.isMinimized()) {
                    App.mainWindow.restore();
                }
                App.mainWindow.focus();
            }
        }

        if (process.platform == 'win32') {
            App.javapath = App.path.join(app.getAppPath(), 'bin', 'java.exe');
        }

        if (!existsSync(App.path.join(app.getPath('appData'), app.name))) {
            mkdirSync(App.path.join(app.getPath('appData'), app.name), { recursive: true });
        }

        App.ls = spawn(App.javapath, ['-cp', 'lib/h2-1.4.200.jar', '--module-path', 'lib', '-m', 'tmxserver/com.maxprograms.tmxserver.TMXServer', '-port', '8060'], { cwd: app.getAppPath() });

        App.ls.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        App.ls.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        App.ls.on('close', (code) => {
            if (code === 0) {
                var postData: string = JSON.stringify({ command: 'stop' });
                var options = {
                    hostname: '127.0.0.1',
                    port: 8060,
                    path: '/TMXServer',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(postData)
                    }
                };
                // Make a request
                var req: ClientRequest = request(options);
                req.on('response',
                    (res: any) => {
                        res.setEncoding('utf-8');
                        if (res.statusCode !== 200) {
                            console.log('sendRequest() error: ' + res.statusMessage);
                        }
                        var rawData: string = '';
                        res.on('data', (chunk: string) => {
                            rawData += chunk;
                        });
                        res.on('end', () => {
                            try {
                                console.log(rawData);
                            } catch (e) {
                                console.log(e.message);
                            }
                        });
                    }
                );
                req.write(postData);
                req.end();
            }
        });

        var ck: Buffer = execFileSync('bin/java', ['--module-path', 'lib', '-m', 'openxliff/com.maxprograms.server.CheckURL', 'http://localhost:8060/TMXserver'], { cwd: app.getAppPath() });
        console.log(ck.toString());

        app.on('open-file', (event, filePath) => {
            event.preventDefault();
            if (App.isReady) {
                App.openFile(filePath);
            } else {
                App.argFile = filePath;
            }
        });

        app.on('quit', () => {
            App.stopServer();
        });

        app.on('window-all-closed', () => {
            app.quit();
        });

        app.on('ready', () => {
            App.isReady = true;
            App.mainLoaded();
        });

        App.loadDefaults();
        App.loadPreferences();

        app.on('ready', () => {
            App.createWindow();
            App.mainWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'index.html'));
            App.mainWindow.on('resize', () => {
                App.saveDefaults();
            });
            App.mainWindow.on('move', () => {
                App.saveDefaults();
            });
            App.mainWindow.show();
            App.mainWindow.on('close', (ev: Event) => {
                ev.cancelBubble = true;
                ev.preventDefault();
                App.close();
            });
            App.checkUpdates(true);
        });

        nativeTheme.on('updated', () => {
            if (App.currentPreferences.theme === 'system') {
                if (nativeTheme.shouldUseDarkColors) {
                    App.currentCss = 'file://' + App.path.join(app.getAppPath(), 'css', 'dark.css');
                } else {
                    App.currentCss = 'file://' + App.path.join(app.getAppPath(), 'css', 'light.css');
                }
                App.mainWindow.webContents.send('set-theme', App.currentCss);
            }
        });

        ipcMain.on('licenses-clicked', () => {
            App.showLicenses();
        });
        ipcMain.on('open-license', (event: IpcMainEvent, arg: any) => {
            App.openLicense(arg);
        });
        ipcMain.on('show-help', () => {
            App.showHelp();
        });
        ipcMain.on('open-file', () => {
            App.openFileDialog();
        });
        ipcMain.on('get-segments', (event: IpcMainEvent, arg: any) => {
            App.loadOptions = arg;
            App.loadSegments();
        });
        ipcMain.on('get-cell-properties', (event: IpcMainEvent, arg: any) => {
            App.getCellProperties(arg.id, arg.lang);
        });
        ipcMain.on('get-row-properties', (event: IpcMainEvent, arg: any) => {
            App.getRowProperties(arg.id);
        });
        ipcMain.on('edit-attributes', (event: IpcMainEvent, arg: any) => {
            this.editAttributes(arg);
        });
        ipcMain.on('get-unit-attributes', (event: IpcMainEvent) => {
            event.sender.send('set-unit-attributes', App.attributesArg);
        });
        ipcMain.on('save-attributes', (event: IpcMainEvent, arg: any) => {
            this.saveAttributes(arg);
        });
        ipcMain.on('edit-properties', (event: IpcMainEvent, arg: any) => {
            this.editProperties(arg);
        });
        ipcMain.on('get-unit-properties', (event: IpcMainEvent) => {
            event.sender.send('set-unit-properties', App.propertiesArg);
        });
        ipcMain.on('show-add-property', (event: IpcMainEvent) => {
            App.showAddProperty(event);
        });
        ipcMain.on('add-new-property', (event: IpcMainEvent, arg: any) => {
            this.addNewProperty(arg);
        });
        ipcMain.on('save-properties', (event: IpcMainEvent, arg: any) => {
            this.saveProperties(arg);
        });
        ipcMain.on('edit-notes', (event: IpcMainEvent, arg: any) => {
            App.editNotes(arg);
        });
        ipcMain.on('get-unit-notes', (event: IpcMainEvent, arg: any) => {
            event.sender.send('set-unit-notes', App.notesArg);
        });
        ipcMain.on('show-add-note', (event: IpcMainEvent, arg: any) => {
            this.showAddNote(event);
        });
        ipcMain.on('add-new-note', (event: IpcMainEvent, arg: any) => {
            this.addNewNote(arg);
        });
        ipcMain.on('save-notes', (event: IpcMainEvent, arg: any) => {
            this.saveNotes(arg);
        });
        ipcMain.on('get-preferences', (event: IpcMainEvent) => {
            event.sender.send('set-preferences', App.currentPreferences);
        });
        ipcMain.on('save-preferences', (event: IpcMainEvent, arg: any) => {
            App.currentPreferences = arg;
            App.savePreferences();
            App.settingsWindow.close();
            App.loadPreferences();
            App.setTheme();
        });
        ipcMain.on('get-theme', (event: IpcMainEvent) => {
            event.sender.send('set-theme', App.currentCss);
        });
        ipcMain.on('create-file', (event: IpcMainEvent, arg: any) => {
            this.createFile(arg);
        });
        ipcMain.on('new-file', () => {
            App.createNewFile();
        });
        ipcMain.on('save-file', () => {
            App.saveFile();
        })
        ipcMain.on('convert-csv', () => {
            App.convertCSV();
        });
        ipcMain.on('convert-csv-tmx', (event: IpcMainEvent, arg: any) => {
            this.convertCsvTmx(arg);
        });
        ipcMain.on('get-charsets', (event: IpcMainEvent) => {
            this.getCharsets(event);
        });
        ipcMain.on('get-csvfile', (event: IpcMainEvent) => {
            this.getCsvFile(event);
        });
        ipcMain.on('get-converted-tmx', (event: IpcMainEvent, arg: any) => {
            this.getConvertedTMX(event, arg);
        });
        ipcMain.on('get-csv-preview', (event: IpcMainEvent, arg: any) => {
            this.getCsvPreview(event, arg);
        });
        ipcMain.on('get-csv-languages', (event: IpcMainEvent, arg: any) => {
            this.getCsvLanguages(event, arg);
        });
        ipcMain.on('get-csv-lang-args', (event: IpcMainEvent) => {
            event.sender.send('set-csv-lang-args', App.csvLangArgs);
        });
        ipcMain.on('set-csv-languages', (event: IpcMainEvent, arg: any) => {
            this.setCsvLanguages(arg);
        });
        ipcMain.on('show-file-info', () => {
            App.showFileInfo();
        });
        ipcMain.on('file-properties', (event: IpcMainEvent) => {
            this.fileProperties(event);
        });
        ipcMain.on('select-tmx', (event: IpcMainEvent) => {
            this.selectTmx(event);
        });
        ipcMain.on('split-tmx', (event: IpcMainEvent, arg: any) => {
            this.splitTmx(arg);
        });
        ipcMain.on('select-merged-tmx', (event: IpcMainEvent) => {
            this.selectMergedTmx(event);
        });
        ipcMain.on('add-tmx-files', (event: IpcMainEvent) => {
            this.addTmxFiles(event);
        });
        ipcMain.on('merge-tmx-files', (event: IpcMainEvent, arg: any) => {
            this.mergeTmxFiles(arg);
        });
        ipcMain.on('save-data', (event: IpcMainEvent, arg: any) => {
            this.saveData(event, arg);
        });
        ipcMain.on('replace-text', () => {
            App.replaceText();
        });
        ipcMain.on('replace-request', (event: IpcMainEvent, arg: any) => {
            this.replaceRequest(arg);
        });
        ipcMain.on('sort-units', () => {
            App.sortUnits();
        });
        ipcMain.on('set-sort', (event: IpcMainEvent, arg: any) => {
            this.setSort(arg);
        });
        ipcMain.on('clear-sort', () => {
            this.clearSort();
        });
        ipcMain.on('get-sort', (event: IpcMainEvent) => {
            event.sender.send('sort-options', App.sortOptions);
        });
        ipcMain.on('filter-units', () => {
            App.showFilters();
        });
        ipcMain.on('filter-options', (event: IpcMainEvent, arg: any) => {
            this.setFilterOptions(arg);
        });
        ipcMain.on('get-filter-options', (event: IpcMainEvent) => {
            event.sender.send('set-filter-options', App.filterOptions);
        });
        ipcMain.on('clear-filter-options', () => {
            this.clearFilterOptions();
        });
        ipcMain.on('get-filter-languages', (event: IpcMainEvent) => {
            event.sender.send('filter-languages', App.fileLanguages);
        });
        ipcMain.on('insert-unit', () => {
            App.insertUnit();
        });
        ipcMain.on('delete-units', (event: IpcMainEvent, arg: any) => {
            this.deleteUnits(arg);
        });
        ipcMain.on('change-language', (event: IpcMainEvent, arg: any) => {
            this.changeLanguage(arg);
        });
        ipcMain.on('all-languages', (event: IpcMainEvent) => {
            this.allLanguages(event);
        });
        ipcMain.on('remove-language', (event: IpcMainEvent, arg: any) => {
            this.removeLanguage(arg);
        });
        ipcMain.on('add-language', (event: IpcMainEvent, arg: any) => {
            this.addLanguage(arg);
        });
        ipcMain.on('get-source-language', (event: IpcMainEvent) => {
            this.getSourceLanguage(event);
        });
        ipcMain.on('change-source-language', (event: IpcMainEvent, arg: any) => {
            this.changeSourceLanguage(arg);
        });
        ipcMain.on('remove-untranslated', (event: IpcMainEvent, arg: any) => {
            this.removeUntranslated(arg);
        });
        ipcMain.on('consolidate-units', (event: IpcMainEvent, arg: any) => {
            this.consolidateUnits(arg);
        });
        ipcMain.on('get-version', (event: IpcMainEvent) => {
            event.sender.send('set-version', app.name + ' ' + app.getVersion());
        });
        ipcMain.on('show-message', (event: IpcMainEvent, arg: any) => {
            App.showMessage(arg);
        });
        ipcMain.on('newFile-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.newFileWindow, arg);
        });
        ipcMain.on('about-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.aboutWindow, arg);
        });
        ipcMain.on('messages-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.messagesWindow, arg);
        });
        ipcMain.on('fileInfo-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.fileInfoWindow, arg);
        });
        ipcMain.on('licenses-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.licensesWindow, arg);
        });
        ipcMain.on('preferences-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.settingsWindow, arg);
        });
        ipcMain.on('attributes-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.attributesWindow, arg);
        });
        ipcMain.on('properties-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.propertiesWindow, arg);
        });
        ipcMain.on('addProperty-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.addPropertyWindow, arg);
        });
        ipcMain.on('notes-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.notesWindow, arg);
        });
        ipcMain.on('addNote-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.addNotesWindow, arg);
        });
        ipcMain.on('convertCsv-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.convertCsvWindow, arg);
        });
        ipcMain.on('csvLanguages-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.csvLanguagesWindow, arg);
        });
        ipcMain.on('splitFile-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.splitFileWindow, arg);
        });
        ipcMain.on('mergeFiles-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.mergeFilesWindow, arg);
        });
        ipcMain.on('replaceText-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.replaceTextWindow, arg);
        });
        ipcMain.on('sortUnits-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.sortUnitsWindow, arg);
        });
        ipcMain.on('filters-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.filtersWindow, arg);
        });
        ipcMain.on('addLanguage-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.addLanguageWindow, arg);
        });
        ipcMain.on('changeLanguage-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.changeLanguageWindow, arg);
        });
        ipcMain.on('removeLanguage-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.removeLanguageWindow, arg);
        });
        ipcMain.on('srcLanguage-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.srcLanguageWindow, arg);
        });
        ipcMain.on('removeUntranslated-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.removeUntranslatedWindow, arg);
        });
        ipcMain.on('consolidate-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.consolidateWindow, arg);
        });
        ipcMain.on('registerSubscription-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.registerSubscriptionWindow, arg);
        });
        ipcMain.on('registerExpired-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.registerExpiredWindow, arg);
        });
        ipcMain.on('requestEvaluation-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.requestEvaluationWindow, arg);
        });
        ipcMain.on('newSubscription-height', (event: IpcMainEvent, arg: any) => {
            App.setHeight(App.newSubscriptionWindow, arg);
        });
    } // end constructor

    static stopServer(): void {
        if (!this.stopping) {
            this.stopping = true;
            App.ls.kill(15);
        }
    }

    static mainLoaded(): void {
        if (App.argFile !== '') {
            setTimeout(() => {
                App.openFile(App.argFile);
                App.argFile = '';
            }, 2000);
        }
    }

    static setHeight(window: BrowserWindow, arg: any) {
        let rect: Rectangle = window.getBounds();
        rect.height = arg.height + App.verticalPadding;
        window.setBounds(rect);
        window.show();
    }

    static showMessage(arg: any): void {
        App.messagesWindow = new BrowserWindow({
            parent: this.mainWindow,
            width: 600,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            modal: true,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.messagesWindow.setMenu(null);
        App.messagesWindow.loadURL('file://' + this.path.join(app.getAppPath(), 'html', 'messages.html'));
        App.messagesWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('set-message', arg);
            event.sender.send('get-height');
        });
    }

    static createWindow(): void {
        App.mainWindow = new BrowserWindow({
            title: 'TMXEditor',
            width: App.currentDefaults.width,
            height: App.currentDefaults.height,
            x: App.currentDefaults.x,
            y: App.currentDefaults.y,
            useContentSize: true,
            webPreferences: {
                nodeIntegration: true
            },
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png')
        });
        var fileMenu: Menu = Menu.buildFromTemplate([
            { label: 'New', accelerator: 'CmdOrCtrl+N', click: () => { App.createNewFile(); } },
            { label: 'Open', accelerator: 'CmdOrCtrl+O', click: () => { App.openFileDialog(); } },
            { label: 'Close', accelerator: 'CmdOrCtrl+W', click: () => { App.closeFile(); } },
            { label: 'Save', accelerator: 'CmdOrCtrl+s', click: () => { App.saveFile(); } },
            { label: 'Save As', click: () => { App.saveAs() } },
            new MenuItem({ type: 'separator' }),
            { label: 'Convert CSV/TAB Delimited to TMX', click: () => { App.convertCSV(); } },
            { label: 'Export as TAB Delimited...', click: () => { App.exportDelimited(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'File Properties', click: () => { App.showFileInfo(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Validate TMX File...', click: () => { App.validateFile(); } },
            { label: 'Clean Invalid Characters...', click: () => { App.cleanCharacters(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Split TMX File...', click: () => { App.splitFile(); } },
            { label: 'Merge TMX Files...', click: () => { App.mergeFiles(); } }
        ]);
        var editMenu: Menu = Menu.buildFromTemplate([
            { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => { App.mainWindow.webContents.undo(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: () => { App.mainWindow.webContents.cut(); } },
            { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: () => { App.mainWindow.webContents.copy(); } },
            { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: () => { App.mainWindow.webContents.paste(); } },
            { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: () => { App.mainWindow.webContents.selectAll(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Confirm Edit', accelerator: 'Alt+Enter', click: () => { App.saveEdits(); } },
            { label: 'Cancel Edit', accelerator: 'Esc', click: () => { App.cancelEdit(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Replace Text...', accelerator: 'CmdOrCtrl+F', click: () => { App.replaceText(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Insert Unit', click: () => { App.insertUnit(); } },
            { label: 'Delete Selected Units', click: () => { App.requestDeleteUnits(); } }
        ]);
        var viewMenu: Menu = Menu.buildFromTemplate([
            { label: 'Sort Units', accelerator: 'F5', click: () => { App.sortUnits(); } },
            { label: 'Filter Units', accelerator: 'F3', click: () => { App.showFilters() } },
            new MenuItem({ type: 'separator' }),
            { label: 'Show First Page', click: () => { App.firstPage(); } },
            { label: 'Show Previous Page', click: () => { App.previousPage(); } },
            { label: 'Show Next Page', click: () => { App.nextPage(); } },
            { label: 'Show Last Page', click: () => { App.lastPage(); } },
            new MenuItem({ type: 'separator' }),
            new MenuItem({ label: 'Toggle Full Screen', role: 'togglefullscreen' }),
            new MenuItem({ label: 'Toggle Development Tools', accelerator: 'F12', role: 'toggleDevTools' })
        ]);
        var tasksMenu: Menu = Menu.buildFromTemplate([
            { label: 'Change Language...', click: () => { App.changeLanguageCode(); } },
            { label: 'Add Language...', click: () => { App.showAddLanguage(); } },
            { label: 'Remove Language...', click: () => { App.showRemoveLanguage() } },
            { label: 'Change Source Language...', click: () => { App.showChangeSourceLanguage(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Remove All Tags', click: () => { App.removeTags(); } },
            { label: 'Remove Duplicates', click: () => { App.removeDuplicates(); } },
            { label: 'Remove Untranslated...', click: () => { App.showRemoveUntranslated(); } },
            { label: 'Remove Initial/Trailing Spaces', click: () => { App.removeSpaces(); } },
            { label: 'Consolidate Units...', click: () => { App.showConsolidateUnits(); } }
        ]);
        var helpMenu: Menu = Menu.buildFromTemplate([
            { label: 'TMXEditor User Guide', accelerator: 'F1', click: () => { App.showHelp(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Check for Updates...', click: () => { App.checkUpdates(false); } },
            { label: 'View Licenses', click: () => { App.showLicenses(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Release History', click: () => { App.showReleaseHistory(); } },
            { label: 'Support Group', click: () => { App.showSupportGroup(); } }
        ]);
        var template: MenuItem[] = [
            new MenuItem({ label: '&File', role: 'fileMenu', submenu: fileMenu }),
            new MenuItem({ label: '&Edit', role: 'editMenu', submenu: editMenu }),
            new MenuItem({ label: '&View', role: 'viewMenu', submenu: viewMenu }),
            new MenuItem({ label: '&Tasks', submenu: tasksMenu }),
            new MenuItem({ label: '&Help', role: 'help', submenu: helpMenu })
        ];
        if (process.platform === 'darwin') {
            var appleMenu: Menu = Menu.buildFromTemplate([
                new MenuItem({ label: 'About...', click: () => { App.showAbout(); } }),
                new MenuItem({
                    label: 'Preferences...', submenu: [
                        { label: 'Settings', accelerator: 'Cmd+,', click: () => { App.showSettings(); } }
                    ]
                }),
                new MenuItem({ type: 'separator' }),
                new MenuItem({
                    label: 'Services', role: 'services', submenu: [
                        { label: 'No Services Apply', enabled: false }
                    ]
                }),
                new MenuItem({ type: 'separator' }),
                new MenuItem({ label: 'Quit TMXEditor', accelerator: 'Cmd+Q', role: 'quit', click: () => { App.close(); } })
            ]);
            template.unshift(new MenuItem({ label: 'TMXEditor', role: 'appMenu', submenu: appleMenu }));
        } else {
            var help: MenuItem = template.pop();
            template.push(new MenuItem({
                label: '&Settings', submenu: [
                    { label: 'Preferences', click: () => { App.showSettings(); } }
                ]
            }));
            template.push(help);
        }
        if (!existsSync(App.path.join(app.getPath('appData'), app.name, 'recent.json'))) {
            writeFile(App.path.join(app.getPath('appData'), app.name, 'recent.json'), '{"files" : []}', (err: Error) => {
                if (err) {
                    App.showMessage({ type: 'error', message: err.message });
                    return;
                }
            });
        }
        readFile(App.path.join(app.getPath('appData'), app.name, 'recent.json'), (err: Error, buf: Buffer) => {
            if (err instanceof Error) {
                Menu.setApplicationMenu(Menu.buildFromTemplate(template));
                return;
            }
            var jsonData = JSON.parse(buf.toString());
            var files = jsonData.files;
            if (files !== undefined && files.length > 0) {
                if (process.platform === 'darwin') {
                    template[1].submenu.append(new MenuItem({ type: 'separator' }));
                } else {
                    template[0].submenu.append(new MenuItem({ type: 'separator' }));
                }
                for (let i: number = 0; i < files.length; i++) {
                    var file = files[i];
                    if (existsSync(file)) {
                        if (process.platform === 'darwin') {
                            template[1].submenu.append(new MenuItem({ label: file, click: () => { App.openFile(files[i]); } }));
                        } else {
                            template[0].submenu.append(new MenuItem({ label: file, click: () => { App.openFile(files[i]); } }));
                        }
                    }
                }
            }
            if (process.platform == 'win32') {
                template[0].submenu.append(new MenuItem({ type: 'separator' }));
                template[0].submenu.append(new MenuItem({ label: 'Exit', accelerator: 'Alt+F4', role: 'quit', click: () => { App.close(); } }));
                template[5].submenu.append(new MenuItem({ type: 'separator' }));
                template[5].submenu.append(new MenuItem({ label: 'About...', click: () => { App.showAbout(); } }));
            }
            if (process.platform === 'linux') {
                template[0].submenu.append(new MenuItem({ type: 'separator' }));
                template[0].submenu.append(new MenuItem({ label: 'Quit', accelerator: 'Ctrl+Q', role: 'quit', click: () => { App.close(); } }));
                template[5].submenu.append(new MenuItem({ type: 'separator' }));
                template[5].submenu.append(new MenuItem({ label: 'About...', click: () => { App.showAbout(); } }));
            }
            Menu.setApplicationMenu(Menu.buildFromTemplate(template));
        });
    }

    static close(): void {
        if (App.currentFile !== '' && !App.saved) {
            let clicked: number = dialog.showMessageBoxSync(App.mainWindow, {
                type: 'question',
                title: 'Save changes?',
                message: 'Your changes  will be lost if you don\'t save them',
                buttons: ['Don\'t Save', 'Cancel', 'Save'],
                defaultId: 2
            });
            if (clicked === 0) {
                App.saved = true;
            }
            if (clicked === 1) {
                return;
            }
            if (clicked === 2) {
                App.shouldQuit = true;
                App.saveFile();
                return;
            }
        }
        App.mainWindow.removeAllListeners();
        App.mainWindow.close();
    }

    static showAbout(): void {
        App.aboutWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 620,
            minimizable: false,
            maximizable: false,
            resizable: false,
            useContentSize: true,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.aboutWindow.setMenu(null);
        App.aboutWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'about.html'));
        App.aboutWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    static sendRequest(json: any, success: any, error: any): void {
        var postData: string = JSON.stringify(json);
        var options = {
            hostname: '127.0.0.1',
            port: 8060,
            path: '/TMXServer',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        // Make a request
        var req: ClientRequest = request(options);
        req.on('response',
            (res: any) => {
                res.setEncoding('utf-8');
                if (res.statusCode !== 200) {
                    error('sendRequest() error: ' + res.statusMessage);
                }
                var rawData: string = '';
                res.on('data', (chunk: string) => {
                    rawData += chunk;
                });
                res.on('end', () => {
                    try {
                        success(JSON.parse(rawData));
                    } catch (e) {
                        error(e.message);
                    }
                });
            }
        );
        req.write(postData, (err: Error) => {
            if (err) {
                console.log('Write error:  ' + err.message);
            }
        });
        req.on('error', (err: Error) => {
            error(err.message);
            console.log('Error:  ' + err.message);
            console.log('Params: ' + JSON.stringify(json));
        });
        req.end();
    }

    static showLicenses(): void {
        App.licensesWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 500,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.licensesWindow.setMenu(null);
        App.licensesWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'licenses.html'));
        App.licensesWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    static openLicense(arg: any): void {
        var licenseFile = '';
        var title = '';
        switch (arg.type) {
            case 'TMXEditor':
                licenseFile = 'file://' + App.path.join(app.getAppPath(), 'html', 'licenses', 'license.txt');
                title = 'TMXEditor License';
                break;
            case "electron":
                licenseFile = 'file://' + App.path.join(app.getAppPath(), 'html', 'licenses', 'electron.txt');
                title = 'MIT License';
                break;
            case "TypeScript":
            case "MapDB":
                licenseFile = 'file://' + App.path.join(app.getAppPath(), 'html', 'licenses', 'Apache2.0.html');
                title = 'Apache 2.0';
                break;
            case "Java":
                licenseFile = 'file://' + App.path.join(app.getAppPath(), 'html', 'licenses', 'java.html');
                title = 'GPL2 with Classpath Exception';
                break;
            case "OpenXLIFF":
            case "TMXValidator":
            case "H2":
                licenseFile = 'file://' + App.path.join(app.getAppPath(), 'html', 'licenses', 'EclipsePublicLicense1.0.html');
                title = 'Eclipse Public License 1.0';
                break;
            case "JSON":
                licenseFile = 'file://' + App.path.join(app.getAppPath(), 'html', 'licenses', 'json.txt');
                title = 'JSON.org License';
                break;
            case "jsoup":
                licenseFile = 'file://' + App.path.join(app.getAppPath(), 'html', 'licenses', 'jsoup.txt');
                title = 'MIT License';
                break;
            case "DTDParser":
                licenseFile = 'file://' + App.path.join(app.getAppPath(), 'html', 'licenses', 'LGPL2.1.txt');
                title = 'LGPL 2.1';
                break;
            default:
                App.showMessage({ type: 'error', message: 'Unknown license' });
                return;
        }
        var licenseWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 680,
            height: 400,
            show: false,
            title: title,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        licenseWindow.setMenu(null);
        licenseWindow.loadURL(licenseFile);
        licenseWindow.once('ready-to-show', () => {
            licenseWindow.show();
        });
        licenseWindow.webContents.on('did-finish-load', () => {
            readFile(App.currentCss.substring('file://'.length), (error: Error, data: Buffer) => {
                if (!error) {
                    licenseWindow.webContents.insertCSS(data.toString());
                }
            });
        });
    }

    static showHelp(): void {
        shell.openExternal('file://' + App.path.join(app.getAppPath(), 'tmxeditor.pdf'),
            { activate: true, workingDirectory: app.getAppPath() }
        ).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    static openFileDialog(): void {
        dialog.showOpenDialog({
            title: 'Open TMX File',
            properties: ['openFile'],
            filters: [
                { name: 'TMX File', extensions: ['tmx'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                App.openFile(value.filePaths[0]);
                App.saveRecent(value.filePaths[0]);
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
            console.log(error);
        });
    }

    static openFile(file: string): void {
        App.mainWindow.webContents.send('start-waiting');
        App.mainWindow.webContents.send('set-status', 'Opening file...');
        App.sendRequest({ command: 'openFile', file: file },
            (data: any) => {
                App.currentStatus = data;
                var intervalObject = setInterval(() => {
                    if (App.currentStatus.status === COMPLETED) {
                        clearInterval(intervalObject);
                        App.getFileLanguages();
                        App.filterOptions = {};
                        App.sortOptions = {};
                        App.mainWindow.webContents.send('file-loaded', App.currentStatus);
                        App.currentFile = file;
                        App.mainWindow.setTitle(App.currentFile);
                        App.saved = true;
                        App.mainWindow.setDocumentEdited(false);
                        App.mainWindow.webContents.send('end-waiting');
                        return;
                    } else if (App.currentStatus.status === LOADING) {
                        // it's OK, keep waiting
                        App.mainWindow.webContents.send('status-changed', App.currentStatus);
                    } else if (App.currentStatus.status === ERROR) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: App.currentStatus.reason });
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'openFile'
                    } else {
                        App.mainWindow.webContents.send('end-waiting');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error loading file');
                        return;
                    }
                    App.getLoadingProgress();
                }, 500);
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getLoadingProgress(): void {
        App.sendRequest({ command: 'loadingProgress' },
            (data: any) => {
                App.currentStatus = data;
            },
            (reason: string) => {
                console.log(reason);
            }
        );
    }

    static closeFile(): void {
        if (App.currentFile === '') {
            return;
        }
        if (!App.saved) {
            let clicked: number = dialog.showMessageBoxSync(App.mainWindow, {
                type: 'question',
                title: 'Save changes?',
                message: 'Your changes  will be lost if you don\'t save them',
                buttons: ['Don\'t Save', 'Cancel', 'Save'],
                defaultId: 2
            });
            if (clicked === 0) {
                App.saved = true;
                App.mainWindow.setDocumentEdited(false);
            }
            if (clicked === 1) {
                return;
            }
            if (clicked === 2) {
                App.shouldClose = true;
                App.saveFile();
                return;
            }
        }
        App.mainWindow.webContents.send('set-status', 'Closing file...');
        App.mainWindow.webContents.send('start-waiting');
        App.sendRequest({ command: 'closeFile' },
            (data: any) => {
                App.mainWindow.webContents.send('end-waiting');
                if (data.status === SUCCESS) {
                    App.mainWindow.webContents.send('file-closed');
                    App.mainWindow.webContents.send('set-status', '');
                    App.currentFile = '';
                    App.mainWindow.setTitle('TMXEditor');
                    App.saved = true;
                    App.mainWindow.setDocumentEdited(false);
                } else {
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getFileLanguages(): void {
        App.mainWindow.webContents.send('set-status', 'Getting languages...');
        App.sendRequest({ command: 'getLanguages' },
            (data: any) => {
                App.mainWindow.webContents.send('set-status', '');
                if (data.status === SUCCESS) {
                    App.fileLanguages = data.languages;
                    App.mainWindow.webContents.send('update-languages', App.fileLanguages);
                } else {
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.mainWindow.webContents.send('set-status', '');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static saveDefaults(): void {
        var defaults = App.mainWindow.getBounds();
        if (!App.currentDefaults) {
            return;
        }
        if (defaults.width === App.currentDefaults.width && defaults.height === App.currentDefaults.height && defaults.x === App.currentDefaults.x) {
            return;
        }
        if (defaults.width === 800 && defaults.height === 600) {
            return;
        }
        writeFileSync(App.path.join(app.getPath('appData'), app.name, 'defaults.json'), JSON.stringify(defaults));
    }

    static loadSegments(): void {
        var json: any = {
            command: 'getSegments'
        }
        Object.assign(json, App.loadOptions);
        Object.assign(json, App.filterOptions);
        Object.assign(json, App.sortOptions);
        App.mainWindow.webContents.send('start-waiting');
        App.mainWindow.webContents.send('set-status', 'Loading segments...');
        App.sendRequest(json,
            (data: any) => {
                App.mainWindow.webContents.send('set-status', '');
                App.mainWindow.webContents.send('end-waiting');
                if (data.status === SUCCESS) {
                    App.mainWindow.webContents.send('update-segments', data);
                } else {
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static loadDefaults(): void {
        App.currentDefaults = { width: 900, height: 700, x: 0, y: 0 };
        if (existsSync(App.path.join(app.getPath('appData'), app.name, 'defaults.json'))) {
            try {
                var data: Buffer = readFileSync(App.path.join(app.getPath('appData'), app.name, 'defaults.json'));
                App.currentDefaults = JSON.parse(data.toString());
            } catch (err) {
                console.log(err);
            }
        }
    }

    static savePreferences(): void {
        writeFileSync(App.path.join(app.getPath('appData'), app.name, 'preferences.json'), JSON.stringify(App.currentPreferences));
    }

    static loadPreferences() {
        App.currentPreferences = { theme: 'system', indentation: 2, threshold: 100 };
        let dark: string = 'file://' + App.path.join(app.getAppPath(), 'css', 'dark.css');
        let light: string = 'file://' + App.path.join(app.getAppPath(), 'css', 'light.css');
        let preferencesFile = App.path.join(app.getPath('appData'), app.name, 'preferences.json');
        if (existsSync(preferencesFile)) {
            try {
                var data: Buffer = readFileSync(preferencesFile);
                App.currentPreferences = JSON.parse(data.toString());
            } catch (err) {
                console.log(err);
            }
        }
        if (App.currentPreferences.theme === 'system') {
            if (nativeTheme.shouldUseDarkColors) {
                App.currentCss = dark;
            } else {
                App.currentCss = light;
            }
        }
        if (App.currentPreferences.theme === 'dark') {
            App.currentCss = dark;
        }
        if (App.currentPreferences.theme === 'light') {
            App.currentCss = light;
        }
    }

    static saveRecent(file: string): void {
        readFile(App.path.join(app.getPath('appData'), app.name, 'recent.json'), (err: Error, data: Buffer) => {
            if (err instanceof Error) {
                return;
            }
            var jsonData = JSON.parse(data.toString());
            jsonData.files = jsonData.files.filter((f: string) => {
                return f !== file;
            });
            jsonData.files.unshift(file);
            if (jsonData.files.length > 8) {
                jsonData.files = jsonData.files.slice(0, 8);
            }
            writeFile(App.path.join(app.getPath('appData'), app.name, 'recent.json'), JSON.stringify(jsonData), (error: Error) => {
                if (error) {
                    App.showMessage({ type: 'error', message: error.message });
                    return;
                }
            });
        });
        app.addRecentDocument(file);
    }

    static getCellProperties(id: string, lang: string): void {
        App.mainWindow.webContents.send('start-waiting');
        App.sendRequest({ command: 'getTuvData', id: id, lang: lang },
            (data: any) => {
                App.mainWindow.webContents.send('end-waiting');
                data.type = lang;
                App.mainWindow.webContents.send('update-properties', data);
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getRowProperties(id: string): void {
        App.mainWindow.webContents.send('start-waiting');
        App.sendRequest({ command: 'getTuData', id: id },
            (data: any) => {
                App.mainWindow.webContents.send('end-waiting');
                data.type = 'TU';
                App.mainWindow.webContents.send('update-properties', data);
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    editAttributes(arg: any): void {
        App.attributesWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 630,
            minimizable: false,
            maximizable: false,
            resizable: false,
            useContentSize: true,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.attributesArg = arg;
        App.attributesWindow.setMenu(null);
        App.attributesWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'attributes.html'));
        App.attributesWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    saveAttributes(arg: any): void {
        App.mainWindow.webContents.send('start-waiting');
        App.attributesWindow.close();
        arg.command = 'setAttributes';
        App.sendRequest(arg,
            (data: any) => {
                App.mainWindow.webContents.send('end-waiting');
                if (data.status === SUCCESS) {
                    if (arg.lang === '') {
                        App.getRowProperties(arg.id);
                    } else {
                        App.getCellProperties(arg.id, arg.lang);
                    }
                    App.saved = false;
                    App.mainWindow.setDocumentEdited(true);
                } else {
                    App.mainWindow.webContents.send('end-waiting');
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    editProperties(arg: any): void {
        App.propertiesWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 500,
            minimizable: false,
            maximizable: false,
            resizable: false,
            useContentSize: true,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.propertiesArg = arg;
        App.propertiesWindow.setMenu(null);
        App.propertiesWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'properties.html'));
        App.propertiesWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    static showAddProperty(event: IpcMainEvent): void {
        App.propertyEvent = event;
        App.addPropertyWindow = new BrowserWindow({
            parent: App.propertiesWindow,
            width: 350,
            minimizable: false,
            maximizable: false,
            resizable: false,
            modal: true,
            useContentSize: true,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.addPropertyWindow.setMenu(null);
        App.addPropertyWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'addProperty.html'));
        App.addPropertyWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    addNewProperty(arg: any): void {
        App.addPropertyWindow.close();
        App.propertyEvent.sender.send('set-new-property', arg);
    }

    saveProperties(arg: any): void {
        App.mainWindow.webContents.send('start-waiting');
        App.propertiesWindow.close();
        arg.command = 'setProperties';
        App.sendRequest(arg,
            (data: any) => {
                App.mainWindow.webContents.send('end-waiting');
                if (data.status === SUCCESS) {
                    if (arg.lang === '') {
                        App.getRowProperties(arg.id);
                    } else {
                        App.getCellProperties(arg.id, arg.lang);
                    }
                    App.saved = false;
                    App.mainWindow.setDocumentEdited(true);
                } else {
                    App.mainWindow.webContents.send('end-waiting');
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static editNotes(arg: any): void {
        App.notesWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 500,
            minimizable: false,
            maximizable: false,
            resizable: false,
            useContentSize: true,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.notesArg = arg;
        App.notesWindow.setMenu(null);
        App.notesWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'notes.html'));
        App.notesWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    showAddNote(event: IpcMainEvent): void {
        App.notesEvent = event;
        App.addNotesWindow = new BrowserWindow({
            parent: App.notesWindow,
            width: 350,
            minimizable: false,
            maximizable: false,
            resizable: false,
            modal: true,
            useContentSize: true,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.addNotesWindow.setMenu(null);
        App.addNotesWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'addNote.html'));
        App.addNotesWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    addNewNote(arg: any): void {
        App.addNotesWindow.close();
        App.notesEvent.sender.send('set-new-note', arg);
    }

    saveNotes(arg: any): void {
        App.mainWindow.webContents.send('start-waiting');
        App.notesWindow.close();
        arg.command = 'setNotes';
        App.sendRequest(arg,
            (data: any) => {
                App.mainWindow.webContents.send('end-waiting');
                if (data.status === SUCCESS) {
                    if (arg.lang === '') {
                        App.getRowProperties(arg.id);
                    } else {
                        App.getCellProperties(arg.id, arg.lang);
                    }
                    App.saved = false;
                    App.mainWindow.setDocumentEdited(true);
                } else {
                    App.mainWindow.webContents.send('end-waiting');
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showSettings(): void {
        App.settingsWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 450,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.settingsWindow.setMenu(null);
        App.settingsWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'preferences.html'));
        App.settingsWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    static setTheme(): void {
        App.mainWindow.webContents.send('request-theme');
    }

    static createNewFile(): void {
        App.newFileWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 480,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.newFileWindow.setMenu(null);
        App.newFileWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'newFile.html'));
        App.newFileWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    createFile(arg: any): void {
        App.newFileWindow.close();
        if (App.currentFile !== '' && !App.saved) {
            let response = dialog.showMessageBoxSync(App.mainWindow, { type: 'question', message: 'Save changes?', buttons: ['Yes', 'No'] });
            if (response === 0) {
                App.saveFile();
            }
        }
        arg.command = 'createFile';
        App.sendRequest(arg,
            (data: any) => {
                if (data.status === SUCCESS) {
                    App.openFile(data.path);
                    App.needsName = true;
                } else {
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static saveFile(): void {
        if (App.currentFile === '') {
            return;
        }
        if (App.needsName) {
            App.saveAs();
            return;
        }
        App.sendRequest({ command: 'saveFile', file: App.currentFile },
            (data: any) => {
                App.currentStatus = data;
                App.mainWindow.webContents.send('set-status', 'Saving...');
                var intervalObject = setInterval(() => {
                    if (App.currentStatus.status === COMPLETED) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.saved = true;
                        App.mainWindow.setDocumentEdited(false);
                        if (App.shouldClose) {
                            App.shouldClose = false;
                            App.closeFile();
                        }
                        if (App.shouldQuit) {
                            App.close();
                        }
                        return;
                    } else if (App.currentStatus.status === SAVING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: App.currentStatus.reason });
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'saveFile'
                    } else {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error saving file');
                        return;
                    }
                    App.getSavingProgress();
                }, 500);
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getSavingProgress(): void {
        App.sendRequest({ command: 'savingProgress' },
            (data: any) => {
                App.currentStatus = data;
            },
            (reason: string) => {
                console.log(reason);
            }
        );
    }

    static saveAs(): void {
        dialog.showSaveDialog({
            title: 'Save TMX File',
            properties: ['showOverwriteConfirmation', 'createDirectory'],
            filters: [
                { name: 'TMX File', extensions: ['tmx'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: SaveDialogReturnValue) => {
            if (!value.canceled) {
                App.currentFile = value.filePath;
                App.needsName = false;
                App.saveFile();
                App.mainWindow.setTitle(App.currentFile);
                App.saveRecent(App.currentFile);
                App.saved = true;
                App.mainWindow.setDocumentEdited(false);
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    static convertCSV(): void {
        App.convertCsvWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 600,
            minimizable: false,
            maximizable: false,
            resizable: true,
            useContentSize: true,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.convertCsvWindow.setMenu(null);
        App.convertCsvWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'convertCSV.html'));
        App.convertCsvWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    convertCsvTmx(arg: any): void {
        App.convertCsvWindow.close();
        arg.command = 'convertCsv';
        App.sendRequest(arg,
            (data: any) => {
                if (data.status === SUCCESS) {
                    if (arg.openTMX) {
                        if (App.currentFile !== '') {
                            App.closeFile();
                        }
                        App.openFile(arg.tmxFile);
                    } else {
                        App.showMessage({ type: 'info', message: 'File converted' });
                    }
                } else {
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    getCharsets(event: IpcMainEvent): void {
        App.sendRequest({ command: 'getCharsets' },
            (data: any) => {
                if (data.status === SUCCESS) {
                    event.sender.send('set-charsets', data.charsets);
                } else {
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    getCsvPreview(event: IpcMainEvent, arg: any): void {
        arg.command = 'previewCsv';
        App.sendRequest(arg,
            (data: any) => {
                if (data.status === SUCCESS) {
                    event.sender.send('set-preview', data);
                } else {
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    getCsvFile(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: 'Open CSV/Text File',
            properties: ['openFile'],
            filters: [
                { name: 'CSV/Text File', extensions: ['csv', 'txt'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-csvfile', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    getConvertedTMX(event: IpcMainEvent, arg: any): void {
        dialog.showSaveDialog({
            title: 'Converted TMX File',
            defaultPath: arg.default,
            properties: ['showOverwriteConfirmation', 'createDirectory'],
            filters: [
                { name: 'TMX File', extensions: ['tmx'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: SaveDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('converted-tmx-file', value.filePath);
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    getCsvLanguages(event: IpcMainEvent, arg: any): void {
        App.csvEvent = event;
        App.csvLangArgs = arg;
        App.csvLanguagesWindow = new BrowserWindow({
            parent: App.convertCsvWindow,
            modal: true,
            width: 600,
            minimizable: false,
            maximizable: false,
            resizable: true,
            useContentSize: true,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.csvLanguagesWindow.setMenu(null);
        App.csvLanguagesWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'csvLanguages.html'));
        App.csvLanguagesWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    setCsvLanguages(arg: any): void {
        App.csvLanguagesWindow.close();
        App.csvEvent.sender.send('csv-languages', arg);
    }

    static exportDelimited(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        dialog.showSaveDialog({
            title: 'Export TAB Delimited',
            properties: ['showOverwriteConfirmation', 'createDirectory'],
            filters: [
                { name: 'Text File', extensions: ['txt'] },
                { name: 'CSV File', extensions: ['csv'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: SaveDialogReturnValue) => {
            if (!value.canceled) {
                App.mainWindow.webContents.send('start-waiting');
                App.sendRequest({ command: 'exportDelimited', file: value.filePath },
                    (data: any) => {
                        App.currentStatus = data;
                        App.mainWindow.webContents.send('set-status', 'Exporting...');
                        var intervalObject = setInterval(() => {
                            if (App.currentStatus.status === COMPLETED) {
                                App.mainWindow.webContents.send('end-waiting');
                                App.mainWindow.webContents.send('set-status', '');
                                clearInterval(intervalObject);
                                App.showMessage({ type: 'info', message: 'File exported' });
                                return;
                            } else if (App.currentStatus.status === ERROR) {
                                App.mainWindow.webContents.send('end-waiting');
                                App.mainWindow.webContents.send('set-status', '');
                                clearInterval(intervalObject);
                                App.showMessage({ type: 'error', message: App.currentStatus.reason });
                                return;
                            } else if (App.currentStatus.status === SUCCESS) {
                                // keep waiting
                            } else {
                                App.mainWindow.webContents.send('end-waiting');
                                App.mainWindow.webContents.send('set-status', '');
                                clearInterval(intervalObject);
                                dialog.showErrorBox('Error', 'Unknown error exporting file');
                                return;
                            }
                            App.getExportProgress();
                        }, 500);
                    },
                    (reason: string) => {
                        App.mainWindow.webContents.send('end-waiting');
                        App.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    static getExportProgress(): void {
        App.sendRequest({ command: 'exportProgress' },
            (data: any) => {
                App.currentStatus = data;
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showFileInfo(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.fileInfoWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 550,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: true,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.fileInfoWindow.setMenu(null);
        App.fileInfoWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'fileInfo.html'));
        App.fileInfoWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    fileProperties(event: IpcMainEvent): void {
        App.sendRequest({ command: 'getFileProperties' },
            (data: any) => {
                if (data.status === SUCCESS) {
                    event.sender.send('set-file-properties', data);
                } else {
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static validateFile(): void {
        dialog.showOpenDialog({
            title: 'Validate TMX File',
            properties: ['openFile'],
            filters: [
                { name: 'TMX File', extensions: ['tmx'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                App.mainWindow.webContents.send('start-waiting');
                App.sendRequest({ command: 'validateFile', file: value.filePaths[0] },
                    (data: any) => {
                        App.currentStatus = data;
                        App.mainWindow.webContents.send('set-status', 'Validating...');
                        var intervalObject = setInterval(() => {
                            if (App.currentStatus.status === COMPLETED) {
                                App.mainWindow.webContents.send('end-waiting');
                                App.mainWindow.webContents.send('set-status', '');
                                clearInterval(intervalObject);
                                App.showMessage({ type: 'info', message: 'File is valid' });
                                return;
                            } else if (App.currentStatus.status === ERROR) {
                                App.mainWindow.webContents.send('end-waiting');
                                App.mainWindow.webContents.send('set-status', '');
                                clearInterval(intervalObject);
                                App.showMessage({ type: 'error', message: App.currentStatus.reason });
                                return;
                            } else if (App.currentStatus.status === SUCCESS) {
                                // keep waiting
                            } else {
                                App.mainWindow.webContents.send('end-waiting');
                                App.mainWindow.webContents.send('set-status', '');
                                clearInterval(intervalObject);
                                dialog.showErrorBox('Error', 'Unknown error validating file');
                                return;
                            }
                            App.getValidatingProgress();
                        }, 500);
                    },
                    (reason: string) => {
                        App.mainWindow.webContents.send('end-waiting');
                        App.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    static getValidatingProgress(): void {
        App.sendRequest({ command: 'validatingProgress' },
            (data: any) => {
                App.currentStatus = data;
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static cleanCharacters(): void {
        dialog.showOpenDialog({
            title: 'Clean Characters',
            properties: ['openFile'],
            filters: [
                { name: 'TMX File', extensions: ['tmx'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                App.mainWindow.webContents.send('start-waiting');
                App.sendRequest({ command: 'cleanCharacters', file: value.filePaths[0] },
                    (data: any) => {
                        App.currentStatus = data;
                        App.mainWindow.webContents.send('set-status', 'Cleaning...');
                        var intervalObject = setInterval(() => {
                            if (App.currentStatus.status === COMPLETED) {
                                App.mainWindow.webContents.send('end-waiting');
                                App.mainWindow.webContents.send('set-status', '');
                                clearInterval(intervalObject);
                                App.showMessage({ type: 'info', message: 'File cleaned' });
                                return;
                            } else if (App.currentStatus.status === ERROR) {
                                App.mainWindow.webContents.send('end-waiting');
                                App.mainWindow.webContents.send('set-status', '');
                                clearInterval(intervalObject);
                                App.showMessage({ type: 'error', message: App.currentStatus.reason });
                                return;
                            } else if (App.currentStatus.status === SUCCESS) {
                                // keep waiting
                            } else {
                                App.mainWindow.webContents.send('end-waiting');
                                App.mainWindow.webContents.send('set-status', '');
                                clearInterval(intervalObject);
                                dialog.showErrorBox('Error', 'Unknown error cleaning characters');
                                return;
                            }
                            App.getCleaningProgress();
                        }, 500);
                    },
                    (reason: string) => {
                        App.mainWindow.webContents.send('end-waiting');
                        App.showMessage({ type: 'error', message: reason });
                    }
                );
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    static getCleaningProgress(): void {
        App.sendRequest({ command: 'cleaningProgress' },
            (data: any) => {
                App.currentStatus = data;
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static splitFile(): void {
        App.splitFileWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 504,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: true,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.splitFileWindow.setMenu(null);
        App.splitFileWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'splitFile.html'));
        App.splitFileWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    splitTmx(arg: any): void {
        App.splitFileWindow.close();
        arg.command = 'splitFile';
        App.sendRequest(arg,
            (data: any) => {
                App.currentStatus = data;
                App.mainWindow.webContents.send('set-status', 'Splitting...');
                var intervalObject = setInterval(() => {
                    if (App.currentStatus.status === COMPLETED) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'info', message: 'File split' });
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: App.currentStatus.reason });
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'replaceText'
                    } else {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error splitting file');
                        return;
                    }
                    App.getSplitProgress();
                }, 500);
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getSplitProgress(): void {
        App.sendRequest({ command: 'getSplitProgress' },
            (data: any) => {
                App.currentStatus = data;
            },
            (reason: string) => {
                console.log(reason);
            }
        );
    }

    selectTmx(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: 'TMX File',
            properties: ['openFile'],
            filters: [
                { name: 'TMX File', extensions: ['tmx'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('tmx-file', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    static mergeFiles(): void {
        App.mergeFilesWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 560,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: true,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.mergeFilesWindow.setMenu(null);
        App.mergeFilesWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'mergeFiles.html'));
        App.mergeFilesWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    mergeTmxFiles(arg: any): void {
        App.mergeFilesWindow.close();
        App.mainWindow.webContents.send('start-waiting');
        arg.command = 'mergeFiles';
        App.sendRequest(arg,
            (data: any) => {
                App.currentStatus = data;
                App.mainWindow.webContents.send('set-status', 'Merging...');
                var intervalObject = setInterval(() => {
                    if (App.currentStatus.status === COMPLETED) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'info', message: 'Files merged' });
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: App.currentStatus.reason });
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'mergeFiles'
                    } else {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: 'Unknown error merging files' });
                        return;
                    }
                    App.getMergeProgress();
                }, 500);
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getMergeProgress(): void {
        App.sendRequest({ command: 'getMergeProgress' },
            (data: any) => {
                App.currentStatus = data;
            },
            (reason: string) => {
                console.log(reason);
            }
        );
    }

    static saveEdits(): void {
        if (App.currentFile === '') {
            return;
        }
        App.mainWindow.webContents.send('save-edit');
    }

    static cancelEdit(): void {
        if (App.currentFile === '') {
            return;
        }
        App.mainWindow.webContents.send('cancel-edit');
    }

    addTmxFiles(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: 'TMX Files',
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'TMX File', extensions: ['tmx'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('tmx-files', value.filePaths);
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    selectMergedTmx(event: IpcMainEvent): void {
        dialog.showSaveDialog({
            title: 'Merged TMX File',
            properties: ['showOverwriteConfirmation', 'createDirectory'],
            filters: [
                { name: 'TMX File', extensions: ['tmx'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then((value: SaveDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('merged-tmx-file', value.filePath);
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    saveData(event: IpcMainEvent, arg: any): void {
        arg.command = 'saveTuvData';
        App.sendRequest(arg,
            (data: any) => {
                if (data.status === SUCCESS) {
                    App.mainWindow.setDocumentEdited(true);
                    App.saved = false;
                    event.sender.send('data-saved', data);
                    return;
                }
                App.showMessage({ type: 'error', message: data.reason });
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static replaceText(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.replaceTextWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 450,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.replaceTextWindow.setMenu(null);
        App.replaceTextWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'searchReplace.html'));
        App.replaceTextWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    replaceRequest(arg: any): void {
        App.replaceTextWindow.close();
        App.mainWindow.webContents.send('start-waiting');
        arg.command = 'replaceText';
        App.sendRequest(arg,
            (data: any) => {
                App.currentStatus = data;
                App.mainWindow.webContents.send('set-status', 'Replacing...');
                var intervalObject = setInterval(() => {
                    if (App.currentStatus.status === COMPLETED) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.loadSegments();
                        App.getCount();
                        App.saved = false;
                        App.mainWindow.setDocumentEdited(true);
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: App.currentStatus.reason });
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'replaceText'
                    } else {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: 'Unknown error replacing text' });
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getProcessingProgress(): void {
        App.sendRequest({ command: 'processingProgress' },
            (data: any) => {
                App.currentStatus = data;
            },
            (reason: string) => {
                console.log(reason);
            }
        );
    }

    static sortUnits() {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.sortUnitsWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 450,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.sortUnitsWindow.setMenu(null);
        App.sortUnitsWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'sortUnits.html'));
        App.sortUnitsWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    setSort(arg: any): void {
        App.sortOptions = arg;
        App.sortUnitsWindow.close();
        App.loadSegments();
        App.mainWindow.webContents.send('sort-on');
    }

    clearSort(): void {
        App.sortOptions = {};
        App.sortUnitsWindow.close();
        App.loadSegments();
        App.mainWindow.webContents.send('sort-off');
    }

    static showFilters(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.filtersWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 520,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.filtersWindow.setMenu(null);
        App.filtersWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'filters.html'));
        App.filtersWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    setFilterOptions(arg: any): void {
        App.filterOptions = arg;
        App.filtersWindow.close();
        this.setFirstPage();
        App.loadSegments();
        App.mainWindow.webContents.send('filters-on');
    }

    setFirstPage(): void {
        App.loadOptions.start = 0;
        App.mainWindow.webContents.send('set-first-page');
    }

    clearFilterOptions(): void {
        App.filterOptions = {};
        App.filtersWindow.close();
        this.setFirstPage();
        App.loadSegments();
        App.mainWindow.webContents.send('filters-off');
    }

    static insertUnit(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.sendRequest({ command: 'insertUnit' },
            (data: any) => {
                if (data.status === SUCCESS) {
                    App.mainWindow.webContents.send('unit-inserted', data.id);
                } else {
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static requestDeleteUnits(): void {
        App.mainWindow.webContents.send('request-delete');
    }

    deleteUnits(arg: any): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        var selected: string[] = arg;
        if (selected.length === 0) {
            App.showMessage({ type: 'warning', message: 'Select units' });
            return;
        }
        App.sendRequest({ command: 'deleteUnits', selected },
            (data: any) => {
                if (data.status === SUCCESS) {
                    App.getFileLanguages();
                    App.getCount();
                    App.loadSegments();
                    App.saved = false;
                    App.mainWindow.setDocumentEdited(true);
                } else {
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static firstPage(): void {
        App.mainWindow.webContents.send('first-page');
    }

    static previousPage(): void {
        App.mainWindow.webContents.send('previous-page');
    }

    static nextPage(): void {
        App.mainWindow.webContents.send('next-page');
    }

    static lastPage(): void {
        App.mainWindow.webContents.send('last-page');
    }

    static changeLanguageCode(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.changeLanguageWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 490,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.changeLanguageWindow.setMenu(null);
        App.changeLanguageWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'changeLanguage.html'));
        App.changeLanguageWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    changeLanguage(arg: any): void {
        App.changeLanguageWindow.close();
        arg.command = 'changeLanguage';
        App.sendRequest(arg,
            (data: any) => {
                App.currentStatus = data;
                App.mainWindow.webContents.send('set-status', 'Changing...');
                var intervalObject = setInterval(() => {
                    if (App.currentStatus.status === COMPLETED) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.getFileLanguages();
                        App.loadSegments();
                        App.saved = false;
                        App.mainWindow.setDocumentEdited(true);
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: App.currentStatus.reason });
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'replaceText'
                    } else {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: 'Unknown error changing language code' });
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    allLanguages(event: IpcMainEvent): void {
        App.sendRequest({ command: 'getAllLanguages' },
            (data: any) => {
                if (data.status === SUCCESS) {
                    event.sender.send('languages-list', data.languages);
                } else {
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showRemoveLanguage(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.removeLanguageWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 420,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.removeLanguageWindow.setMenu(null);
        App.removeLanguageWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'removeLanguage.html'));
        App.removeLanguageWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    removeLanguage(arg: any): void {
        App.removeLanguageWindow.close();
        App.sendRequest({ command: 'removeLanguage', lang: arg },
            (data: any) => {
                if (data.status === SUCCESS) {
                    App.getFileLanguages();
                    App.loadSegments();
                    App.saved = false;
                    App.mainWindow.setDocumentEdited(true);
                } else {
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showAddLanguage(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.addLanguageWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 420,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.addLanguageWindow.setMenu(null);
        App.addLanguageWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'addLanguage.html'));
        App.addLanguageWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    addLanguage(arg: any): void {
        App.addLanguageWindow.close();
        App.sendRequest({ command: 'addLanguage', lang: arg },
            (data: any) => {
                if (data.status === SUCCESS) {
                    App.getFileLanguages();
                    App.loadSegments();
                    App.saved = false;
                    App.mainWindow.setDocumentEdited(true);
                } else {
                    App.showMessage({ type: 'error', message: data.reason });
                }
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showChangeSourceLanguage(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.srcLanguageWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 420,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.srcLanguageWindow.setMenu(null);
        App.srcLanguageWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'srcLanguage.html'));
        App.srcLanguageWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    getSourceLanguage(event: IpcMainEvent): void {
        App.sendRequest({ command: 'getSrcLanguage' },
            (data: any) => {
                if (data.status === SUCCESS) {
                    event.sender.send('set-source-language', data);
                } else {
                    App.showMessage({ type: 'warning', message: data.reason });
                }
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static removeTags(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        App.sendRequest({ command: 'removeTags' },
            (data: any) => {
                App.currentStatus = data;
                App.mainWindow.webContents.send('set-status', 'Removing tags...');
                var intervalObject = setInterval(() => {
                    if (App.currentStatus.status === COMPLETED) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.loadSegments();
                        App.saved = false;
                        App.mainWindow.setDocumentEdited(true);
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: App.currentStatus.reason });
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'removeDuplicates'
                    } else {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error removing tags');
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    changeSourceLanguage(arg: any): void {
        App.srcLanguageWindow.close();
        App.sendRequest({ command: 'setSrcLanguage', lang: arg },
            (data: any) => {
                App.saved = false;
                App.mainWindow.setDocumentEdited(true);
                if (data.status !== SUCCESS) {
                    App.showMessage({ type: 'warning', message: data.reason });
                }
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static removeDuplicates(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        App.sendRequest({ command: 'removeDuplicates' },
            (data: any) => {
                App.currentStatus = data;
                App.mainWindow.webContents.send('set-status', 'Removing duplicates...');
                var intervalObject = setInterval(() => {
                    if (App.currentStatus.status === COMPLETED) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.loadSegments();
                        App.getCount();
                        App.saved = false;
                        App.mainWindow.setDocumentEdited(true);
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: App.currentStatus.reason });
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'removeDuplicates'
                    } else {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error removing duplicates');
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static getCount(): void {
        App.sendRequest({ command: 'getCount' },
            (data: any) => {
                App.mainWindow.webContents.send('status-changed', data);
            },
            (reason: string) => {
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showRemoveUntranslated(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.removeUntranslatedWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 470,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.removeUntranslatedWindow.setMenu(null);
        App.removeUntranslatedWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'removeUntranslated.html'));
        App.removeUntranslatedWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    removeUntranslated(arg: any): void {
        App.removeUntranslatedWindow.close();
        App.mainWindow.webContents.send('start-waiting');
        arg.command = 'removeUntranslated';
        App.sendRequest(arg,
            (data: any) => {
                App.currentStatus = data;
                App.mainWindow.webContents.send('set-status', 'Removing units...');
                var intervalObject = setInterval(() => {
                    if (App.currentStatus.status === COMPLETED) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.loadSegments();
                        App.getCount();
                        App.saved = false;
                        App.mainWindow.setDocumentEdited(true);
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: App.currentStatus.reason });
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'removeUntranslated'
                    } else {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error removing untranslated units');
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static removeSpaces(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        App.sendRequest({ command: 'removeSpaces' },
            (data: any) => {
                App.currentStatus = data;
                App.mainWindow.webContents.send('set-status', 'Removing spaces...');
                var intervalObject = setInterval(() => {
                    if (App.currentStatus.status === COMPLETED) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.loadSegments();
                        App.saved = false;
                        App.mainWindow.setDocumentEdited(true);
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: App.currentStatus.reason });
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'removeSpaces'
                    } else {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error removing spaces');
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static showConsolidateUnits(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        if (App.fileLanguages.length < 3) {
            App.showMessage({ type: 'warning', message: 'File must have at least 3 languages' });
            return;
        }
        App.consolidateWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 470,
            useContentSize: true,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.path.join(app.getAppPath(), 'icons', 'tmxeditor.png'),
            webPreferences: {
                nodeIntegration: true
            }
        });
        App.consolidateWindow.setMenu(null);
        App.consolidateWindow.loadURL('file://' + App.path.join(app.getAppPath(), 'html', 'consolidateUnits.html'));
        App.consolidateWindow.once('ready-to-show', (event: IpcMainEvent) => {
            event.sender.send('get-height');
        });
    }

    consolidateUnits(arg: any): void {
        App.consolidateWindow.close();
        App.mainWindow.webContents.send('start-waiting');
        arg.command = 'consolidateUnits';
        App.sendRequest(arg,
            (data: any) => {
                App.currentStatus = data;
                App.mainWindow.webContents.send('set-status', 'Consolidating...');
                var intervalObject = setInterval(() => {
                    if (App.currentStatus.status === COMPLETED) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.loadSegments();
                        App.getCount();
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.showMessage({ type: 'error', message: App.currentStatus.reason });
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'consolidateUnits'
                    } else {
                        App.mainWindow.webContents.send('end-waiting');
                        App.mainWindow.webContents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error consolidating units');
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            (reason: string) => {
                App.mainWindow.webContents.send('end-waiting');
                App.showMessage({ type: 'error', message: reason });
            }
        );
    }

    static checkUpdates(silent: boolean): void {
        App.https.get('https://raw.githubusercontent.com/rmraya/TMXEditor/master/package.json', { timeout: 1500 }, (res: IncomingMessage) => {
            if (res.statusCode === 200) {
                let rawData = '';
                res.on('data', (chunk: string) => {
                    rawData += chunk;
                });
                res.on('end', () => {
                    try {
                        const parsedData = JSON.parse(rawData);
                        if (app.getVersion() !== parsedData.version) {
                            App.showMessage({ type: 'info', message: 'Version ' + parsedData.version + ' is available' });
                        } else {
                            if (!silent) {
                                App.showMessage({ type: 'info', message: 'There are currently no updates available' });
                            }
                        }
                    } catch (e) {
                        dialog.showErrorBox('Error', e.message);
                    }
                });
            } else {
                if (!silent) {
                    dialog.showErrorBox('Error', 'Updates Request Failed.\nStatus code: ' + res.statusCode);
                }
            }
        }).on('error', (e: any) => {
            if (!silent) {
                dialog.showErrorBox('Error', e.message);
            }
        });
    }

    static showReleaseHistory(): void {
        shell.openExternal('https://www.maxprograms.com/products/tmxlog.html');
    }

    static showSupportGroup(): void {
        shell.openExternal('https://groups.io/g/maxprograms/');
    }
}

new App(process.argv);