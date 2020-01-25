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
import { execFileSync, spawn } from "child_process";
import { app, BrowserWindow, dialog, ipcMain, Menu, MenuItem, shell, webContents } from "electron";
import { existsSync, readFile, readFileSync, writeFile, writeFileSync } from "fs";
import { ClientRequest, request } from "http";

var mainWindow: BrowserWindow;
var contents: webContents;
var javapath: string = app.getAppPath() + '/bin/java';
var appHome: string = app.getPath('appData') + '/tmxeditor/';
var stopping: boolean = false;
var fileLanguages: any;
var currentDefaults: any;
var currentStatus: any = {};

var currentFile: string = '';

const SUCCESS: string = 'Success';
const LOADING: string = 'Loading';
const COMPLETED: string = 'Completed';
const ERROR: string = 'Error';

if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    if (mainWindow) {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow.isMinimized()) {
            mainWindow.restore();
        }
        mainWindow.focus();
    }
}

if (process.platform == 'win32') {
    javapath = app.getAppPath() + '\\bin\\java.exe';
    appHome = app.getPath('appData') + '\\tmxeditor\\';
}

spawn(javapath, ['--module-path', 'lib', '-m', 'tmxserver/com.maxprograms.tmxserver.TMXServer', '-port', '8050'], { cwd: app.getAppPath() });
var ck: Buffer = execFileSync('bin/java', ['--module-path', 'lib', '-m', 'openxliff/com.maxprograms.server.CheckURL', 'http://localhost:8050/TMXserver'], { cwd: __dirname });
console.log(ck.toString());

app.on('open-file', function (event, filePath) {
    event.preventDefault();
    openFile(filePath);
});

app.on('ready', function () {
    createWindow();
    mainWindow.loadURL('file://' + app.getAppPath() + '/index.html');
    mainWindow.on('resize', function () {
        saveDefaults();
    });
    mainWindow.on('move', function () {
        saveDefaults();
    });
    mainWindow.show();
    // mainWindow.webContents.openDevTools();
});

app.on('quit', function () {
    stopServer();
});

app.on('window-all-closed', function () {
    stopServer();
    app.quit();
});

if (process.platform === 'darwin') {
    app.on('open-file', function (event, path) {
        event.preventDefault();
        openFile(path);
    });
}

