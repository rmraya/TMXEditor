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
import { app, BrowserWindow, dialog, ipcMain, Menu, MenuItem, shell, webContents, nativeTheme, IpcMainEvent, IpcMain } from "electron";
import { existsSync, mkdirSync, readFile, readFileSync, writeFile, writeFileSync } from "fs";
import { ClientRequest, request, IncomingMessage } from "http";

var replaceTextWindow: BrowserWindow;
var filtersWindow: BrowserWindow;
var consolidateWindow: BrowserWindow;
var removeUntranslatedWindow: BrowserWindow;
var settingsWindow: BrowserWindow;
var sortUnitsWindow: BrowserWindow;
var changeLanguageWindow: BrowserWindow;
var newFileWindow: BrowserWindow;
var addLanguageWindow: BrowserWindow;
var removeLanguageWindow: BrowserWindow;
var srcLanguageWindow: BrowserWindow;
var splitFileWindow: BrowserWindow;
var mergeFilesWindow: BrowserWindow;
var convertCsvWindow: BrowserWindow;
var csvLanguagesWindow: BrowserWindow;
var csvEvent: Electron.IpcMainEvent;
var attributesWindow: BrowserWindow;
var propertiesWindow: BrowserWindow;
var propertyEvent: Electron.IpcMainEvent;
var addPropertyWindow: BrowserWindow;
var notesWindow: BrowserWindow;
var addNotesWindow: BrowserWindow
var notesEvent: Electron.IpcMainEvent;

var currentTheme: string;
var filterOptions: any = {};
var loadOptions: any = {
    start: 0,
    count: 200
};
var sortOptions: any = {};
var csvLangArgs: any;
var attributesArg: any;
var propertiesArg: any;
var notesArg: any;

