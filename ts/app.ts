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

import { app, ipcMain, BrowserWindow, webContents, dialog, shell, Menu, MenuItem } from "electron";
import { execFileSync, spawn } from "child_process";
import { request, ClientRequest } from "http";
import { existsSync, readFileSync, readFile, writeFile, writeFileSync } from "fs";
import { Buffer } from "buffer";

var mainWindow: BrowserWindow;
var contents: webContents;
var javapath: string;
var appHome: string;
var stopping: boolean = false;
var fileLanguages: any;
var currentDefaults: any;
var currentStatus: any = {};
const SUCCESS: string = 'Success';

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
    javapath = __dirname + '\\bin\\java.exe';
    appHome = app.getPath('appData') + '\\tmxeditor\\';
} else {
    javapath = __dirname + '/bin/java';
    appHome = app.getPath('appData') + '/tmxeditor/';
}

spawn(javapath, ['--module-path', 'lib', '-m', 'tmxserver/com.maxprograms.tmxserver.TMXServer', '-port', '8050'], { cwd: __dirname });
var ck: Buffer = execFileSync('bin/java', ['--module-path', 'lib', '-m', 'openxliff/com.maxprograms.server.CheckURL', 'http://localhost:8050/TMXserver'], { cwd: __dirname });
console.log(ck.toString());

app.on('open-file', function (event, filePath) {
    event.preventDefault();
    openFile(filePath);
});