function createWindow() {
    currentDefaults = { width: 900, height: 700, x: 0, y: 0 };
    if (existsSync(appHome + 'defaults.json')) {
        try {
            var data: Buffer = readFileSync(appHome + 'defaults.json');
            currentDefaults = JSON.parse(data.toString());
        } catch (err) {
            console.log(err);
        }
    }
    mainWindow = new BrowserWindow({
        title: 'TMXEditor',
        width: currentDefaults.width,
        height: currentDefaults.height,
        x: currentDefaults.x,
        y: currentDefaults.y,
        webPreferences: {
            nodeIntegration: true
        },
        show: false,
        icon: 'icons/tmxeditor.png'
    });
    contents = mainWindow.webContents;
    var fileMenu: Menu = Menu.buildFromTemplate([
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: function () { createNewFile(); } },
        { label: 'Open', accelerator: 'CmdOrCtrl+O', click: function () { openFileDialog(); } },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', click: function () { closeFile(); } },
        { label: 'Save', accelerator: 'CmdOrCtrl+s', click: function () { saveFile(); } },
        { label: 'Save As', click: function () { saveAs() } },
        new MenuItem({ type: 'separator' }),
        { label: 'Convert CSV/TAB Delimited to TMX', click: function () { convertCSV(); } },
        { label: 'Export as TAB Delimited...', click: function () { exportDelimited(); } },
        new MenuItem({ type: 'separator' }),
        { label: 'File Properties', click: function () { showFileInfo(); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Validate TMX File...', click: function () { validateFile(); } },
        { label: 'Clean Invalid Characters...', click: function () { cleanCharacters(); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Split TMX File...', click: function () { splitFile(); } },
        { label: 'Merge TMX Files...', click: function () { mergeFiles(); } }
    ]);
    var editMenu: Menu = Menu.buildFromTemplate([
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: function () { contents.undo(); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: function () { contents.cut(); } },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: function () { contents.copy(); } },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: function () { contents.paste(); } },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: function () { contents.selectAll(); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Confirm Edit', accelerator: 'Alt+Enter', click: function () { saveEdits(); } },
        { label: 'Cancel Edit', accelerator: 'Esc', click: function () { cancelEdit(); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Replace Text...', accelerator: 'CmdOrCtrl+F', click: function () { replaceText(); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Insert Unit', click: function () { insertUnit(); } },
        { label: 'Delete Selected Units', click: function () { deleteUnits(); } }
    ]);
    var viewMenu: Menu = Menu.buildFromTemplate([
        { label: 'Sort Units', accelerator: 'F5', click: function () { sortUnits(); } },
        { label: 'Filter Units', accelerator: 'F3', click: function () { showFilters() } },
        new MenuItem({ type: 'separator' }),
        { label: 'Show First Page', click: function () { firstPage(); } },
        { label: 'Show Previous Page', click: function () { previousPage(); } },
        { label: 'Show Next Page', click: function () { nextPage(); } },
        { label: 'Show Last Page', click: function () { lastPage(); } },
        new MenuItem({ type: 'separator' }),
        new MenuItem({ label: 'Toggle Full Screen', role: 'togglefullscreen' }),
        new MenuItem({ label: 'Toggle Development Tools', accelerator: 'F12', role: 'toggleDevTools' }),
    ]);
    var tasksMenu: Menu = Menu.buildFromTemplate([
        { label: 'Change Language Code...', click: function () { changeLanguageCode(); } },
        { label: 'Add Language...', click: function () { addLanguage(); } },
        { label: 'Remove Language...', click: function () { removeLanguage() } },
        { label: 'Change Source Language...', click: function () { changeSourceLanguage(); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Remove All Tags', click: function () { removeTags(); } },
        { label: 'Remove Duplicates', click: function () { removeDuplicates(); } },
        { label: 'Remove Untranslated...', click: function () { removeUntranslated(); } },
        { label: 'Remove Initial/Trailing Spaces', click: function () { removeSpaces(); } },
        { label: 'Consolidate Units...', click: function () { consolidateUnits(); } }
    ]);
    var helpMenu: Menu = Menu.buildFromTemplate([
        { label: 'TMXEditor User Guide', accelerator: 'F1', click: function () { showHelp(); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Check for Updates', click: function () { checkUpdates(); } },
        { label: 'View Release History', click: function () { showReleaseHistory(); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Send Feedback...', click: function () { sendFeedback(); } }
    ]);
    var template: MenuItem[] = [
        new MenuItem({ label: 'File', role: 'fileMenu', submenu: fileMenu }),
        new MenuItem({ label: 'Edit', role: 'editMenu', submenu: editMenu }),
        new MenuItem({ label: 'View', role: 'viewMenu', submenu: viewMenu }),
        new MenuItem({ label: 'Tasks', submenu: tasksMenu }),
        new MenuItem({ label: 'Help', role: 'help', submenu: helpMenu })
    ];
    if (process.platform === 'darwin') {
        var appleMenu: Menu = Menu.buildFromTemplate([
            new MenuItem({ label: 'About...', click: function () { showAbout(); } }),
            new MenuItem({
                label: 'Preferences...', submenu: [
                    { label: 'Settings', accelerator: 'Cmd+,', click: function () { showSettings(); } }
                ]
            }),
            new MenuItem({ type: 'separator' }),
            new MenuItem({
                label: 'Services', role: 'services', submenu: [
                    { label: 'No Services Apply', enabled: false }
                ]
            }),
            new MenuItem({ type: 'separator' }),
            new MenuItem({ label: 'Quit TMXEditor', accelerator: 'Cmd+Q', role: 'quit', click: function () { app.quit(); } })
        ]);
        template.unshift(new MenuItem({ label: 'TMXEditor', role: 'appMenu', submenu: appleMenu }));
    } else {
        var help: MenuItem = template.pop();
        template.push(new MenuItem({
            label: 'Settings', submenu: [
                { label: 'Preferences', click: function () { showSettings(); } }
            ]
        }));
        template.push(help);
    }
    if (!existsSync(appHome + 'recent.json')) {
        writeFile(appHome + 'recent.json', '{"files" : []}', function (err) {
            if (err) {
                dialog.showMessageBox({ type: 'error', message: err.message });
                return;
            }
        });
    }
    readFile(appHome + 'recent.json', function (err: Error, data: Buffer) {
        if (err instanceof Error) {
            Menu.setApplicationMenu(Menu.buildFromTemplate(template));
            return;
        }
        var jsonData = JSON.parse(data.toString());
        var files = jsonData.files;
        if (files != undefined && files.length > 0) {
            if (process.platform === 'darwin') {
                template[1].submenu.append(new MenuItem({ type: 'separator' }));
            } else {
                template[0].submenu.append(new MenuItem({ type: 'separator' }));
            }
            for (let i: number = 0; i < files.length; i++) {
                var file = files[i];
                if (existsSync(file)) {
                    if (process.platform === 'darwin') {
                        template[1].submenu.append(new MenuItem({ label: file, click: function () { openFile(files[i]); } }));
                    } else {
                        template[0].submenu.append(new MenuItem({ label: file, click: function () { openFile(files[i]); } }));
                    }
                }
            }
        }
        if (process.platform == 'win32') {
            template[0].submenu.append(new MenuItem({ type: 'separator' }));
            template[0].submenu.append(new MenuItem({ label: 'Exit', accelerator: 'Alt+F4', role: 'quit', click: function () { app.quit(); } }));
            template[5].submenu.append(new MenuItem({ type: 'separator' }));
            template[5].submenu.append(new MenuItem({ label: 'About...', click: function () { showAbout(); } }));
        }
        if (process.platform === 'linux') {
            template[0].submenu.append(new MenuItem({ type: 'separator' }));
            template[0].submenu.append(new MenuItem({ label: 'Quit', accelerator: 'Ctrl+Q', role: 'quit', click: function () { app.quit(); } }));
            template[5].submenu.append(new MenuItem({ type: 'separator' }));
            template[5].submenu.append(new MenuItem({ label: 'About...', click: function () { showAbout(); } }));
        }
        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    });
}

function sendRequest(json: any, success: any, error: any) {
    var postData: string = JSON.stringify(json);
    var options = {
        hostname: '127.0.0.1',
        port: 8050,
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
            if (res.statusCode != 200) {
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

function stopServer() {
    if (!stopping) {
        stopping = true;
        sendRequest({ command: 'stop' },
            function success(data: any) {
                console.log('server stopped');
            },
            function error(reason: string) {
                dialog.showErrorBox('Error', reason)
            }
        );
    }
}

function showAbout() {
    var aboutWindow = new BrowserWindow({
        parent: mainWindow,
        width: 620,
        height: 330,
        useContentSize: true,
        minimizable: false,
        maximizable: false,
        resizable: false,
        show: false,
        icon: './icons/tmxeditor.png',
        webPreferences: {
            nodeIntegration: true
        }
    });
    aboutWindow.setMenu(null);
    aboutWindow.loadURL('file://' + app.getAppPath() + '/html/about.html');
    aboutWindow.show();
}

ipcMain.on('licenses-clicked', function () {
    var licensesWindow = new BrowserWindow({
        parent: mainWindow,
        width: 500,
        height: 320,
        useContentSize: true,
        minimizable: false,
        maximizable: false,
        resizable: false,
        show: false,
        icon: './icons/tmxeditor.png',
        webPreferences: {
            nodeIntegration: true
        }
    });
    licensesWindow.setMenu(null);
    licensesWindow.loadURL('file://' + app.getAppPath() + '/html/licenses.html');
    licensesWindow.show();
});

ipcMain.on('open-license', function (event, arg: any) {
    var licenseFile = '';
    var title = '';
    switch (arg.type) {
        case 'TMXEditor':
            licenseFile = 'file://' + app.getAppPath() + '/html/licenses/license.txt'
            title = 'TMXEditor License';
            break;
        case "electron":
            licenseFile = 'file://' + app.getAppPath() + '/html/licenses/electron.txt'
            title = 'MIT License';
            break;
        case "TypeScript":
            licenseFile = 'file://' + app.getAppPath() + '/html/licenses/Apache2.0.html'
            title = 'Apache 2.0';
            break;
        case "Java":
            licenseFile = 'file://' + app.getAppPath() + '/html/licenses/java.html'
            'GPL2 with Classpath Exception';
            break;
        case "OpenXLIFF":
            licenseFile = 'file://' + app.getAppPath() + '/html/licenses/EclipsePublicLicense1.0.html'
            title = 'Eclipse Public License 1.0';
            break;
        case "JSON":
            licenseFile = 'file://' + app.getAppPath() + '/html/licenses/json.txt'
            title = 'JSON.org License';
            break;
        case "TMXValidator":
            licenseFile = 'file://' + app.getAppPath() + '/html/licenses/EclipsePublicLicense1.0.html'
            title = 'Eclipse Public License 1.0';
            break;
        case "MapDB":
            licenseFile = 'file://' + app.getAppPath() + '/html/licenses/Apache2.0.html'
            title = 'Apache 2.0';
            break;
        case "jsoup":
            licenseFile = 'file://' + app.getAppPath() + '/html/licenses/jsoup.txt'
            title = 'MIT License';
            break;
        case "DTDParser":
            licenseFile = 'file://' + app.getAppPath() + '/html/licenses/LGPL2.1.txt'
            title = 'LGPL 2.1';
            break;
        default:
            dialog.showErrorBox('Error', 'Unknow license');
            return;
    }
    var licenseWindow = new BrowserWindow({
        parent: mainWindow,
        width: 680,
        height: 400,
        show: false,
        title: title,
        icon: './icons/tmxeditor.png',
        webPreferences: {
            nodeIntegration: true
        }
    });
    licenseWindow.setMenu(null);
    licenseWindow.loadURL(licenseFile);
    licenseWindow.show();
});

function showHelp() {
    var help = app.getAppPath() + '/tmxeditor.pdf';
    if (process.platform == 'win32') {
        help = app.getAppPath() + '\\tmxeditor.pdf';
    }
    shell.openItem(help);
}

ipcMain.on('show-help', () => {
    showHelp();
})


ipcMain.on('open-file', function () {
    openFileDialog();
});

function openFileDialog() {
    dialog.showOpenDialog({
        title: 'Open TMX File',
        properties: ['openFile'],
        filters: [
            { name: 'TMX File', extensions: ['tmx'] },
            { name: 'Any File', extensions: ['*'] }
        ]
    }).then(function (value) {
        if (!value.canceled) {
            openFile(value.filePaths[0]);
            saveRecent(value.filePaths[0]);
        }
    })["catch"](function (error) {
        dialog.showErrorBox('Error', error);
        console.log(error);
    });
}

function openFile(file: string) {
    mainWindow.webContents.send('start-waiting');
    mainWindow.webContents.send('set-status', 'Opening file');
    sendRequest({ command: 'openFile', file: file },
        function success(json: any) {
            currentStatus = json;
            var intervalObject = setInterval(function () {
                if (currentStatus.status === COMPLETED) {
                    mainWindow.webContents.send('end-waiting');
                    clearInterval(intervalObject);
                    getFileLanguages();
                    mainWindow.webContents.send('file-loaded', currentStatus);
                    currentFile = file;
                    mainWindow.setTitle(currentFile);
                    return;
                } else if (currentStatus.status === LOADING) {
                    // it's OK, keep waiting
                    mainWindow.webContents.send('status-changed', currentStatus);
                } else if (currentStatus.status === ERROR) {
                    mainWindow.webContents.send('end-waiting');
                    clearInterval(intervalObject);
                    dialog.showErrorBox('Error', currentStatus.reason);
                    return;
                } if (currentStatus.status === SUCCESS) {
                    // ignore status from 'openFile'
                } else {
                    mainWindow.webContents.send('end-waiting');
                    clearInterval(intervalObject);
                    dialog.showErrorBox('Error', 'Unknown error loading file');
                    return;
                }
                getLoadingProgress();
            }, 500);
        },
        function error(data: string) {
            console.log(data);
            dialog.showErrorBox('Error', data);
        }
    );
}

function getLoadingProgress() {
    sendRequest({ command: 'loadingProgress' },
        function success(data: any) {
            currentStatus = data;
        },
        function error(data: string) {
            console.log(data);
        }
    );
}

function closeFile() {
    mainWindow.webContents.send('set-status', 'Closing file');
    mainWindow.webContents.send('start-waiting');
    sendRequest({ command: 'closeFile' },
        function success(json: any) {
            mainWindow.webContents.send('end-waiting');
            if (json.status === SUCCESS) {
                mainWindow.webContents.send('file-closed');
                mainWindow.webContents.send('set-status', '');
                currentFile = '';
                mainWindow.setTitle('TMXEditor'); // TODO
            } else {
                dialog.showMessageBox({ type: 'error', message: json.reason });
            }
        },
        function error(data: string) {
            mainWindow.webContents.send('end-waiting');
            dialog.showMessageBox({ type: 'error', message: data });
        }
    );
}

function getFileLanguages() {
    mainWindow.webContents.send('set-status', 'Getting languages');
    sendRequest({ command: 'getLanguages' },
        function success(json: any) {
            if (json.status === SUCCESS) {
                fileLanguages = json.languages;
                mainWindow.webContents.send('languages-changed');
            } else {
                dialog.showMessageBox({ type: 'error', message: json.reason });
            }
        },
        function error(data: string) {
            dialog.showMessageBox({ type: 'error', message: data });
        }
    );
}

ipcMain.on('get-languages', function (event, arg) {
    event.sender.send('update-languages', fileLanguages);
});

function saveDefaults() {
    var defaults = mainWindow.getBounds();
    if (!currentDefaults) {
        return;
    }
    if (defaults.width === currentDefaults.width && defaults.height === currentDefaults.height && defaults.x === currentDefaults.x) {
        return;
    }
    if (defaults.width === 800 && defaults.height === 600) {
        return;
    }
    writeFileSync(appHome + 'defaults.json', JSON.stringify(defaults));
}

function saveRecent(file: string) {
    readFile(appHome + 'recent.json', function (err: Error, data: Buffer) {
        if (err instanceof Error) {
            return;
        }
        var jsonData = JSON.parse(data.toString());
        var files = jsonData.files;
        if (files != undefined) {
            var found = false;
            for (var i = 0; i < files.length; i++) {
                if (file === files[i]) {
                    found = true;
                }
            }
            if (!found) {
                files.unshift(file);
                if (files.length > 5) {
                    jsonData.files = files.slice(0, 5);
                }
                writeFile(appHome + 'recent.json', JSON.stringify(jsonData), function (error) {
                    if (error) {
                        dialog.showMessageBox({ type: 'error', message: error.message });
                        return;
                    }
                });
            }
        }
    });
}

ipcMain.on('get-segments', function (event, arg) {
    arg.command = 'getSegments';
    mainWindow.webContents.send('start-waiting');
    mainWindow.webContents.send('set-status', 'Loading segments');
    sendRequest(arg,
        function success(json: any) {
            mainWindow.webContents.send('set-status', '');
            mainWindow.webContents.send('end-waiting');
            if (json.status === SUCCESS) {
                event.sender.send('update-segments', json);
            } else {
                dialog.showMessageBox({ type: 'error', message: json.reason });
            }
        },
        function error(data: string) {
            mainWindow.webContents.send('end-waiting');
            dialog.showMessageBox({ type: 'error', message: data });
        }
    );
});

ipcMain.on('get-cell-properties', function (event, arg) {
    arg.command = 'getTuvData';
    sendRequest(arg,
        function success(json: any) {
            event.sender.send('update-properties', json);
        },
        function error(data: string) {
            dialog.showMessageBox({ type: 'error', message: data });
        }
    );
});

ipcMain.on('get-row-properties', function (event, arg) {
    arg.command = 'getTuData';
    sendRequest(arg,
        function success(json: any) {
            event.sender.send('update-properties', json);
        },
        function error(data: string) {
            dialog.showMessageBox({ type: 'error', message: data });
        }
    );
});

function showSettings(): void {
    // TODO
}

function createNewFile(): void {
    // TODO
}

function saveFile(): void {
    // TODO
}

function saveAs(): void {
    // TODO
}

function convertCSV(): void {
    // TODO
}

function exportDelimited(): void {
    // TODO
}

function showFileInfo(): void {
    // TODO
}

function validateFile(): void {
    // TODO
}

function cleanCharacters(): void {
    // TODO
}

function splitFile(): void {
    // TODO
}

function mergeFiles(): void {
    // TODO
}

function saveEdits(): void {
    // TODO
}

function cancelEdit(): void {
    // TODO
}

function replaceText(): void {
    // TODO
}

function sortUnits() {
    // TODO
}

function showFilters() {
    if (currentFile === '') {
        dialog.showMessageBox({ type: 'warning', message: 'Open a TMX file' });
        return;
    }
    var filtersWindow = new BrowserWindow({
        parent: mainWindow,
        width: 500,
        height: 280,
        useContentSize: true,
        minimizable: false,
        maximizable: false,
        resizable: false,
        show: false,
        icon: './icons/tmxeditor.png',
        webPreferences: {
            nodeIntegration: true
        }
    });
    filtersWindow.setMenu(null);
    filtersWindow.loadURL('file://' + app.getAppPath() + '/html/filters.html');
    filtersWindow.show();
    // filtersWindow.webContents.openDevTools();
}

ipcMain.on('show-filters', () => {
    showFilters();
});

function insertUnit(): void {
    // TODO
}

function deleteUnits(): void {
    // TODO
}

function firstPage(): void {
    // TODO
}

function previousPage(): void {
    // TODO
}

function nextPage(): void {
    // TODO
}

function lastPage(): void {
    // TODO
}

function changeLanguageCode(): void {
    // TODO
}

function removeLanguage(): void {
    // TODO
}

function addLanguage(): void {
    // TODO
}

function changeSourceLanguage(): void {
    // TODO
}

function removeTags(): void {
    // TODO
}

function removeDuplicates(): void {
    // TODO
}

function removeUntranslated(): void {
    // TODO
}

function removeSpaces(): void {
    // TODO
}

function consolidateUnits(): void {
    // TODO 
}

function checkUpdates(): void {
    // TODO
}

function sendFeedback(): void {
    // TODO
}

function showReleaseHistory(): void {
    // TODO
}