var needsName: boolean = false;

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
    static contents: webContents;
    static ls: ChildProcessWithoutNullStreams;
    static shouldQuit: boolean = false;
    static stopping: boolean = false;

    static javapath: string = App.path.join(app.getAppPath(), 'bin', 'java');

    static saved: boolean = true;
    static shouldClose: boolean = false;
    static currentFile: string = '';
    static currentDefaults: any;
    static currentPreferences: any;
    static currentStatus: any = {};
    static fileLanguages: any[];
    static argFile: string = '';
    static isReady: boolean = false;

    constructor(args: string[]) {

        if (process.platform === 'win32' && args.length > 1 && args[1] !== '.') {
            App.argFile = args[1];
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

        if (!existsSync(App.path.join(app.getPath('appData'), app.getName()))) {
            mkdirSync(App.path.join(app.getPath('appData'), app.getName()), { recursive: true });
        }

        App.ls = spawn(App.javapath, ['-cp', 'lib/h2-1.4.200.jar', '--module-path', 'lib', '-m', 'tmxserver/com.maxprograms.tmxserver.TMXServer', '-port', '8060'], { cwd: app.getAppPath() });

        App.ls.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        App.ls.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        App.ls.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
        });

        var ck: Buffer = execFileSync('bin/java', ['--module-path', 'lib', '-m', 'openxliff/com.maxprograms.server.CheckURL', 'http://localhost:8060/TMXserver'], { cwd: app.getAppPath() });
        console.log(ck.toString());

        app.on('open-file', function (event, filePath) {
            event.preventDefault();
            if (App.isReady) {
                App.openFile(filePath);
            } else {
                App.argFile = filePath;
            }
        });

        app.on('quit', function (ev: Event) {
            App.stopServer();
        });

        app.on('window-all-closed', function (ev: Event) {
            app.quit();
        });

        app.on('ready', () => {
            App.isReady = true;
            App.mainLoaded();
        });

        App.loadDefaults();
        App.loadPreferences();

        app.on('ready', function () {
            App.createWindow();
            App.mainWindow.loadURL(App.path.join('file://', app.getAppPath(), 'index.html'));
            App.mainWindow.on('resize', function () {
                App.saveDefaults();
            });
            App.mainWindow.on('move', function () {
                App.saveDefaults();
            });
            App.mainWindow.show();
            App.mainWindow.on('close', (ev: Event) => {
                ev.cancelBubble = true;
                ev.preventDefault();
                App.close();
            });
            App.checkUpdates(true);
            App.setTheme();
        });

        nativeTheme.on('updated', () => {
            App.loadPreferences();
            App.setTheme();
        });

        ipcMain.on('licenses-clicked', function () {
            App.showLicenses();
        });
        ipcMain.on('open-license', function (event, arg: any) {
            App.openLicense(arg);
        });
        ipcMain.on('show-help', () => {
            App.showHelp();
        });
        ipcMain.on('open-file', function () {
            this.openFileDialog();
        });
        ipcMain.on('get-segments', function (event: IpcMainEvent, arg: any) {
            loadOptions = arg;
            App.loadSegments();
        });
        ipcMain.on('get-cell-properties', function (event: IpcMainEvent, arg: any) {
            App.getCellProperties(arg.id, arg.lang);
        });
        ipcMain.on('get-row-properties', function (event: IpcMainEvent, arg: any) {
            App.getRowProperties(arg.id);
        });
        ipcMain.on('edit-attributes', (event: IpcMainEvent, arg: any) => {
            this.editAttributes(arg);
        });
        ipcMain.on('get-unit-attributes', (event: IpcMainEvent, arg: any) => {
            event.sender.send('set-unit-attributes', attributesArg);
        });
        ipcMain.on('save-attributes', (event: IpcMainEvent, arg: any) => {
            this.saveAttributes(arg);
        });
        ipcMain.on('edit-properties', (event: IpcMainEvent, arg: any) => {
            this.editProperties(arg);
        });
        ipcMain.on('get-unit-properties', (event: IpcMainEvent, arg: any) => {
            event.sender.send('set-unit-properties', propertiesArg);
        });
        ipcMain.on('show-add-property', (event: IpcMainEvent, arg: any) => {
            this.showAddProperty(event);
        });
        ipcMain.on('add-new-property', (event: IpcMainEvent, arg: any) => {
            this.addNewProperty(arg);
        });
        ipcMain.on('save-properties', (event: IpcMainEvent, arg: any) => {
            this.saveProperties(arg);
        });
        ipcMain.on('edit-notes', (event: IpcMainEvent, arg: any) => {
            this.editNotes(arg);
        });
        ipcMain.on('get-unit-notes', (event: IpcMainEvent, arg: any) => {
            event.sender.send('set-unit-notes', notesArg);
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
        ipcMain.on('get-preferences', (event: IpcMainEvent, arg: any) => {
            event.sender.send('set-preferences', App.currentPreferences);
        });
        ipcMain.on('save-preferences', (event: IpcMainEvent, arg: any) => {
            App.currentPreferences = arg;
            App.savePreferences();
            settingsWindow.close();
            App.loadPreferences();
            App.setTheme();
        });
        ipcMain.on('get-theme', (event: IpcMainEvent, arg: any) => {
            event.sender.send('set-theme', currentTheme);
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
        ipcMain.on('get-charsets', (event: IpcMainEvent, arg: any) => {
            this.getCharsets(event);
        });
        ipcMain.on('get-csvfile', (event: IpcMainEvent, arg: any) => {
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
        ipcMain.on('get-csv-lang-args', (event: IpcMainEvent, arg: any) => {
            event.sender.send('set-csv-lang-args', csvLangArgs);
        });
        ipcMain.on('set-csv-languages', (event: IpcMainEvent, arg: any) => {
            this.setCsvLanguages(arg);
        });
        ipcMain.on('show-file-info', () => {
            App.showFileInfo();
        });
        ipcMain.on('file-properties', (event: IpcMainEvent, arg: any) => {
            this.fileProperties(event);
        });
        ipcMain.on('select-tmx', (event: IpcMainEvent, arg: any) => {
            this.selectTmx(event);
        });
        ipcMain.on('split-tmx', (event: IpcMainEvent, arg: any) => {
            this.splitTmx(arg);
        });
        ipcMain.on('select-merged-tmx', (event: IpcMainEvent, arg: any) => {
            this.selectMergedTmx(event);
        });
        ipcMain.on('add-tmx-files', (event: IpcMainEvent, arg: any) => {
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
        ipcMain.on('get-sort', (event: IpcMainEvent, arg: any) => {
            event.sender.send('sort-options', sortOptions);
        });
        ipcMain.on('filter-units', () => {
            App.showFilters();
        });
        ipcMain.on('filter-options', (event: IpcMainEvent, arg: any) => {
            this.setFilterOptions(arg);
        });
        ipcMain.on('get-filter-options', (event: IpcMainEvent, arg: any) => {
            event.sender.send('set-filter-options', filterOptions);
        });
        ipcMain.on('clear-filter-options', () => {
            this.clearFilterOptions();
        });
        ipcMain.on('get-filter-languages', (event: IpcMainEvent, arg: any) => {
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
        ipcMain.on('all-languages', (event: IpcMainEvent, arg: any) => {
            this.allLanguages(event);
        });
        ipcMain.on('remove-language', (event: IpcMainEvent, arg: any) => {
            this.removeLanguage(arg);
        });
        ipcMain.on('add-language', (event: IpcMainEvent, arg: any) => {
            this.addLanguage(arg);
        });
        ipcMain.on('get-source-language', (event: IpcMainEvent, arg: any) => {
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
        ipcMain.on('get-version', (event: IpcMainEvent, arg: any) => {
            event.sender.send('set-version', app.name + ' ' + app.getVersion());
        });
        ipcMain.on('show-message', (event: IpcMainEvent, arg: any) => {
            dialog.showMessageBox(arg);
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
        App.contents = App.mainWindow.webContents;
        var fileMenu: Menu = Menu.buildFromTemplate([
            { label: 'New', accelerator: 'CmdOrCtrl+N', click: function () { App.createNewFile(); } },
            { label: 'Open', accelerator: 'CmdOrCtrl+O', click: function () { App.openFileDialog(); } },
            { label: 'Close', accelerator: 'CmdOrCtrl+W', click: function () { App.closeFile(); } },
            { label: 'Save', accelerator: 'CmdOrCtrl+s', click: function () { App.saveFile(); } },
            { label: 'Save As', click: function () { App.saveAs() } },
            new MenuItem({ type: 'separator' }),
            { label: 'Convert CSV/TAB Delimited to TMX', click: function () { App.convertCSV(); } },
            { label: 'Export as TAB Delimited...', click: function () { App.exportDelimited(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'File Properties', click: function () { App.showFileInfo(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Validate TMX File...', click: function () { App.validateFile(); } },
            { label: 'Clean Invalid Characters...', click: function () { App.cleanCharacters(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Split TMX File...', click: function () { App.splitFile(); } },
            { label: 'Merge TMX Files...', click: function () { App.mergeFiles(); } }
        ]);
        var editMenu: Menu = Menu.buildFromTemplate([
            { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: function () { App.contents.undo(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: function () { App.contents.cut(); } },
            { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: function () { App.contents.copy(); } },
            { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: function () { App.contents.paste(); } },
            { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: function () { App.contents.selectAll(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Confirm Edit', accelerator: 'Alt+Enter', click: function () { App.saveEdits(); } },
            { label: 'Cancel Edit', accelerator: 'Esc', click: function () { App.cancelEdit(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Replace Text...', accelerator: 'CmdOrCtrl+F', click: function () { App.replaceText(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Insert Unit', click: function () { App.insertUnit(); } },
            { label: 'Delete Selected Units', click: function () { App.requestDeleteUnits(); } }
        ]);
        var viewMenu: Menu = Menu.buildFromTemplate([
            { label: 'Sort Units', accelerator: 'F5', click: function () { App.sortUnits(); } },
            { label: 'Filter Units', accelerator: 'F3', click: function () { App.showFilters() } },
            new MenuItem({ type: 'separator' }),
            { label: 'Show First Page', click: function () { App.firstPage(); } },
            { label: 'Show Previous Page', click: function () { App.previousPage(); } },
            { label: 'Show Next Page', click: function () { App.nextPage(); } },
            { label: 'Show Last Page', click: function () { App.lastPage(); } },
            new MenuItem({ type: 'separator' }),
            new MenuItem({ label: 'Toggle Full Screen', role: 'togglefullscreen' }),
            new MenuItem({ label: 'Toggle Development Tools', accelerator: 'F12', role: 'toggleDevTools' })
        ]);
        var tasksMenu: Menu = Menu.buildFromTemplate([
            { label: 'Change Language...', click: function () { App.changeLanguageCode(); } },
            { label: 'Add Language...', click: function () { App.showAddLanguage(); } },
            { label: 'Remove Language...', click: function () { App.showRemoveLanguage() } },
            { label: 'Change Source Language...', click: function () { App.showChangeSourceLanguage(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Remove All Tags', click: function () { App.removeTags(); } },
            { label: 'Remove Duplicates', click: function () { App.removeDuplicates(); } },
            { label: 'Remove Untranslated...', click: function () { App.showRemoveUntranslated(); } },
            { label: 'Remove Initial/Trailing Spaces', click: function () { App.removeSpaces(); } },
            { label: 'Consolidate Units...', click: function () { App.showConsolidateUnits(); } }
        ]);
        var helpMenu: Menu = Menu.buildFromTemplate([
            { label: 'TMXEditor User Guide', accelerator: 'F1', click: function () { App.showHelp(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Check for Updates...', click: function () { App.checkUpdates(false); } },
            { label: 'View Licenses', click: function () { App.showLicenses(); } },
            new MenuItem({ type: 'separator' }),
            { label: 'Release History', click: function () { App.showReleaseHistory(); } },
            { label: 'Support Group', click: function () { App.showSupportGroup(); } }
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
                new MenuItem({ label: 'About...', click: function () { App.showAbout(); } }),
                new MenuItem({
                    label: 'Preferences...', submenu: [
                        { label: 'Settings', accelerator: 'Cmd+,', click: function () { App.showSettings(); } }
                    ]
                }),
                new MenuItem({ type: 'separator' }),
                new MenuItem({
                    label: 'Services', role: 'services', submenu: [
                        { label: 'No Services Apply', enabled: false }
                    ]
                }),
                new MenuItem({ type: 'separator' }),
                new MenuItem({ label: 'Quit TMXEditor', accelerator: 'Cmd+Q', role: 'quit', click: function () { App.close(); } })
            ]);
            template.unshift(new MenuItem({ label: 'TMXEditor', role: 'appMenu', submenu: appleMenu }));
        } else {
            var help: MenuItem = template.pop();
            template.push(new MenuItem({
                label: '&Settings', submenu: [
                    { label: 'Preferences', click: function () { App.showSettings(); } }
                ]
            }));
            template.push(help);
        }
        if (!existsSync(App.path.join(app.getPath('appData'), app.getName(), 'recent.json'))) {
            writeFile(App.path.join(app.getPath('appData'), app.getName(), 'recent.json'), '{"files" : []}', function (err) {
                if (err) {
                    dialog.showMessageBox({ type: 'error', message: err.message });
                    return;
                }
            });
        }
        readFile(App.path.join(app.getPath('appData'), app.getName(), 'recent.json'), function (err: Error, buf: Buffer) {
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
                            template[1].submenu.append(new MenuItem({ label: file, click: function () { App.openFile(files[i]); } }));
                        } else {
                            template[0].submenu.append(new MenuItem({ label: file, click: function () { App.openFile(files[i]); } }));
                        }
                    }
                }
            }
            if (process.platform == 'win32') {
                template[0].submenu.append(new MenuItem({ type: 'separator' }));
                template[0].submenu.append(new MenuItem({ label: 'Exit', accelerator: 'Alt+F4', role: 'quit', click: function () { App.close(); } }));
                template[5].submenu.append(new MenuItem({ type: 'separator' }));
                template[5].submenu.append(new MenuItem({ label: 'About...', click: function () { App.showAbout(); } }));
            }
            if (process.platform === 'linux') {
                template[0].submenu.append(new MenuItem({ type: 'separator' }));
                template[0].submenu.append(new MenuItem({ label: 'Quit', accelerator: 'Ctrl+Q', role: 'quit', click: function () { App.close(); } }));
                template[5].submenu.append(new MenuItem({ type: 'separator' }));
                template[5].submenu.append(new MenuItem({ label: 'About...', click: function () { App.showAbout(); } }));
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
        var aboutWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('aboutWindow'),
            height: App.getHeight('aboutWindow'),
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
        aboutWindow.setMenu(null);
        aboutWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'about.html'));
        aboutWindow.show();
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
            function (res: any) {
                res.setEncoding('utf-8');
                if (res.statusCode !== 200) {
                    error('sendRequest() error: ' + res.statusMessage);
                }
                var rawData: string = '';
                res.on('data', function (chunk: string) {
                    rawData += chunk;
                });
                res.on('end', function () {
                    try {
                        success(JSON.parse(rawData));
                    } catch (e) {
                        error(e.message);
                    }
                });
            }
        );
        req.write(postData);
        req.end();
    }

    static showLicenses(): void {
        var licensesWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('licensesWindow'),
            height: App.getHeight('licensesWindow'),
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
        licensesWindow.setMenu(null);
        licensesWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'licenses.html'));
        licensesWindow.show();
    }

    static openLicense(arg: any): void {
        var licenseFile = '';
        var title = '';
        switch (arg.type) {
            case 'TMXEditor':
                licenseFile = App.path.join('file://', app.getAppPath(), 'html', 'licenses', 'license.txt');
                title = 'TMXEditor License';
                break;
            case "electron":
                licenseFile = App.path.join('file://', app.getAppPath(), 'html', 'licenses', 'electron.txt');
                title = 'MIT License';
                break;
            case "TypeScript":
            case "MapDB":
                licenseFile = App.path.join('file://', app.getAppPath(), 'html', 'licenses', 'Apache2.0.html');
                title = 'Apache 2.0';
                break;
            case "Java":
                licenseFile = App.path.join('file://', app.getAppPath(), 'html', 'licenses', 'java.html');
                title = 'GPL2 with Classpath Exception';
                break;
            case "OpenXLIFF":
            case "TMXValidator":
            case "H2":
                licenseFile = App.path.join('file://', app.getAppPath(), 'html', 'licenses', 'EclipsePublicLicense1.0.html');
                title = 'Eclipse Public License 1.0';
                break;
            case "JSON":
                licenseFile = App.path.join('file://', app.getAppPath(), 'html', 'licenses', 'json.txt');
                title = 'JSON.org License';
                break;
            case "jsoup":
                licenseFile = App.path.join('file://', app.getAppPath(), 'html', 'licenses', 'jsoup.txt');
                title = 'MIT License';
                break;
            case "DTDParser":
                licenseFile = App.path.join('file://', app.getAppPath(), 'html', 'licenses', 'LGPL2.1.txt');
                title = 'LGPL 2.1';
                break;
            default:
                dialog.showErrorBox('Error', 'Unknow license');
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
        licenseWindow.show();
    }

    static showHelp(): void {
        shell.openExternal(App.path.join('file://', app.getAppPath(), 'tmxeditor.pdf'),
            { activate: true, workingDirectory: app.getAppPath() }
        ).catch((error: Error) => {
            dialog.showErrorBox('Error', error.message);
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
        }).then(function (value: any) {
            if (!value.canceled) {
                App.openFile(value.filePaths[0]);
                App.saveRecent(value.filePaths[0]);
            }
        }).catch(function (error: Error) {
            dialog.showErrorBox('Error', error.message);
            console.log(error);
        });
    }

    static openFile(file: string): void {
        App.contents.send('start-waiting');
        App.contents.send('set-status', 'Opening file...');
        App.sendRequest({ command: 'openFile', file: file },
            function success(data: any) {
                App.currentStatus = data;
                var intervalObject = setInterval(function () {
                    if (App.currentStatus.status === COMPLETED) {
                        clearInterval(intervalObject);
                        App.getFileLanguages();
                        filterOptions = {};
                        sortOptions = {};
                        App.contents.send('file-loaded', App.currentStatus);
                        App.currentFile = file;
                        App.mainWindow.setTitle(App.currentFile);
                        App.saved = true;
                        App.mainWindow.setDocumentEdited(false);
                        App.contents.send('end-waiting');
                        return;
                    } else if (App.currentStatus.status === LOADING) {
                        // it's OK, keep waiting
                        App.contents.send('status-changed', App.currentStatus);
                    } else if (App.currentStatus.status === ERROR) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', App.currentStatus.reason);
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'openFile'
                    } else {
                        App.contents.send('end-waiting');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error loading file');
                        return;
                    }
                    App.getLoadingProgress();
                }, 500);
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showErrorBox('Error', reason);
            }
        );
    }

    static getLoadingProgress(): void {
        App.sendRequest({ command: 'loadingProgress' },
            function success(data: any) {
                App.currentStatus = data;
            },
            function error(reason: string) {
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
        App.contents.send('set-status', 'Closing file...');
        App.contents.send('start-waiting');
        App.sendRequest({ command: 'closeFile' },
            function success(json: any) {
                App.contents.send('end-waiting');
                if (json.status === SUCCESS) {
                    App.contents.send('file-closed');
                    App.contents.send('set-status', '');
                    App.currentFile = '';
                    App.mainWindow.setTitle('TMXEditor');
                    App.saved = true;
                    App.mainWindow.setDocumentEdited(false);
                } else {
                    dialog.showMessageBox({ type: 'error', message: json.reason });
                }
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static getFileLanguages(): void {
        App.contents.send('set-status', 'Getting languages...');
        App.sendRequest({ command: 'getLanguages' },
            function success(json: any) {
                App.contents.send('set-status', '');
                if (json.status === SUCCESS) {
                    App.fileLanguages = json.languages;
                    App.contents.send('update-languages', App.fileLanguages);
                } else {
                    dialog.showMessageBox({ type: 'error', message: json.reason });
                }
            },
            function error(reason: string) {
                App.contents.send('set-status', '');
                dialog.showMessageBox({ type: 'error', message: reason });
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
        writeFileSync(App.path.join(app.getPath('appData'), app.getName(), 'defaults.json'), JSON.stringify(defaults));
    }

    static loadSegments(): void {
        var json: any = {
            command: 'getSegments'
        }
        Object.assign(json, loadOptions);
        Object.assign(json, filterOptions);
        Object.assign(json, sortOptions);
        App.contents.send('start-waiting');
        App.contents.send('set-status', 'Loading segments...');
        App.sendRequest(json,
            function success(data: any) {
                App.contents.send('set-status', '');
                App.contents.send('end-waiting');
                if (data.status === SUCCESS) {
                    App.contents.send('update-segments', data);
                } else {
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static loadDefaults(): void {
        App.currentDefaults = { width: 900, height: 700, x: 0, y: 0 };
        if (existsSync(App.path.join(app.getPath('appData'), app.getName(), 'defaults.json'))) {
            try {
                var data: Buffer = readFileSync(App.path.join(app.getPath('appData'), app.getName(), 'defaults.json'));
                App.currentDefaults = JSON.parse(data.toString());
            } catch (err) {
                console.log(err);
            }
        }
    }

    static savePreferences(): void {
        writeFileSync(App.path.join(app.getPath('appData'), app.getName(), 'preferences.json'), JSON.stringify(App.currentPreferences));
        nativeTheme.themeSource = App.currentPreferences.theme;
    }

    static loadPreferences() {
        App.currentPreferences = { theme: 'system', indentation: 2 };
        if (existsSync(App.path.join(app.getPath('appData'), app.getName(), 'preferences.json'))) {
            try {
                var data: Buffer = readFileSync(App.path.join(app.getPath('appData'), app.getName(), 'preferences.json'));
                App.currentPreferences = JSON.parse(data.toString());
            } catch (err) {
                console.log(err);
            }
        }
        if (App.currentPreferences.indentation === undefined) {
            App.currentPreferences.indentation = 2;
        }
        if (App.currentPreferences.threshold === undefined) {
            App.currentPreferences.threshold = 100;
        }
        if (App.currentPreferences.theme === undefined) {
            App.currentPreferences.theme = 'system';
        }
        if (App.currentPreferences.theme === 'system') {
            if (nativeTheme.shouldUseDarkColors) {
                currentTheme = App.path.join('file://', app.getAppPath(), 'css', 'dark.css');
                nativeTheme.themeSource = 'dark';
            } else {
                currentTheme = App.path.join('file://', app.getAppPath(), 'css', 'light.css');
                nativeTheme.themeSource = 'light';
            }
        }
        if (App.currentPreferences.theme === 'dark') {
            currentTheme = App.path.join('file://', app.getAppPath(), 'css', 'dark.css');
            nativeTheme.themeSource = 'dark';
        }
        if (App.currentPreferences.theme === 'light') {
            currentTheme = App.path.join('file://', app.getAppPath(), 'css', 'light.css');
            nativeTheme.themeSource = 'light';
        }
    }

    static saveRecent(file: string): void {
        readFile(App.path.join(app.getPath('appData'), app.getName(), 'recent.json'), function (err: Error, data: Buffer) {
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
            writeFile(App.path.join(app.getPath('appData'), app.getName(), 'recent.json'), JSON.stringify(jsonData), function (error) {
                if (error) {
                    dialog.showMessageBox({ type: 'error', message: error.message });
                    return;
                }
            });
        });
        app.addRecentDocument(file);
    }

    static getCellProperties(id: string, lang: string): void {
        App.contents.send('start-waiting');
        App.sendRequest({ command: 'getTuvData', id: id, lang: lang },
            function success(json: any) {
                App.contents.send('end-waiting');
                json.type = lang;
                App.contents.send('update-properties', json);
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static getRowProperties(id: string): void {
        App.contents.send('start-waiting');
        App.sendRequest({ command: 'getTuData', id: id },
            function success(json: any) {
                App.contents.send('end-waiting');
                json.type = 'TU';
                App.contents.send('update-properties', json);
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    editAttributes(arg: any): void {
        attributesWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('attributesWindow'),
            height: App.getHeight('attributesWindow'),
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
        attributesArg = arg;
        attributesWindow.setMenu(null);
        attributesWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'attributes.html'));
        attributesWindow.show();
    }

    saveAttributes(arg: any): void {
        App.contents.send('start-waiting');
        attributesWindow.close();
        arg.command = 'setAttributes';
        App.sendRequest(arg,
            function success(data: any) {
                App.contents.send('end-waiting');
                if (data.status === SUCCESS) {
                    if (arg.lang === '') {
                        App.getRowProperties(arg.id);
                    } else {
                        App.getCellProperties(arg.id, arg.lang);
                    }
                    App.saved = false;
                    App.mainWindow.setDocumentEdited(true);
                } else {
                    App.contents.send('end-waiting');
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    editProperties(arg: any): void {
        propertiesWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('propertiesWindow'),
            height: App.getHeight('propertiesWindow'),
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
        propertiesArg = arg;
        propertiesWindow.setMenu(null);
        propertiesWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'properties.html'));
        propertiesWindow.show();
    }

    showAddProperty(event: IpcMainEvent): void {
        propertyEvent = event;
        addPropertyWindow = new BrowserWindow({
            parent: propertiesWindow,
            width: App.getWidth('addPropertyWindow'),
            height: App.getHeight('addPropertyWindow'),
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
        addPropertyWindow.setMenu(null);
        addPropertyWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'addProperty.html'));
        addPropertyWindow.show();
    }

    addNewProperty(arg: any): void {
        addPropertyWindow.close();
        propertyEvent.sender.send('set-new-property', arg);
    }

    saveProperties(arg: any): void {
        App.contents.send('start-waiting');
        propertiesWindow.close();
        arg.command = 'setProperties';
        App.sendRequest(arg,
            function success(data: any) {
                App.contents.send('end-waiting');
                if (data.status === SUCCESS) {
                    if (arg.lang === '') {
                        App.getRowProperties(arg.id);
                    } else {
                        App.getCellProperties(arg.id, arg.lang);
                    }
                    App.saved = false;
                    App.mainWindow.setDocumentEdited(true);
                } else {
                    App.contents.send('end-waiting');
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    editNotes(arg: any): void {
        notesWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('notesWindow'),
            height: App.getHeight('notesWindow'),
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
        notesArg = arg;
        notesWindow.setMenu(null);
        notesWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'notes.html'));
        notesWindow.show();
    }

    showAddNote(event: IpcMainEvent): void {
        notesEvent = event;
        addNotesWindow = new BrowserWindow({
            parent: notesWindow,
            width: App.getWidth('addNotesWindow'),
            height: App.getHeight('addNotesWindow'),
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
        addNotesWindow.setMenu(null);
        addNotesWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'addNote.html'));
        addNotesWindow.show();
    }

    addNewNote(arg: any): void {
        addNotesWindow.close();
        notesEvent.sender.send('set-new-note', arg);
    }

    saveNotes(arg: any): void {
        App.contents.send('start-waiting');
        notesWindow.close();
        arg.command = 'setNotes';
        App.sendRequest(arg,
            function success(data: any) {
                App.contents.send('end-waiting');
                if (data.status === SUCCESS) {
                    if (arg.lang === '') {
                        App.getRowProperties(arg.id);
                    } else {
                        App.getCellProperties(arg.id, arg.lang);
                    }
                    App.saved = false;
                    App.mainWindow.setDocumentEdited(true);
                } else {
                    App.contents.send('end-waiting');
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static showSettings(): void {
        settingsWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('settingsWindow'),
            height: App.getHeight('settingsWindow'),
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
        settingsWindow.setMenu(null);
        settingsWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'preferences.html'));
        settingsWindow.show();
    }

    static setTheme(): void {
        App.contents.send('set-theme', currentTheme);
    }

    static createNewFile(): void {
        newFileWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('newFileWindow'),
            height: App.getHeight('newFileWindow'),
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
        newFileWindow.setMenu(null);
        newFileWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'newFile.html'));
        newFileWindow.show();
    }

    createFile(arg: any): void {
        newFileWindow.close();
        if (App.currentFile !== '' && !App.saved) {
            let response = dialog.showMessageBoxSync(App.mainWindow, { type: 'question', message: 'Save changes?', buttons: ['Yes', 'No'] });
            if (response === 0) {
                App.saveFile();
            }
        }
        arg.command = 'createFile';
        App.sendRequest(arg,
            function success(data: any) {
                if (data.status === SUCCESS) {
                    App.openFile(data.path);
                    needsName = true;
                } else {
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static saveFile(): void {
        if (App.currentFile === '') {
            return;
        }
        if (needsName) {
            App.saveAs();
            return;
        }
        App.sendRequest({ command: 'saveFile', file: App.currentFile },
            function success(data: any) {
                App.currentStatus = data;
                App.contents.send('set-status', 'Saving...');
                var intervalObject = setInterval(function () {
                    if (App.currentStatus.status === COMPLETED) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
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
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', App.currentStatus.reason);
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'saveFile'
                    } else {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error saving file');
                        return;
                    }
                    App.getSavingProgress();
                }, 500);
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static getSavingProgress(): void {
        App.sendRequest({ command: 'savingProgress' },
            function success(data: any) {
                App.currentStatus = data;
            },
            function error(reason: string) {
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
        }).then(function (value: any) {
            if (!value.canceled) {
                App.currentFile = value.filePath;
                needsName = false;
                App.saveFile();
                App.mainWindow.setTitle(App.currentFile);
                App.saveRecent(App.currentFile);
                App.saved = true;
                App.mainWindow.setDocumentEdited(false);
            }
        }).catch(function (error: Error) {
            dialog.showErrorBox('Error', error.message);
        });
    }

    static convertCSV(): void {
        convertCsvWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('convertCSV'),
            height: App.getHeight('convertCSV'),
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
        convertCsvWindow.setMenu(null);
        convertCsvWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'convertCSV.html'));
        convertCsvWindow.show();
    }

    convertCsvTmx(arg: any): void {
        convertCsvWindow.close();
        arg.command = 'convertCsv';
        App.sendRequest(arg,
            function success(data: any) {
                if (data.status === SUCCESS) {
                    if (arg.openTMX) {
                        if (App.currentFile !== '') {
                            App.closeFile();
                        }
                        App.openFile(arg.tmxFile);
                    } else {
                        dialog.showMessageBox({ type: 'info', message: 'File converted' });
                    }
                } else {
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    getCharsets(event: IpcMainEvent): void {
        App.sendRequest({ command: 'getCharsets' },
            function success(data: any) {
                if (data.status === SUCCESS) {
                    event.sender.send('set-charsets', data.charsets);
                } else {
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    getCsvPreview(event: IpcMainEvent, arg: any): void {
        arg.command = 'previewCsv';
        App.sendRequest(arg,
            function success(data: any) {
                if (data.status === SUCCESS) {
                    event.sender.send('set-preview', data);
                } else {
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
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
        }).then(function (value: any) {
            if (!value.canceled) {
                event.sender.send('set-csvfile', value.filePaths[0]);
            }
        }).catch(function (error: Error) {
            dialog.showErrorBox('Error', error.message);
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
        }).then(function (value: any) {
            if (!value.canceled) {
                event.sender.send('converted-tmx-file', value.filePath);
            }
        }).catch(function (error: Error) {
            dialog.showErrorBox('Error', error.message);
        });
    }

    getCsvLanguages(event: IpcMainEvent, arg: any): void {
        csvEvent = event;
        csvLangArgs = arg;
        csvLanguagesWindow = new BrowserWindow({
            parent: convertCsvWindow,
            modal: true,
            width: App.getWidth('csvLanguages'),
            height: App.getHeight('csvLanguages'),
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
        csvLanguagesWindow.setMenu(null);
        csvLanguagesWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'csvLanguages.html'));
        csvLanguagesWindow.show();
    }

    setCsvLanguages(arg: any): void {
        csvLanguagesWindow.close();
        csvEvent.sender.send('csv-languages', arg);
    }

    static exportDelimited(): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
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
        }).then(function (value: any) {
            if (!value.canceled) {
                App.contents.send('start-waiting');
                App.sendRequest({ command: 'exportDelimited', file: value.filePath },
                    function success(data: any) {
                        App.currentStatus = data;
                        App.contents.send('set-status', 'Exporting...');
                        var intervalObject = setInterval(function () {
                            if (App.currentStatus.status === COMPLETED) {
                                App.contents.send('end-waiting');
                                App.contents.send('set-status', '');
                                clearInterval(intervalObject);
                                dialog.showMessageBox(App.mainWindow, { type: 'info', message: 'File exported' });
                                return;
                            } else if (App.currentStatus.status === ERROR) {
                                App.contents.send('end-waiting');
                                App.contents.send('set-status', '');
                                clearInterval(intervalObject);
                                dialog.showErrorBox('Error', App.currentStatus.reason);
                                return;
                            } else if (App.currentStatus.status === SUCCESS) {
                                // keep waiting
                            } else {
                                App.contents.send('end-waiting');
                                App.contents.send('set-status', '');
                                clearInterval(intervalObject);
                                dialog.showErrorBox('Error', 'Unknown error exporting file');
                                return;
                            }
                            App.getExportProgress();
                        }, 500);
                    },
                    function error(reason: string) {
                        App.contents.send('end-waiting');
                        dialog.showErrorBox('Error', reason);
                    }
                );
            }
        }).catch(function (error: Error) {
            dialog.showErrorBox('Error', error.message);
        });
    }

    static getExportProgress(): void {
        App.sendRequest({ command: 'exportProgress' },
            function success(data: any) {
                App.currentStatus = data;
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static showFileInfo(): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        var fileInfoWindow: BrowserWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 550,
            height: 400,
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
        fileInfoWindow.setMenu(null);
        fileInfoWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'fileInfo.html'));
        fileInfoWindow.show();
    }

    fileProperties(event: IpcMainEvent): void {
        App.sendRequest({ command: 'getFileProperties' },
            function success(data: any) {
                if (data.status === SUCCESS) {
                    event.sender.send('set-file-properties', data);
                } else {
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
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
        }).then(function (value) {
            if (!value.canceled) {
                App.contents.send('start-waiting');
                App.sendRequest({ command: 'validateFile', file: value.filePaths[0] },
                    function success(data: any) {
                        App.currentStatus = data;
                        App.contents.send('set-status', 'Validating...');
                        var intervalObject = setInterval(function () {
                            if (App.currentStatus.status === COMPLETED) {
                                App.contents.send('end-waiting');
                                App.contents.send('set-status', '');
                                clearInterval(intervalObject);
                                dialog.showMessageBox(App.mainWindow, { type: 'info', message: 'File is valid' });
                                return;
                            } else if (App.currentStatus.status === ERROR) {
                                App.contents.send('end-waiting');
                                App.contents.send('set-status', '');
                                clearInterval(intervalObject);
                                dialog.showErrorBox('Error', App.currentStatus.reason);
                                return;
                            } else if (App.currentStatus.status === SUCCESS) {
                                // keep waiting
                            } else {
                                App.contents.send('end-waiting');
                                App.contents.send('set-status', '');
                                clearInterval(intervalObject);
                                dialog.showErrorBox('Error', 'Unknown error validating file');
                                return;
                            }
                            App.getValidatingProgress();
                        }, 500);
                    },
                    function error(reason: string) {
                        App.contents.send('end-waiting');
                        dialog.showMessageBox({ type: 'error', message: reason });
                    }
                );
            }
        }).catch(function (error: Error) {
            dialog.showErrorBox('Error', error.message);
        });
    }

    static getValidatingProgress(): void {
        App.sendRequest({ command: 'validatingProgress' },
            function success(data: any) {
                App.currentStatus = data;
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
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
        }).then(function (value) {
            if (!value.canceled) {
                App.contents.send('start-waiting');
                App.sendRequest({ command: 'cleanCharacters', file: value.filePaths[0] },
                    function success(data: any) {
                        App.currentStatus = data;
                        App.contents.send('set-status', 'Cleaning...');
                        var intervalObject = setInterval(function () {
                            if (App.currentStatus.status === COMPLETED) {
                                App.contents.send('end-waiting');
                                App.contents.send('set-status', '');
                                clearInterval(intervalObject);
                                dialog.showMessageBox(App.mainWindow, { type: 'info', message: 'File cleaned' });
                                return;
                            } else if (App.currentStatus.status === ERROR) {
                                App.contents.send('end-waiting');
                                App.contents.send('set-status', '');
                                clearInterval(intervalObject);
                                dialog.showErrorBox('Error', App.currentStatus.reason);
                                return;
                            } else if (App.currentStatus.status === SUCCESS) {
                                // keep waiting
                            } else {
                                App.contents.send('end-waiting');
                                App.contents.send('set-status', '');
                                clearInterval(intervalObject);
                                dialog.showErrorBox('Error', 'Unknown error cleaning characters');
                                return;
                            }
                            App.getCleaningProgress();
                        }, 500);
                    },
                    function error(reason: string) {
                        App.contents.send('end-waiting');
                        dialog.showMessageBox({ type: 'error', message: reason });
                    }
                );
            }
        }).catch(function (error: Error) {
            dialog.showErrorBox('Error', error.message);
        });
    }

    static getCleaningProgress(): void {
        App.sendRequest({ command: 'cleaningProgress' },
            function success(data: any) {
                App.currentStatus = data;
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static splitFile(): void {
        splitFileWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('splitFileWindow'),
            height: App.getHeight('splitFileWindow'),
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
        splitFileWindow.setMenu(null);
        splitFileWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'splitFile.html'));
        splitFileWindow.show();
    }

    splitTmx(arg: any): void {
        splitFileWindow.close();
        arg.command = 'splitFile';
        App.sendRequest(arg,
            function success(data: any) {
                App.currentStatus = data;
                App.contents.send('set-status', 'Splitting...');
                var intervalObject = setInterval(function () {
                    if (App.currentStatus.status === COMPLETED) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showMessageBox(App.mainWindow, { type: 'info', message: 'File split' });
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', App.currentStatus.reason);
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'replaceText'
                    } else {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error splitting file');
                        return;
                    }
                    App.getSplitProgress();
                }, 500);
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static getSplitProgress(): void {
        App.sendRequest({ command: 'getSplitProgress' },
            function success(data: any) {
                App.currentStatus = data;
            },
            function error(reason: string) {
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
        }).then(function (value: any) {
            if (!value.canceled) {
                event.sender.send('tmx-file', value.filePaths[0]);
            }
        }).catch(function (error: Error) {
            dialog.showErrorBox('Error', error.message);
        });
    }

    static mergeFiles(): void {
        mergeFilesWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('mergeFilesWindow'),
            height: App.getHeight('mergeFilesWindow'),
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
        mergeFilesWindow.setMenu(null);
        mergeFilesWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'mergeFiles.html'));
        mergeFilesWindow.show();
    }

    mergeTmxFiles(arg: any): void {
        mergeFilesWindow.close();
        App.contents.send('start-waiting');
        arg.command = 'mergeFiles';
        App.sendRequest(arg,
            function success(data: any) {
                App.currentStatus = data;
                App.contents.send('set-status', 'Merging...');
                var intervalObject = setInterval(function () {
                    if (App.currentStatus.status === COMPLETED) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showMessageBox(App.mainWindow, { type: 'info', message: 'Files merged' });
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', App.currentStatus.reason);
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'mergeFiles'
                    } else {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error merging files');
                        return;
                    }
                    App.getMergeProgress();
                }, 500);
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static getMergeProgress(): void {
        App.sendRequest({ command: 'getMergeProgress' },
            function success(data: any) {
                App.currentStatus = data;
            },
            function error(reason: string) {
                console.log(reason);
            }
        );
    }

    static saveEdits(): void {
        if (App.currentFile === '') {
            return;
        }
        App.contents.send('save-edit');
    }

    static cancelEdit(): void {
        if (App.currentFile === '') {
            return;
        }
        App.contents.send('cancel-edit');
    }

    addTmxFiles(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: 'TMX Files',
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'TMX File', extensions: ['tmx'] },
                { name: 'Any File', extensions: ['*'] }
            ]
        }).then(function (value: any) {
            if (!value.canceled) {
                event.sender.send('tmx-files', value.filePaths);
            }
        }).catch(function (error: Error) {
            dialog.showErrorBox('Error', error.message);
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
        }).then(function (value: any) {
            if (!value.canceled) {
                event.sender.send('merged-tmx-file', value.filePath);
            }
        }).catch(function (error: Error) {
            dialog.showErrorBox('Error', error.message);
        });
    }

    saveData(event: IpcMainEvent, arg: any): void {
        arg.command = 'saveTuvData';
        App.sendRequest(arg,
            function (data: any) {
                if (data.status === SUCCESS) {
                    App.mainWindow.setDocumentEdited(true);
                    App.saved = false;
                    event.sender.send('data-saved', data);
                    return;
                }
                dialog.showMessageBox({ type: 'error', message: data.reason });
            },
            function (reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static replaceText(): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        replaceTextWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('replaceTextWindow'),
            height: App.getHeight('replaceTextWindow'),
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
        replaceTextWindow.setMenu(null);
        replaceTextWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'searchReplace.html'));
        replaceTextWindow.show();
    }

    replaceRequest(arg: any): void {
        replaceTextWindow.close();
        App.contents.send('start-waiting');
        arg.command = 'replaceText';
        App.sendRequest(arg,
            function success(data: any) {
                App.currentStatus = data;
                App.contents.send('set-status', 'Replacing...');
                var intervalObject = setInterval(function () {
                    if (App.currentStatus.status === COMPLETED) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.loadSegments();
                        App.getCount();
                        App.saved = false;
                        App.mainWindow.setDocumentEdited(true);
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', App.currentStatus.reason);
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'replaceText'
                    } else {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error replacing text');
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static getProcessingProgress(): void {
        App.sendRequest({ command: 'processingProgress' },
            function success(data: any) {
                App.currentStatus = data;
            },
            function error(reason: string) {
                console.log(reason);
            }
        );
    }

    static sortUnits() {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        sortUnitsWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('sortUnitsWindow'),
            height: App.getHeight('sortUnitsWindow'),
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
        sortUnitsWindow.setMenu(null);
        sortUnitsWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'sortUnits.html'));
        sortUnitsWindow.show();
    }

    setSort(arg: any): void {
        sortOptions = arg;
        sortUnitsWindow.close();
        App.loadSegments();
        App.contents.send('sort-on');
    }

    clearSort(): void {
        sortOptions = {};
        sortUnitsWindow.close();
        App.loadSegments();
        App.contents.send('sort-off');
    }

    static showFilters(): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        filtersWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('filtersWindow'),
            height: App.getHeight('filtersWindow'),
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
        filtersWindow.setMenu(null);
        filtersWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'filters.html'));
        filtersWindow.show();
    }

    setFilterOptions(arg: any): void {
        filterOptions = arg;
        filtersWindow.close();
        this.setFirstPage();
        App.loadSegments();
        App.contents.send('filters-on');
    }

    setFirstPage(): void {
        loadOptions.start = 0;
        App.contents.send('set-first-page');
    }

    clearFilterOptions(): void {
        filterOptions = {};
        filtersWindow.close();
        this.setFirstPage();
        App.loadSegments();
        App.contents.send('filters-off');
    }

    static insertUnit(): void {
        App.sendRequest({ command: 'insertUnit' },
            function success(data: any) {
                if (data.status === SUCCESS) {
                    App.contents.send('unit-inserted', data.id);
                } else {
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static requestDeleteUnits(): void {
        App.contents.send('request-delete');
    }

    deleteUnits(arg: any): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        var selected: string[] = arg;
        if (selected.length === 0) {
            dialog.showMessageBox({ type: 'warning', message: 'Select units' });
            return;
        }
        App.sendRequest({ command: 'deleteUnits', selected },
            function success(data: any) {
                if (data.status === SUCCESS) {
                    App.getFileLanguages();
                    App.getCount();
                    App.loadSegments();
                    App.saved = false;
                    App.mainWindow.setDocumentEdited(true);
                } else {
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static firstPage(): void {
        App.contents.send('first-page');
    }

    static previousPage(): void {
        App.contents.send('previous-page');
    }

    static nextPage(): void {
        App.contents.send('next-page');
    }

    static lastPage(): void {
        App.contents.send('last-page');
    }

    static changeLanguageCode(): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        changeLanguageWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('changeLanguageWindow'),
            height: App.getHeight('changeLanguageWindow'),
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
        changeLanguageWindow.setMenu(null);
        changeLanguageWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'changeLanguage.html'));
        changeLanguageWindow.show();
    }

    changeLanguage(arg: any): void {
        changeLanguageWindow.close();
        arg.command = 'changeLanguage';
        App.sendRequest(arg,
            function success(data: any) {
                App.currentStatus = data;
                App.contents.send('set-status', 'Changing...');
                var intervalObject = setInterval(function () {
                    if (App.currentStatus.status === COMPLETED) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.getFileLanguages();
                        App.loadSegments();
                        App.saved = false;
                        App.mainWindow.setDocumentEdited(true);
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', App.currentStatus.reason);
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'replaceText'
                    } else {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error changing language code');
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    allLanguages(event: IpcMainEvent): void {
        App.sendRequest({ command: 'getAllLanguages' },
            function success(data: any) {
                if (data.status === SUCCESS) {
                    event.sender.send('languages-list', data.languages);
                } else {
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static showRemoveLanguage(): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        removeLanguageWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('removeLanguageWindow'),
            height: App.getHeight('removeLanguageWindow'),
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
        removeLanguageWindow.setMenu(null);
        removeLanguageWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'removeLanguage.html'));
        removeLanguageWindow.show();
    }

    removeLanguage(arg: any): void {
        removeLanguageWindow.close();
        App.sendRequest({ command: 'removeLanguage', lang: arg },
            function success(data: any) {
                if (data.status === SUCCESS) {
                    App.getFileLanguages();
                    App.loadSegments();
                    App.saved = false;
                    App.mainWindow.setDocumentEdited(true);
                } else {
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static showAddLanguage(): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        addLanguageWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('addLanguageWindow'),
            height: App.getHeight('addLanguageWindow'),
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
        addLanguageWindow.setMenu(null);
        addLanguageWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'addLanguage.html'));
        addLanguageWindow.show();
    }

    addLanguage(arg: any): void {
        addLanguageWindow.close();
        App.sendRequest({ command: 'addLanguage', lang: arg },
            function success(data: any) {
                if (data.status === SUCCESS) {
                    App.getFileLanguages();
                    App.loadSegments();
                    App.saved = false;
                    App.mainWindow.setDocumentEdited(true);
                } else {
                    dialog.showMessageBox({ type: 'error', message: data.reason });
                }
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static showChangeSourceLanguage(): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        srcLanguageWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('srcLanguageWindow'),
            height: App.getHeight('srcLanguageWindow'),
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
        srcLanguageWindow.setMenu(null);
        srcLanguageWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'srcLanguage.html'));
        srcLanguageWindow.show();
    }

    getSourceLanguage(event: IpcMainEvent): void {
        App.sendRequest({ command: 'getSrcLanguage' },
            function success(data: any) {
                if (data.status === SUCCESS) {
                    event.sender.send('set-source-language', data);
                } else {
                    dialog.showMessageBox({ type: 'warning', message: data.reason });
                }
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static removeTags(): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.contents.send('start-waiting');
        App.sendRequest({ command: 'removeTags' },
            function success(data: any) {
                App.currentStatus = data;
                App.contents.send('set-status', 'Removing tags...');
                var intervalObject = setInterval(function () {
                    if (App.currentStatus.status === COMPLETED) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.loadSegments();
                        App.saved = false;
                        App.mainWindow.setDocumentEdited(true);
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', App.currentStatus.reason);
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'removeDuplicates'
                    } else {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error removing tags');
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    changeSourceLanguage(arg: any): void {
        srcLanguageWindow.close();
        App.sendRequest({ command: 'setSrcLanguage', lang: arg },
            function success(data: any) {
                App.saved = false;
                App.mainWindow.setDocumentEdited(true);
                if (data.status !== SUCCESS) {
                    dialog.showMessageBox({ type: 'warning', message: data.reason });
                }
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static removeDuplicates(): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.contents.send('start-waiting');
        App.sendRequest({ command: 'removeDuplicates' },
            function success(data: any) {
                App.currentStatus = data;
                App.contents.send('set-status', 'Removing duplicates...');
                var intervalObject = setInterval(function () {
                    if (App.currentStatus.status === COMPLETED) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.loadSegments();
                        App.getCount();
                        App.saved = false;
                        App.mainWindow.setDocumentEdited(true);
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', App.currentStatus.reason);
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'removeDuplicates'
                    } else {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error removing duplicates');
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static getCount(): void {
        App.sendRequest({ command: 'getCount' },
            function success(data: any) {
                App.contents.send('status-changed', data);
            },
            function error(reason: string) {
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static showRemoveUntranslated(): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        removeUntranslatedWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('removeUntranslatedWindow'),
            height: App.getHeight('removeUntranslatedWindow'),
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
        removeUntranslatedWindow.setMenu(null);
        removeUntranslatedWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'removeUntranslated.html'));
        removeUntranslatedWindow.show();
    }

    removeUntranslated(arg: any): void {
        removeUntranslatedWindow.close();
        App.contents.send('start-waiting');
        arg.command = 'removeUntranslated';
        App.sendRequest(arg,
            function success(data: any) {
                App.currentStatus = data;
                App.contents.send('set-status', 'Removing units...');
                var intervalObject = setInterval(function () {
                    if (App.currentStatus.status === COMPLETED) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.loadSegments();
                        App.getCount();
                        App.saved = false;
                        App.mainWindow.setDocumentEdited(true);
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', App.currentStatus.reason);
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'removeUntranslated'
                    } else {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error removing untranslated units');
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static removeSpaces(): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        App.contents.send('start-waiting');
        App.sendRequest({ command: 'removeSpaces' },
            function success(data: any) {
                App.currentStatus = data;
                App.contents.send('set-status', 'Removing spaces...');
                var intervalObject = setInterval(function () {
                    if (App.currentStatus.status === COMPLETED) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.loadSegments();
                        App.saved = false;
                        App.mainWindow.setDocumentEdited(true);
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', App.currentStatus.reason);
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'removeSpaces'
                    } else {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error removing spaces');
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
            }
        );
    }

    static showConsolidateUnits(): void {
        if (App.currentFile === '') {
            dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
            return;
        }
        if (App.fileLanguages.length < 3) {
            dialog.showMessageBox({ type: 'warning', message: 'File must have at least 3 languages' });
            return;
        }
        consolidateWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: App.getWidth('consolidateWindow'),
            height: App.getHeight('consolidateWindow'),
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
        consolidateWindow.setMenu(null);
        consolidateWindow.loadURL(App.path.join('file://', app.getAppPath(), 'html', 'consolidateUnits.html'));
        consolidateWindow.show();
    }

    consolidateUnits(arg: any): void {
        consolidateWindow.close();
        App.contents.send('start-waiting');
        arg.command = 'consolidateUnits';
        App.sendRequest(arg,
            function success(data: any) {
                App.currentStatus = data;
                App.contents.send('set-status', 'Consolidating...');
                var intervalObject = setInterval(function () {
                    if (App.currentStatus.status === COMPLETED) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        App.loadSegments();
                        App.getCount();
                        return;
                    } else if (App.currentStatus.status === PROCESSING) {
                        // it's OK, keep waiting
                    } else if (App.currentStatus.status === ERROR) {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', App.currentStatus.reason);
                        return;
                    } else if (App.currentStatus.status === SUCCESS) {
                        // ignore status from 'consolidateUnits'
                    } else {
                        App.contents.send('end-waiting');
                        App.contents.send('set-status', '');
                        clearInterval(intervalObject);
                        dialog.showErrorBox('Error', 'Unknown error consolidating units');
                        return;
                    }
                    App.getProcessingProgress();
                }, 500);
            },
            function error(reason: string) {
                App.contents.send('end-waiting');
                dialog.showMessageBox({ type: 'error', message: reason });
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
                            dialog.showMessageBox(App.mainWindow, {
                                type: 'info',
                                title: 'Updates Available',
                                message: 'Version ' + parsedData.version + ' is available'
                            });
                        } else {
                            if (!silent) {
                                dialog.showMessageBox(App.mainWindow, {
                                    type: 'info',
                                    message: 'There are currently no updates available'
                                });
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

    static getWidth(window: string): number {
        switch (process.platform) {
            case 'win32': {
                switch (window) {
                    case 'aboutWindow': { return 620; }
                    case 'replaceTextWindow': { return 450; }
                    case 'filtersWindow': { return 520; }
                    case 'consolidateWindow': { return 470; }
                    case 'removeUntranslatedWindow': { return 470; }
                    case 'settingsWindow': { return 400; }
                    case 'sortUnitsWindow': { return 450; }
                    case 'changeLanguageWindow': { return 490; }
                    case 'newFileWindow': { return 480; }
                    case 'addLanguageWindow': { return 420; }
                    case 'removeLanguageWindow': { return 420; }
                    case 'srcLanguageWindow': { return 420; }
                    case 'splitFileWindow': { return 504 }
                    case 'mergeFilesWindow': { return 560 }
                    case 'licensesWindow': { return 500; }
                    case 'convertCSV': { return 600; }
                    case 'csvLanguages': { return 600; }
                    case 'attributesWindow': { return 630; }
                    case 'propertiesWindow': { return 500; }
                    case 'addPropertyWindow': { return 350; }
                    case 'notesWindow': { return 500; }
                    case 'addNotesWindow': { return 350; }
                    case 'registerSubscriptionWindow': { return 650; }
                    case 'registerExpiredWindow': { return 550; }
                    case 'requestEvaluationWindow': { return 450; }
                }
                break;
            }
            case 'darwin': {
                switch (window) {
                    case 'aboutWindow': { return 620; }
                    case 'replaceTextWindow': { return 450; }
                    case 'filtersWindow': { return 500; }
                    case 'consolidateWindow': { return 470; }
                    case 'removeUntranslatedWindow': { return 470; }
                    case 'settingsWindow': { return 400; }
                    case 'sortUnitsWindow': { return 450; }
                    case 'changeLanguageWindow': { return 490; }
                    case 'newFileWindow': { return 480; }
                    case 'addLanguageWindow': { return 420; }
                    case 'removeLanguageWindow': { return 420; }
                    case 'srcLanguageWindow': { return 420; }
                    case 'splitFileWindow': { return 500 }
                    case 'mergeFilesWindow': { return 560 }
                    case 'licensesWindow': { return 500; }
                    case 'convertCSV': { return 600; }
                    case 'csvLanguages': { return 600; }
                    case 'attributesWindow': { return 630; }
                    case 'propertiesWindow': { return 500; }
                    case 'addPropertyWindow': { return 350; }
                    case 'notesWindow': { return 500; }
                    case 'addNotesWindow': { return 350; }
                    case 'registerSubscriptionWindow': { return 650; }
                    case 'registerExpiredWindow': { return 550; }
                    case 'requestEvaluationWindow': { return 450; }
                }
                break;
            }
            case 'linux': {
                switch (window) {
                    case 'aboutWindow': { return 620; }
                    case 'replaceTextWindow': { return 450; }
                    case 'filtersWindow': { return 520; }
                    case 'consolidateWindow': { return 470; }
                    case 'removeUntranslatedWindow': { return 470; }
                    case 'settingsWindow': { return 400; }
                    case 'sortUnitsWindow': { return 450; }
                    case 'changeLanguageWindow': { return 490; }
                    case 'newFileWindow': { return 480; }
                    case 'addLanguageWindow': { return 420; }
                    case 'removeLanguageWindow': { return 420; }
                    case 'srcLanguageWindow': { return 420; }
                    case 'splitFileWindow': { return 500 }
                    case 'mergeFilesWindow': { return 560 }
                    case 'licensesWindow': { return 500; }
                    case 'convertCSV': { return 600; }
                    case 'csvLanguages': { return 600; }
                    case 'attributesWindow': { return 630; }
                    case 'propertiesWindow': { return 500; }
                    case 'addPropertyWindow': { return 350; }
                    case 'notesWindow': { return 500; }
                    case 'addNotesWindow': { return 350; }
                    case 'registerSubscriptionWindow': { return 650; }
                    case 'registerExpiredWindow': { return 550; }
                    case 'requestEvaluationWindow': { return 450; }
                }
                break;
            }
        }
    }

    static getHeight(window: string): number {
        switch (process.platform) {
            case 'win32': {
                switch (window) {
                    case 'aboutWindow': { return 380; }
                    case 'replaceTextWindow': { return 210; }
                    case 'filtersWindow': { return 310; }
                    case 'consolidateWindow': { return 120; }
                    case 'removeUntranslatedWindow': { return 120; }
                    case 'settingsWindow': { return 190; }
                    case 'sortUnitsWindow': { return 150; }
                    case 'changeLanguageWindow': { return 160; }
                    case 'newFileWindow': { return 160; }
                    case 'addLanguageWindow': { return 120; }
                    case 'removeLanguageWindow': { return 120; }
                    case 'srcLanguageWindow': { return 120; }
                    case 'splitFileWindow': { return 150; }
                    case 'mergeFilesWindow': { return 430; }
                    case 'licensesWindow': { return 360; }
                    case 'convertCSV': { return 520; }
                    case 'csvLanguages': { return 280; }
                    case 'attributesWindow': { return 380; }
                    case 'propertiesWindow': { return 300; }
                    case 'addPropertyWindow': { return 170; }
                    case 'notesWindow': { return 300; }
                    case 'addNotesWindow': { return 140; }
                    case 'registerSubscriptionWindow': { return 270; }
                    case 'registerExpiredWindow': { return 250; }
                    case 'requestEvaluationWindow': { return 260; }
                }
                break;
            }
            case 'darwin': {
                switch (window) {
                    case 'aboutWindow': { return 360; }
                    case 'replaceTextWindow': { return 190; }
                    case 'filtersWindow': { return 290; }
                    case 'consolidateWindow': { return 110; }
                    case 'removeUntranslatedWindow': { return 110; }
                    case 'settingsWindow': { return 180; }
                    case 'sortUnitsWindow': { return 140; }
                    case 'changeLanguageWindow': { return 150; }
                    case 'newFileWindow': { return 150; }
                    case 'addLanguageWindow': { return 110; }
                    case 'removeLanguageWindow': { return 110; }
                    case 'srcLanguageWindow': { return 110; }
                    case 'splitFileWindow': { return 150; }
                    case 'mergeFilesWindow': { return 420; }
                    case 'licensesWindow': { return 350; }
                    case 'convertCSV': { return 530; }
                    case 'csvLanguages': { return 270; }
                    case 'attributesWindow': { return 370; }
                    case 'propertiesWindow': { return 290; }
                    case 'addPropertyWindow': { return 160; }
                    case 'notesWindow': { return 290; }
                    case 'addNotesWindow': { return 120; }
                    case 'registerSubscriptionWindow': { return 250; }
                    case 'registerExpiredWindow': { return 240; }
                    case 'requestEvaluationWindow': { return 240; }
                }
                break;
            }
            case 'linux': {
                switch (window) {
                    case 'aboutWindow': { return 350; }
                    case 'replaceTextWindow': { return 210; }
                    case 'filtersWindow': { return 295; }
                    case 'consolidateWindow': { return 110; }
                    case 'removeUntranslatedWindow': { return 110; }
                    case 'settingsWindow': { return 180; }
                    case 'sortUnitsWindow': { return 140; }
                    case 'changeLanguageWindow': { return 140; }
                    case 'newFileWindow': { return 140; }
                    case 'addLanguageWindow': { return 110; }
                    case 'removeLanguageWindow': { return 110; }
                    case 'srcLanguageWindow': { return 110; }
                    case 'splitFileWindow': { return 160; }
                    case 'mergeFilesWindow': { return 420; }
                    case 'licensesWindow': { return 350; }
                    case 'convertCSV': { return 530; }
                    case 'csvLanguages': { return 270; }
                    case 'attributesWindow': { return 380; }
                    case 'propertiesWindow': { return 300; }
                    case 'addPropertyWindow': { return 160; }
                    case 'notesWindow': { return 300; }
                    case 'addNotesWindow': { return 130; }
                    case 'registerSubscriptionWindow': { return 250; }
                    case 'registerExpiredWindow': { return 240; }
                    case 'requestEvaluationWindow': { return 240; }
                }
                break;
            }
        }
    }

}

new App(process.argv);