app.on('ready', function () {
    createWindow();
    mainWindow.loadURL('file://' + __dirname + '/index.html');
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
        { label: 'New', accelerator: 'CmdOrCtrl+N', click: function () { sendCommand('newFile'); } },
        { label: 'Open', accelerator: 'CmdOrCtrl+O', click: function () { openFileDialog(); } },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', click: function () { closeFile(); } },
        { label: 'Save', accelerator: 'CmdOrCtrl+s', click: function () { sendCommand('save'); } },
        { label: 'Save As', click: function () { sendCommand('saveAs'); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Convert CSV/TAB Delimited to TMX', click: function () { sendCommand('convertCSV'); } },
        { label: 'Export as TAB Delimited...', click: function () { sendCommand('exportDelimited'); } },
        new MenuItem({ type: 'separator' }),
        { label: 'File Properties', click: function () { sendCommand('fileInfo'); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Validate TMX File...', click: function () { sendCommand('validate'); } },
        { label: 'Clean Invalid Characters...', click: function () { sendCommand('cleanChars'); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Split TMX File...', click: function () { sendCommand('split'); } },
        { label: 'Merge TMX Files...', click: function () { sendCommand('merge'); } }
    ]);
    var editMenu: Menu = Menu.buildFromTemplate([
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: function () { contents.undo(); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: function () { contents.cut(); } },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: function () { contents.copy(); } },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: function () { contents.paste(); } },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: function () { contents.selectAll(); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Confirm Edit', accelerator: 'Alt+Enter', click: function () { sendCommand('complete'); } },
        { label: 'Cancel Edit', accelerator: 'Esc', click: function () { sendCommand('cancel'); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Replace Text...', accelerator: 'CmdOrCtrl+F', click: function () { sendCommand('replace'); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Insert Unit', click: function () { sendCommand('insert'); } },
        { label: 'Delete Selected Units', click: function () { sendCommand('delete'); } }
    ]);
    var viewMenu: Menu = Menu.buildFromTemplate([
        { label: 'Sort Units', accelerator: 'F5', click: function () { sendCommand('sort'); } },
        { label: 'Filter Units', accelerator: 'F3', click: function () { sendCommand('filter'); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Show First Page', click: function () { sendCommand('first'); } },
        { label: 'Show Previous Page', click: function () { sendCommand('previous'); } },
        { label: 'Show Next Page', click: function () { sendCommand('next'); } },
        { label: 'Show Last Page', click: function () { sendCommand('last'); } },
        new MenuItem({ type: 'separator' }),
        new MenuItem({ label: 'Toggle Full Screen', role: 'togglefullscreen' })
    ]);
    var tasksMenu: Menu = Menu.buildFromTemplate([
        { label: 'Change Language Code...', click: function () { sendCommand('change'); } },
        { label: 'Add Language...', click: function () { sendCommand('add'); } },
        { label: 'Remove Language...', click: function () { sendCommand('remove'); } },
        { label: 'Change Source Language...', click: function () { sendCommand('changeSrc'); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Remove All Tags', click: function () { sendCommand('removeTags'); } },
        { label: 'Remove Duplicates', click: function () { sendCommand('removeDuplicates'); } },
        { label: 'Remove Untranslated...', click: function () { sendCommand('removeUntranslated'); } },
        { label: 'Remove Initial/Trailing Spaces', click: function () { sendCommand('removeSpaces'); } },
        { label: 'Consolidate Units...', click: function () { sendCommand('consolidate'); } }
    ]);
    var helpMenu: Menu = Menu.buildFromTemplate([
        { label: 'TMXEditor User Guide', accelerator: 'F1', click: function () { showHelp(); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Check for Updates', click: function () { sendCommand('updates'); } },
        { label: 'View Release History', click: function () { sendCommand('releaseHistory'); } },
        { label: 'Disable License', click: function () { sendCommand('license'); } },
        new MenuItem({ type: 'separator' }),
        { label: 'Send Feedback...', click: function () { sendCommand('feedback'); } }
    ]);
    var template: MenuItem[] = [
        new MenuItem({ label: 'File', submenu: fileMenu }),
        new MenuItem({ label: 'Edit', role: 'editMenu', submenu: editMenu }),
        new MenuItem({ label: 'View', submenu: viewMenu }),
        new MenuItem({ label: 'Tasks', submenu: tasksMenu }),
        new MenuItem({ label: 'Help', submenu: helpMenu })
    ];
    if (process.platform === 'darwin') {
        var appleMenu: Menu = Menu.buildFromTemplate([
            new MenuItem({ label: 'About...', click: function () { showAbout(); } }),
            new MenuItem({
                label: 'Preferences...', submenu: [
                    { label: 'Settings', accelerator: 'Cmd+,', click: function () { sendCommand('settings'); } }
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
        template.unshift(new MenuItem({ label: 'TMXEditor', submenu: appleMenu }));
    } else {
        var help: MenuItem = template.pop();
        template.push(new MenuItem({
            label: 'Settings', submenu: [
                { label: 'Preferences', click: function () { sendCommand('settings'); } }
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

function sendCommand(command: string) {
    sendRequest({ command: command },
        function success() {
            // do nothing
        },
        function error() {
            dialog.showErrorBox('Error', 'Send "' + command + '" failed');
        }
    );
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
        sendCommand('stop');
    }
}

function showAbout() {
    var about = new BrowserWindow({
        parent: mainWindow,
        width: 620,
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
    about.setMenu(null);
    about.loadURL('file://' + __dirname + '/html/about.html');
    about.show();
}

function showHelp() {
    var help = __dirname + '/tmxeditor.pdf';
    if (process.platform == 'win32') {
        help = __dirname + '\\tmxeditor.pdf';
    }
    shell.openItem(help);
}

ipcMain.on('openFile', function () {
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
                if (currentStatus.status === 'Completed') {
                    mainWindow.webContents.send('end-waiting');
                    clearInterval(intervalObject);
                    getFileLanguages();
                    mainWindow.webContents.send('file-loaded');
                    return;
                } else if (currentStatus.status === SUCCESS) {
                    // it's OK, keep waiting
                    mainWindow.webContents.send('status-changed', currentStatus);
                } else {
                    mainWindow.webContents.send('end-waiting');
                    clearInterval(intervalObject);
                    dialog.showErrorBox('Error', currentStatus.reason);
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
            }
            else {
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
