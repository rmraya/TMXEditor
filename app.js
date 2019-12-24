/*****************************************************************************
Copyright (c) 2018-2019 - Maxprograms,  http://www.maxprograms.com/

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
const { app, ipcMain, BrowserWindow, dialog, shell, Menu } = require('electron');
const spawn = require('child_process').spawn;
const fileSync = require('child_process').execFileSync;
const fs = require('fs');
const http = require('http');
const url = require('url');

let mainWindow;
let contents;
let javapath;
let appHome;
let stopping = false;
let fileLanguages;

var currentDefaults;
const SUCCESS = 'Success';
const locked = app.requestSingleInstanceLock();

if (!locked) {
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

const ck = fileSync('bin/java', ['--module-path', 'lib', '-m', 'openxliff/com.maxprograms.server.CheckURL', 'http://localhost:8050/TMXserver'], { cwd: __dirname });
if (ck.error != null) {
    console.log('ck ' + JSON.stringify(ck));
}

app.on('open-file', function (event, url) {
    event.preventDefault();
})

app.on('ready', function () {
    createWindow();
    mainWindow.loadURL('file://' + __dirname + '/index.html');
    mainWindow.on('resize', () => {
        saveDefaults();
    });
    mainWindow.on('move', () => {
        saveDefaults();
    });
    mainWindow.show();
    // mainWindow.webContents.openDevTools();
})

app.on('quit', () => {
    stopServer();
})

app.on('window-all-closed', function () {
    stopServer();
    app.quit();
})

if (process.platform === 'darwin') {
    app.on('open-file', (event, path) => {
        event.preventDefault();
        openFile(path);
    })
}

function createWindow() {
    currentDefaults = { width: 900, height: 700, x: 0, y: 0 };
    if (fs.existsSync(appHome + 'defaults.json')) {
        try {
            let data = fs.readFileSync(appHome + 'defaults.json');
            currentDefaults = JSON.parse(data);
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
        icon: 'icons/tmxeditor.png',
        background: '#eeeeee44'
    })
    contents = mainWindow.webContents

    var template = [
        {
            label: 'File', submenu: [
                { label: 'New', accelerator: 'CmdOrCtrl+N', click: function () { sendCommand('newFile') } },
                { label: 'Open', accelerator: 'CmdOrCtrl+O', click: function () { openFileDialog() } },
                { label: 'Close', accelerator: 'CmdOrCtrl+W', click: function () { closeFile() } },
                { label: 'Save', accelerator: 'CmdOrCtrl+s', click: function () { sendCommand('save') } },
                { label: 'Save As', click: function () { sendCommand('saveAs') } },
                { type: 'separator' },
                { label: 'Convert CSV/TAB Delimited to TMX', click: function () { sendCommand('convertCSV') } },
                { label: 'Export as TAB Delimited...', click: function () { sendCommand('exportDelimited') } },
                { type: 'separator' },
                { label: 'File Properties', click: function () { sendCommand('fileInfo') } },
                { type: 'separator' },
                { label: 'Validate TMX File...', click: function () { sendCommand('validate') } },
                { label: 'Clean Invalid Characters...', click: function () { sendCommand('cleanChars') } },
                { type: 'separator' },
                { label: 'Split TMX File...', click: function () { sendCommand('split') } },
                { label: 'Merge TMX Files...', click: function () { sendCommand('merge') } }
            ]
        },
        {
            label: 'Edit', role: 'editMenu', submenu: [
                { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: function () { contents.undo() } },
                { type: 'separator' },
                { label: 'Cut', accelerator: 'CmdOrCtrl+X', click: function () { contents.cut() } },
                { label: 'Copy', accelerator: 'CmdOrCtrl+C', click: function () { contents.copy() } },
                { label: 'Paste', accelerator: 'CmdOrCtrl+V', click: function () { contents.paste() } },
                { label: 'Select All', accelerator: 'CmdOrCtrl+A', click: function () { contents.selectAll() } },
                { type: 'separator' },
                { label: 'Confirm Edit', accelerator: 'Alt+Enter', click: function () { sendCommand('complete') } },
                { label: 'Cancel Edit', accelerator: 'Esc', click: function () { sendCommand('cancel') } },
                { type: 'separator' },
                { label: 'Replace Text...', accelerator: 'CmdOrCtrl+F', click: function () { sendCommand('replace') } },
                { type: 'separator' },
                { label: 'Insert Unit', click: function () { sendCommand('insert') } },
                { label: 'Delete Selected Units', click: function () { sendCommand('delete') } }
            ]
        },
        {
            label: 'View', submenu: [
                { label: 'Sort Units', accelerator: 'F5', click: function () { sendCommand('sort') } },
                { label: 'Filter Units', accelerator: 'F3', click: function () { sendCommand('filter') } },
                { type: 'separator' },
                { label: 'Show First Page', click: function () { sendCommand('first') } },
                { label: 'Show Previous Page', click: function () { sendCommand('previous') } },
                { label: 'Show Next Page', click: function () { sendCommand('next') } },
                { label: 'Show Last Page', click: function () { sendCommand('last') } },
                { type: 'separator' },
                { label: 'Toggle Full Screen', role: 'toggleFullScreen' }
            ]
        },
        {
            label: 'Tasks', submenu: [
                { label: 'Change Language Code...', click: function () { sendCommand('change') } },
                { label: 'Add Language...', click: function () { sendCommand('add') } },
                { label: 'Remove Language...', click: function () { sendCommand('remove') } },
                { label: 'Change Source Language...', click: function () { sendCommand('changeSrc') } },
                { type: 'separator' },
                { label: 'Remove All Tags', click: function () { sendCommand('removeTags') } },
                { label: 'Remove Duplicates', click: function () { sendCommand('removeDuplicates') } },
                { label: 'Remove Untranslated...', click: function () { sendCommand('removeUntranslated') } },
                { label: 'Remove Initial/Trailing Spaces', click: function () { sendCommand('removeSpaces') } },
                { label: 'Consolidate Units...', click: function () { sendCommand('consolidate') } }
            ]
        },
        {
            label: 'Help', submenu: [
                { label: 'TMXEditor User Guide', accelerator: 'F1', click: function () { showHelp() } },
                { type: 'separator' },
                { label: 'Check for Updates', click: function () { sendCommand('updates') } },
                { label: 'View Release History', click: function () { sendCommand('releaseHistory') } },
                { label: 'Disable License', click: function () { sendCommand('license') } },
                { type: 'separator' },
                { label: 'Send Feedback...', click: function () { sendCommand('feedback') } }
            ]
        }
    ];

    if (process.platform === 'darwin') {
        template.unshift({
            label: 'TMXEditor', submenu: [
                { label: 'About...', click: function () { showAbout() } },
                {
                    label: 'Preferences...', submenu: [
                        { label: 'Default Indentation', accelerator: 'Cmd+,', click: function () { sendCommand('indentation') } }
                    ]
                },
                { type: 'separator' },
                {
                    label: 'Services', role: 'services', submenu: [
                        { label: 'No Services Apply', enabled: false }
                    ]
                },
                { type: 'separator' },
                { label: 'Quit TMXEditor', accelerator: 'Cmd+Q', role: 'quit', click: function () { app.quit() } }
            ]
        });
    } else {
        helpMenu = template.pop()
        template.push(
            {
                label: 'Settings', submenu: [
                    { label: 'Default Indentation', click: function () { sendCommand('indentation') } }
                ]
            }
        );
        template.push(helpMenu);
    }
    if (!fs.existsSync(appHome + 'recent.json')) {
        fs.writeFile(appHome + 'recent.json', '{"files" : []}', function (err) {
            if (err) {
                dialog.showMessageBox({ type: 'error', message: err.message });
                return;
            }
        });
    }
    fs.readFile(appHome + 'recent.json', function (err, data) {
        if (err instanceof Error) {
            Menu.setApplicationMenu(Menu.buildFromTemplate(template));
            return;
        }
        var jsonData = JSON.parse(data);
        let files = jsonData.files;
        if (files != undefined && files.length > 0) {
            if (process.platform === 'darwin') {
                template[1].submenu.push({ type: 'separator' });
            } else {
                template[0].submenu.push({ type: 'separator' });
            }
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                if (fs.existsSync(url.pathToFileURL(file))) {
                    if (process.platform === 'darwin') {
                        template[1].submenu.push({ label: file, click: function () { openFile(files[i]) } });
                    } else {
                        template[0].submenu.push({ label: file, click: function () { openFile(files[i]) } });
                    }
                }
            }
        }

        if (process.platform == 'win32') {
            template[0].submenu.push({ type: 'separator' }, { label: 'Exit', accelerator: 'Alt+F4', role: 'quit', click: function () { app.quit() } });
            template[5].submenu.push({ type: 'separator' }, { label: 'About...', click: function () { showAbout() } });
        }
        if (process.platform === 'linux') {
            template[0].submenu.push({ type: 'separator' }, { label: 'Quit', accelerator: 'Ctrl+Q', role: 'quit', click: function () { app.quit() } });
            template[5].submenu.push({ type: 'separator' }, { label: 'About...', click: showAbout() });
        }
        Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    });
}

function sendCommand(command) {
    let json = { command: command };
    sendRequest(json, 
        function success() {
            // do nothing
        },
        function error() {
            dialog.showErrorBox('Send "' + command + '" failed');
        }
    );
}

function sendRequest(json, success, error) {
    const postData = JSON.stringify(json);
    const options = {
        hostname: '127.0.0.1',
        port: 8050,
        path: '/TMXServer',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }
    // Make a request
    const req = http.request(options);
    req.on('response', (res) => {
        res.setEncoding('utf-8');
        if (res.statusCode != 200) {
            error('sendRequest() error: ' + res.statusMessage);
        }
        let rawData = '';
        res.on('data', (chunk) => {
            rawData += chunk;
        });
        res.on('end', () => {
            try {
                success(JSON.parse(rawData));
            } catch (e) {
                error(e.message);
            }
        });
    });
    req.write(postData);
    req.end()
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
        help = __dirname + '\\tmxeditor.pdf'
    }
    shell.openItem(help);
}

ipcMain.on('openFile', () => {
    openFileDialog();
});

function openFileDialog() {
    dialog.showOpenDialog({
        title: 'Open TMX File',
        openFile: true,
        properties: ['openFile'],
        filters: [
            { name: 'TMX File', extensions: ['tmx'] },
            { name: 'Any File', extensions: ['*'] }
        ]
    }).then((value) => {
        if (!value.canceled) {
            openFile(value.filePaths[0]);
            saveRecent(value.filePaths[0]);
        }
    }).catch((error) => {
        dialog.showErrorBox('Error', error);
        console.log(error);
    });
}

function openFile(file) {
    mainWindow.webContents.send('start-waiting');
    mainWindow.webContents.send('set-status', 'Opening file');
    sendRequest({ command: 'openFile', file: file },
        function success(json) {
            status = json;
            var intervalObject = setInterval(function () {
                if (status.status === 'Completed') {
                    mainWindow.webContents.send('end-waiting');
                    clearInterval(intervalObject);
                    getFileLanguages();
                    mainWindow.webContents.send('file-loaded');
                    return;
                } else if (status.status === SUCCESS) {
                    // it's OK, keep waiting
                    mainWindow.webContents.send('status-changed');
                } else {
                    mainWindow.webContents.send('end-waiting');
                    clearInterval(intervalObject);
                    dialog.showErrorBox('Error', status.reason);
                    return;
                }
                getLoadingProgress();
            }, 500);
        },
        function error(data) {
            console.log(data);
            dialog.showErrorBox('Error', data);
        }
    );
}

function getLoadingProgress() {
    sendRequest({ command: 'loadingProgress' },
        function success(data) {
            status = data;
        },
        function error(data) {
            console.log(data);
        }
    );
}

function closeFile() {
    mainWindow.webContents.send('set-status', 'Closing file');
    mainWindow.webContents.send('start-waiting');
    sendRequest('closeFile',
        function success(json) {
            mainWindow.webContents.send('end-waiting');
            if (json.status === SUCCESS) {
                mainWindow.webContents.send('file-closed');
            } else {
                dialog.showMessageBox({ type: 'error', message: json.reason });
            }
        },
        function error(data) {
            mainWindow.webContents.send('end-waiting');
            dialog.showMessageBox({ type: 'error', message: data });
        }
    );
}

function getFileLanguages() {
    mainWindow.webContents.send('set-status', 'Getting languages');
    sendRequest({ command: 'getLanguages' },
        function success(json) {
            if (json.status === SUCCESS) {
                fileLanguages = json.languages;
                mainWindow.webContents.send('languages-changed');
            } else {
                dialog.showMessageBox({ type: 'error', message: json.reason });
            }
        },
        function error(data) {
            dialog.showMessageBox({ type: 'error', message: data });
        }
    );
}

ipcMain.on('get-status', (event, arg) => {
    event.sender.send('update-status', status);
});

ipcMain.on('get-languages', (event, arg) => {
    event.sender.send('update-languages', fileLanguages);
});

function saveDefaults() {
    let defaults = mainWindow.getBounds();
    if (!currentDefaults) {
        return;
    }
    if (defaults.width === currentDefaults.width && defaults.height === currentDefaults.height && defaults.x === currentDefaults.x) {
        return;
    }
    if (defaults.width === 800 && defaults.height === 600) {
        return;
    }
    fs.writeFileSync(appHome + 'defaults.json', JSON.stringify(defaults), function (err) {
        if (err) {
            dialog.showMessageBox({ type: 'error', message: err.message });
            return;
        }
    });
}

function saveRecent(file) {
    fs.readFile(appHome + 'recent.json', function (err, data) {
        if (err instanceof Error) {
            return;
        }
        var jsonData = JSON.parse(data);
        let files = jsonData.files
        if (files != undefined) {
            var found = false;
            for (let i = 0; i < files.length; i++) {
                if (file === files[i]) {
                    found = true;
                }
            }
            if (!found) {
                files.unshift(file);
                fs.writeFile(appHome + 'recent.json', JSON.stringify(jsonData), function (err) {
                    if (err) {
                        dialog.showMessageBox({ type: 'error', message: err.message });
                        return;
                    }
                });
            }
        }
    });
}

ipcMain.on('get-segments', (event, arg) => {
    arg.command = 'getSegments';
    mainWindow.webContents.send('start-waiting');
    mainWindow.webContents.send('set-status', 'Loading segments');
    sendRequest(arg,
        function success(json) {
            mainWindow.webContents.send('set-status', '');
            mainWindow.webContents.send('end-waiting');
            if (json.status === SUCCESS) {
                event.sender.send('update-segments', json);
            } else {
                dialog.showMessageBox({ type: 'error', message: json.reason });
            }
        },
        function error(data) {
            mainWindow.webContents.send('end-waiting');
            dialog.showMessageBox({ type: 'error', message: data });
        }
    );
});

ipcMain.on('get-cell-properties', (event, arg) => {
    arg.command = 'getTuvData';
    sendRequest(arg,
        function success(json) {
            event.sender.send('update-properties', json);
        },
        function error(data) {
            dialog.showMessageBox({ type: 'error', message: data });
        }
    );
});

ipcMain.on('get-row-properties', (event, arg) => {
    arg.command = 'getTuData';
    sendRequest(arg,
        function success(json) {
            event.sender.send('update-properties', json);
        },
        function error(data) {
            dialog.showMessageBox({ type: 'error', message: data });
        }
    );
});