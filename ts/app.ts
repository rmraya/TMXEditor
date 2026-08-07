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

import { BrowserWindow, IpcMainEvent, Menu, MenuItem, MessageBoxReturnValue, OpenDialogReturnValue, Rectangle, SaveDialogReturnValue, app, dialog, ipcMain, nativeTheme, net, session, shell } from "electron";
import { IncomingMessage } from "electron/main";
import { appendFileSync, existsSync, mkdirSync, readFile, readFileSync, rmSync, unlinkSync, writeFile, writeFileSync } from "fs";
import { basename, join } from 'node:path';
import path from "path";
import { TMReader, TMReaderResult } from "sdltm";
import { LanguageUtils } from "typesbcp47";
import { Csv2Tmx } from "./csv/csv2tmx.js";
import { Tmx2Csv } from "./csv/tmx2csv.js";
import { Excel2Tmx } from "./excel/excel2tmx.js";
import { Tmx2Excel } from "./excel/tmx2excel.js";
import { I18n } from "./i18n.js";
import { Language } from "./language.js";
import { Locations, Point } from "./locations.js";
import { Preferences } from "./preferences.js";
import { Tbx2Tmx } from "./tbx/tbx2tmx.js";
import { Tmx2Merge } from "./tmx/tmx2merge.js";
import { Tmx2Split } from "./tmx/tmx2split.js";
import { TmxCleaner } from "./tmx/tmxCleaner.js";
import { SegmentFilter, TMXModel, TuData } from "./tmx/tmxModel.js";
import { TmxUtils } from "./tmx/tmxUtils.js";
import { Validator } from "./tmx/validator.js";
import { copyFileSync } from "node:fs";

interface SegmentsRequest {
    start: number;
    count: number;
}

const SUCCESS: string = 'Success';

class App {

    static mainWindow: BrowserWindow;
    static newFileWindow: BrowserWindow;
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
    static convertSDLTMWindow: BrowserWindow;
    static convertTBXWindow: BrowserWindow;
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
    static removeSameAsSourceWindow: BrowserWindow;
    static consolidateWindow: BrowserWindow;
    static updatesWindow: BrowserWindow;
    static maintenanceWindow: BrowserWindow;
    static convertExcelWindow: BrowserWindow;
    static excelLanguagesWindow: BrowserWindow;
    static systemInfoWindow: BrowserWindow;

    stopping: boolean = false;
    static shouldQuit: boolean = false;

    static iconPath: string;

    static saved: boolean = true;
    static shouldClose: boolean = false;
    static onFileClosed: (() => void) | undefined = undefined;
    static fileToOpen: string = '';
    static fileToOpenNeedsName: boolean = false;
    static waitingForEditCheck: boolean = false;
    static waitingForEditFlush: boolean = false;
    static pendingEditCheckResume: ((changed: boolean) => void) | undefined = undefined;
    static currentFile: string = '';
    static currentDefaults: { width: number, height: number, x: number, y: number };
    static currentPreferences: Preferences;
    static currentCss: string;
    static model: TMXModel | null = null;
    static fileLanguages: Language[];
    static argFile: string = '';
    static isReady: boolean = false;
    static editingCell: any = {};

    static csvEvent: IpcMainEvent;
    static excelEvent: IpcMainEvent;
    static propertyEvent: IpcMainEvent;

    static filterOptions: SegmentFilter = {};
    static loadOptions: SegmentsRequest = {
        start: 0,
        count: 200
    };
    static sortOptions: SegmentFilter = {};
    static preFilterStart: number = 0;
    static csvLangArgs: any;
    static excelLangArgs: any;
    static attributesArg: any;
    static propertiesArg: any;
    static notesArg: any;

    static needsName: boolean = false;

    static latestVersion: string;
    static downloadLink: string;

    static locations: Locations;

    static i18n: I18n;
    static lang: string = 'en';

    constructor(args: string[]) {

        if (!existsSync(path.join(app.getPath('appData'), app.name))) {
            mkdirSync(path.join(app.getPath('appData'), app.name), { recursive: true });
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

        if (!app.requestSingleInstanceLock()) {
            app.quit();
        } else if (App.mainWindow) {
            // Someone tried to run a second instance, we should focus our window.
            if (App.mainWindow.isMinimized()) {
                App.mainWindow.restore();
            }
            App.mainWindow.focus();
        }

        if (!existsSync(path.join(app.getPath('appData'), app.name))) {
            mkdirSync(path.join(app.getPath('appData'), app.name), { recursive: true });
        }

        App.loadPreferences();

        App.locations = new Locations(path.join(app.getPath('appData'), app.name, 'locations.json'));

        app.on('open-file', (event, filePath) => {
            event.preventDefault();
            if (App.isReady) {
                App.openFile(filePath);
            } else {
                App.argFile = filePath;
            }
        });

        app.on('before-quit', (event) => {
            if (!App.saved) {
                event.preventDefault();
                App.close();
                return;
            }
        });

        app.on('window-all-closed', () => {
            app.quit();
        });

        App.loadDefaults();
        App.i18n = new I18n(path.join(app.getAppPath(), 'i18n', 'tmxeditor_' + App.lang + '.json'));

        app.on('ready', () => {
            App.createWindow();
            let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'index.html');
            let url: URL = new URL('file://' + filePath);
            App.mainWindow.loadURL(url.href);
            App.mainWindow.on('resize', () => {
                App.saveDefaults();
            });
            App.mainWindow.on('move', () => {
                App.saveDefaults();
            });
            App.mainWindow.show();
            App.checkUpdates(true);
            App.isReady = true;
            App.mainLoaded();
            if (process.platform === 'darwin' && app.runningUnderARM64Translation) {
                App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'm1Mac') });
            }
            App.setLocation(App.mainWindow, 'index.html');
        });

        nativeTheme.on('updated', () => {
            if (App.currentPreferences.theme === 'system') {
                App.currentCss = App.resolveThemeCss(App.currentPreferences.theme);
            }
            let windows: BrowserWindow[] = BrowserWindow.getAllWindows();
            for (let window of windows) {
                window.webContents.send('set-theme', App.currentCss);
            }
            App.createMenu();
        });
        ipcMain.on('get-tooltips', (event: IpcMainEvent) => {
            App.sendTooltips(event);
        });
        ipcMain.on('licenses-clicked', () => {
            App.showLicenses({ from: 'about' });
        });
        ipcMain.on('open-license', (event: IpcMainEvent, type: string) => {
            App.openLicense(type);
        });
        ipcMain.on('show-help', () => {
            App.showHelp();
        });
        ipcMain.on('open-file', () => {
            App.openFileDialog();
        });
        ipcMain.on('get-segments', (event: IpcMainEvent, arg: SegmentsRequest) => {
            App.loadOptions = arg;
            App.loadSegments();
        });
        ipcMain.on('get-cell-properties', (event: IpcMainEvent, arg: { id: string, lang: string }) => {
            App.getCellProperties(arg.id, arg.lang);
        });
        ipcMain.on('editing-started', (event: IpcMainEvent, arg: { id: string, lang: string }) => {
            App.editingCell = arg;
        });
        ipcMain.on('cancel-editing', () => {
            App.editingCell = {};
        });
        ipcMain.on('saved-edit', (event: IpcMainEvent, arg: { id: string, lang: string }) => {
            if (arg.id === App.editingCell.id && arg.lang === App.editingCell.lang) {
                App.editingCell = {};
                if (App.waitingForEditFlush) {
                    App.waitingForEditFlush = false;
                    App.saveFile();
                }
            }
        });
        ipcMain.on('edit-changed-response', (event: IpcMainEvent, changed: boolean) => {
            if (!App.waitingForEditCheck) {
                return;
            }
            App.waitingForEditCheck = false;
            let resume: ((changed: boolean) => void) | undefined = App.pendingEditCheckResume;
            App.pendingEditCheckResume = undefined;
            if (resume) {
                resume(changed);
            }
        });
        ipcMain.on('get-row-properties', (event: IpcMainEvent, id: string) => {
            App.getRowProperties(id);
        });
        ipcMain.on('edit-attributes', (event: IpcMainEvent, arg: any) => {
            this.editAttributes(arg);
        });
        ipcMain.on('get-unit-attributes', (event: IpcMainEvent) => {
            event.sender.send('set-unit-attributes', App.attributesArg);
        });
        ipcMain.on('get-lang-attributes-text', (event: IpcMainEvent) => {
            let attributesArg = App.attributesArg;
            let attributesLabel: string = App.i18n.getString('App', 'langAttributes');
            event.sender.send('set-lang-attributes-text', App.i18n.format(attributesLabel, [attributesArg.type]));
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
        ipcMain.on('show-add-property', (event: IpcMainEvent, parent: string) => {
            App.showAddProperty(event, parent);
        });
        ipcMain.on('add-new-property', (event: IpcMainEvent, arg: any) => {
            this.addNewProperty(arg);
        });
        ipcMain.on('save-properties', (event: IpcMainEvent, arg: any) => {
            this.saveProperties(arg);
        });
        ipcMain.on('edit-notes', (event: IpcMainEvent, arg: any) => {
            App.showNotesPanel(arg);
        });
        ipcMain.on('get-unit-notes', (event: IpcMainEvent) => {
            event.sender.send('set-unit-notes', App.notesArg);
        });
        ipcMain.on('show-add-note', (event: IpcMainEvent, parent: string) => {
            this.showAddNote(parent);
        });
        ipcMain.on('add-new-note', (event: IpcMainEvent, note: string) => {
            this.addNewNote(note);
        });
        ipcMain.on('save-notes', (event: IpcMainEvent, arg: any) => {
            this.saveNotes(arg);
        });
        ipcMain.on('get-preferences', (event: IpcMainEvent) => {
            event.sender.send('set-preferences', App.currentPreferences);
        });
        ipcMain.on('save-preferences', (event: IpcMainEvent, arg: any) => {
            App.savePreferences(arg);
            App.settingsWindow.close();
            App.loadPreferences();
            App.setTheme();
        });
        ipcMain.on('get-theme', (event: IpcMainEvent) => {
            event.sender.send('set-theme', App.currentCss);
        });
        ipcMain.on('create-file', (event: IpcMainEvent, arg: { srcLang: string, tgtLang: string }) => {
            this.createFile(arg.srcLang, arg.tgtLang);
        });
        ipcMain.on('new-file', () => {
            App.createNewFile();
        });
        ipcMain.on('save-file', () => {
            App.saveFile();
        });
        ipcMain.on('save-file-attributes', (event: IpcMainEvent, arg: any) => {
            App.saveFileAttributes(arg);
        });
        ipcMain.on('save-file-properties', (event: IpcMainEvent, properties: Array<string[]>) => {
            App.saveFileProperties(properties);
        });
        ipcMain.on('save-file-notes', (event: IpcMainEvent, notes: string[]) => {
            App.saveFileNotes(notes);
        });
        ipcMain.on('convert-excel', () => {
            App.convertExcel();
        });
        ipcMain.on('convert-sdltm-tmx', (event: IpcMainEvent, arg: any) => {
            this.convertSdltmTmx(arg);
        });
        ipcMain.on('convert-tbx-tmx', (event: IpcMainEvent, arg: any) => {
            this.convertTbxTmx(arg);
        });
        ipcMain.on('convert-csv', () => {
            App.convertCSV();
        });
        ipcMain.on('convert-tbx', () => {
            App.convertTBX();
        });
        ipcMain.on('convert-sdltm', () => {
            App.convertSDLTM();
        });
        ipcMain.on('convert-csv-tmx', (event: IpcMainEvent, arg: any) => {
            this.convertCsvTmx(arg);
        });
        ipcMain.on('convert-excel-tmx', (event: IpcMainEvent, arg: any) => {
            this.convertExcelTmx(arg);
        });
        ipcMain.on('get-csvfile', (event: IpcMainEvent) => {
            this.getCsvFile(event);
        });
        ipcMain.on('get-tbxfile', (event: IpcMainEvent) => {
            this.getTbxFile(event);
        });
        ipcMain.on('get-sdltmfile', (event: IpcMainEvent) => {
            this.getSdltmFile(event);
        });
        ipcMain.on('get-excelfile', (event: IpcMainEvent) => {
            this.getExcelFile(event);
        });
        ipcMain.on('get-converted-tmx', (event: IpcMainEvent, arg: any) => {
            this.getConvertedTMX(event, arg);
        });
        ipcMain.on('get-csv-preview', (event: IpcMainEvent, arg: any) => {
            this.getCsvPreview(event, arg);
        });
        ipcMain.on('get-excel-preview', (event: IpcMainEvent, excelFile: string) => {
            this.getExcelPreview(event, excelFile);
        });
        ipcMain.on('get-csv-languages', (event: IpcMainEvent, arg: any) => {
            this.getCsvLanguages(event, arg);
        });
        ipcMain.on('get-excel-languages', (event: IpcMainEvent, arg: any) => {
            this.getExcelLanguages(event, arg);
        });
        ipcMain.on('get-csv-lang-args', (event: IpcMainEvent) => {
            event.sender.send('set-csv-lang-args', App.csvLangArgs);
        });
        ipcMain.on('set-csv-languages', (event: IpcMainEvent, arg: any) => {
            this.setCsvLanguages(arg);
        });
        ipcMain.on('set-excel-languages', (event: IpcMainEvent, arg: any) => {
            this.setExcelLanguages(arg);
        });
        ipcMain.on('get-excel-lang-args', (event: IpcMainEvent) => {
            event.sender.send('set-excel-lang-args', App.excelLangArgs);
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
        ipcMain.on('get-remove-file-text', (event: IpcMainEvent) => {
            event.sender.send('set-remove-file-text', App.i18n.getString('mergeFiles', 'removeFileText'));
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
        ipcMain.on('find-text', (event: IpcMainEvent, args: { searchText: string, caseSensitive: boolean, useRegex: boolean }) => {
            this.findText(args);
        });
        ipcMain.on('find-next-text', (event: IpcMainEvent, args: { searchText: string, caseSensitive: boolean, useRegex: boolean }) => {
            this.findNextText(args);
        });
        ipcMain.on('match-found-notification', (event: IpcMainEvent, found: boolean) => {
            App.replaceTextWindow?.webContents.send('match-found', found);
        });
        ipcMain.on('search-start', (event: IpcMainEvent, args: { searchText: string, caseSensitive: boolean, useRegex: boolean, position: number, langIndex: number }) => {
            this.searchStartReceived(args);
        });
        ipcMain.on('replace-current', (event: IpcMainEvent, replaceText: string) => {
            App.mainWindow.webContents.send('replace-selected-text', replaceText);
        });
        ipcMain.on('replace-all', (event: IpcMainEvent, args: { searchText: string, replaceText: string, caseSensitive: boolean, useRegex: boolean }) => {
            this.replaceAllRequest(args);
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
        ipcMain.on('get-file-languages', (event: IpcMainEvent) => {
            event.sender.send('file-languages', App.fileLanguages);
        });
        ipcMain.on('get-admin-languages', (event: IpcMainEvent) => {
            event.sender.send('admin-languages', App.adminLanguages());
        });
        ipcMain.on('insert-unit', () => {
            App.insertUnit();
        });
        ipcMain.on('delete-units', (event: IpcMainEvent, arg: any) => {
            this.deleteUnits(arg);
        });
        ipcMain.on('change-language', (event: IpcMainEvent, arg: { oldLanguage: string, newLanguage: string }) => {
            this.changeLanguage(arg.oldLanguage, arg.newLanguage);
        });
        ipcMain.on('all-languages', (event: IpcMainEvent) => {
            this.allLanguages(event);
        });
        ipcMain.on('remove-language', (event: IpcMainEvent, lang: string) => {
            this.removeLanguage(lang);
        });
        ipcMain.on('add-language', (event: IpcMainEvent, lang: string) => {
            this.addLanguage(lang);
        });
        ipcMain.on('get-source-language', (event: IpcMainEvent) => {
            this.getSourceLanguage(event);
        });
        ipcMain.on('change-source-language', (event: IpcMainEvent, srcLang: string) => {
            this.changeSourceLanguage(srcLang);
        });
        ipcMain.on('remove-untranslated', (event: IpcMainEvent, srcLang: string) => {
            this.removeUntranslated(srcLang);
        });
        ipcMain.on('remove-sameAsSource', (event: IpcMainEvent, srcLang: string) => {
            this.removeSameAsSource(srcLang);
        });
        ipcMain.on('consolidate-units', (event: IpcMainEvent, srcLang: string) => {
            this.consolidateUnits(srcLang);
        });
        ipcMain.on('get-version', (event: IpcMainEvent) => {
            event.sender.send('set-version', app.name + ' ' + app.getVersion());
        });
        ipcMain.on('show-message', (event: IpcMainEvent, arg: any) => {
            App.showMessage(arg);
        });
        ipcMain.on('set-height', (event: IpcMainEvent, arg: { window: string, width: number, height: number }) => {
            App.setHeight(arg);
        });
        ipcMain.on('close-newFile', () => {
            App.newFileWindow.close();
        });
        ipcMain.on('close-about', () => {
            App.aboutWindow.close();
        });
        ipcMain.on('system-info-clicked', () => {
            App.showSystemInfo();
        });
        ipcMain.on('close-systemInfo', () => {
            App.systemInfoWindow.close();
        });
        ipcMain.on('get-system-info', (event: IpcMainEvent) => {
            App.getSystemInformation(event);
        });
        ipcMain.on('close-fileInfo', () => {
            App.fileInfoWindow.close();
        });
        ipcMain.on('close-licenses', () => {
            App.licensesWindow.close();
        });
        ipcMain.on('close-preferences', () => {
            App.settingsWindow.close();
        });
        ipcMain.on('close-attributes', () => {
            App.attributesWindow.close();
        });
        ipcMain.on('close-properties', () => {
            App.propertiesWindow.close();
        });
        ipcMain.on('close-addProperty', () => {
            App.addPropertyWindow.close();
        });
        ipcMain.on('close-notes', () => {
            App.notesWindow.close();
        });
        ipcMain.on('close-addNote', () => {
            App.addNotesWindow.close();
        });
        ipcMain.on('close-convertSdltm', () => {
            App.convertSDLTMWindow.close();
        });
        ipcMain.on('close-convertTbx', () => {
            App.convertTBXWindow.close();
        });
        ipcMain.on('close-convertCsv', () => {
            App.convertCsvWindow.close();
        });
        ipcMain.on('close-convertExcel', () => {
            App.convertExcelWindow.close();
        });
        ipcMain.on('close-csvLanguages', () => {
            App.csvLanguagesWindow.close();
        });
        ipcMain.on('close-excelLanguages', () => {
            App.excelLanguagesWindow.close();
        });
        ipcMain.on('close-splitFile', () => {
            App.splitFileWindow.close();
        });
        ipcMain.on('close-mergeFiles', () => {
            App.mergeFilesWindow.close();
        });
        ipcMain.on('close-replaceText', () => {
            App.replaceTextWindow.close();
        });
        ipcMain.on('close-addLanguage', () => {
            App.addLanguageWindow.close();
        });
        ipcMain.on('close-changeLanguage', () => {
            App.changeLanguageWindow.close();
        });
        ipcMain.on('close-removeLanguage', () => {
            App.removeLanguageWindow.close();
        });
        ipcMain.on('close-srcLanguage', () => {
            App.srcLanguageWindow.close();
        });
        ipcMain.on('close-removeSameAsSource', () => {
            App.removeSameAsSourceWindow.close();
        });
        ipcMain.on('close-removeUntranslated', () => {
            App.removeUntranslatedWindow.close();
        });
        ipcMain.on('close-consolidate', () => {
            App.consolidateWindow.close();
        });
        ipcMain.on('maintenance-dashboard', () => {
            App.showMaintenanceDashboard();
        });
        ipcMain.on('close-maintenance', () => {
            App.maintenanceWindow.close();
        });
        ipcMain.on('maintanance-tasks', (event: IpcMainEvent, arg: { tags: boolean, untranslated: boolean, duplicates: boolean, spaces: boolean, consolidate: boolean, sourceLanguage: string }) => {
            App.maintenanceTasks(arg);
        });
        ipcMain.on('close-updates', () => {
            App.updatesWindow.close();
        });
        ipcMain.on('get-versions', (event: IpcMainEvent) => {
            event.sender.send('set-versions', { current: app.getVersion(), latest: App.latestVersion });
        });
        ipcMain.on('download-latest', () => {
            App.downloadLatest();
        });
        ipcMain.on('release-history', () => {
            App.showReleaseHistory();
        });
    } // end constructor

    static mainLoaded(): void {
        if (App.argFile !== '') {
            App.openFile(App.argFile);
            App.argFile = '';
        }
    }

    static setHeight(arg: { window: string, width: number, height: number }): void {
        if (arg.window === 'newFile' && App.newFileWindow) {
            App.newFileWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'about' && App.aboutWindow) {
            App.aboutWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'systemInfo' && App.systemInfoWindow) {
            App.systemInfoWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'fileInfo' && App.fileInfoWindow) {
            App.fileInfoWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'licenses' && App.licensesWindow) {
            App.licensesWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'preferencesDialog' && App.settingsWindow) {
            App.settingsWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'attributes' && App.attributesWindow) {
            App.attributesWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'properties' && App.propertiesWindow) {
            App.propertiesWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'addProperty' && App.addPropertyWindow) {
            App.addPropertyWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'notes' && App.notesWindow) {
            App.notesWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'addNote' && App.addNotesWindow) {
            App.addNotesWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'convertTbx' && App.convertTBXWindow) {
            App.convertTBXWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'convertSdltm' && App.convertSDLTMWindow) {
            App.convertSDLTMWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'convertCsv' && App.convertCsvWindow) {
            App.convertCsvWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'convertExcel' && App.convertExcelWindow) {
            App.convertExcelWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'csvLanguages' && App.csvLanguagesWindow) {
            App.csvLanguagesWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'excelLanguages' && App.excelLanguagesWindow) {
            App.excelLanguagesWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'splitFile' && App.splitFileWindow) {
            App.splitFileWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'mergeFiles' && App.mergeFilesWindow) {
            App.mergeFilesWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'replaceText' && App.replaceTextWindow) {
            App.replaceTextWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'sortUnits' && App.sortUnitsWindow) {
            App.sortUnitsWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'filters' && App.filtersWindow) {
            App.filtersWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'addLanguage' && App.addLanguageWindow) {
            App.addLanguageWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'changeLanguage' && App.changeLanguageWindow) {
            App.changeLanguageWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'removeLanguage' && App.removeLanguageWindow) {
            App.removeLanguageWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'srcLanguage' && App.srcLanguageWindow) {
            App.srcLanguageWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'removeUntranslated' && App.removeUntranslatedWindow) {
            App.removeUntranslatedWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'removeSameAsSource' && App.removeSameAsSourceWindow) {
            App.removeSameAsSourceWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'consolidate' && App.consolidateWindow) {
            App.consolidateWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'maintenance' && App.maintenanceWindow) {
            App.maintenanceWindow.setContentSize(arg.width, arg.height, true);
        }
        if (arg.window === 'updates' && App.updatesWindow) {
            App.updatesWindow.setContentSize(arg.width, arg.height, true);
        }
    }

    static sendTooltips(event: IpcMainEvent): void {
        let tooltips: any = {
            'open': App.i18n.getString('menu', 'Open'),
            'new': App.i18n.getString('menu', 'New'),
            'save': App.i18n.getString('menu', 'Save'),
            'fileProperties': App.i18n.getString('menu', 'FileProperties'),
            'confirmEdit': App.i18n.getString('menu', 'ConfirmEdit'),
            'cancelEdit': App.i18n.getString('menu', 'CancelEdit'),
            'replaceText': App.i18n.getString('menu', 'ReplaceText'),
            'insertUnit': App.i18n.getString('menu', 'InsertUnit'),
            'deleteSelected': App.i18n.getString('menu', 'DeleteSelected'),
            'sortUnits': App.i18n.getString('menu', 'SortUnits'),
            'filterUnits': App.i18n.getString('menu', 'FilterUnits'),
            'maintenance': App.i18n.getString('menu', 'MaintenanceDashboard'),
            'convertCSV': App.i18n.getString('menu', 'ConvertCSV'),
            'convertExcel': App.i18n.getString('menu', 'ConvertExcel'),
            'convertSDLTM': App.i18n.getString('menu', 'ConvertSDLTM'),
            'convertTBX': App.i18n.getString('menu', 'ConvertTBX'),
            'userGuide': App.i18n.getString('menu', 'UserGuide'),
            'unitsLabel': App.i18n.getString('App', 'UnitsLabel'),
            'tuAttributes': App.i18n.getString('App', 'tuAttributes'),
            'tuProperties': App.i18n.getString('App', 'tuProperties'),
            'tuNotes': App.i18n.getString('App', 'tuNotes'),
            'editAttributes': App.i18n.getString('menu', 'EditAttributes'),
            'editProperties': App.i18n.getString('menu', 'EditProperties'),
            'editNotes': App.i18n.getString('menu', 'EditNotes'),
        };
        event.sender.send('set-tooltips', tooltips);
    }

    static showMessage(arg: any): void {
        let parent: BrowserWindow = App.mainWindow;
        if (arg.parent) {
            switch (arg.parent) {
                case 'preferences': parent = App.settingsWindow;
                    break;
                case 'replaceText': parent = App.replaceTextWindow;
                    break;
                case 'addNote': parent = App.addNotesWindow;
                    break;
                case 'addProperty': parent = App.addPropertyWindow;
                    break;
                case 'convertSDLTM': parent = App.convertSDLTMWindow;
                    break;
                case 'convertTBX': parent = App.convertTBXWindow;
                    break;
                case 'convertCSV': parent = App.convertCsvWindow;
                    break;
                case 'convertExcel': parent = App.convertExcelWindow;
                    break;
                case 'csvLanguages': parent = App.csvLanguagesWindow;
                    break;
                case 'excelLanguages': parent = App.excelLanguagesWindow;
                    break;
                case 'filters': parent = App.filtersWindow;
                    break;
                case 'mergeFiles': parent = App.mergeFilesWindow;
                    break;
                case 'newFile': parent = App.newFileWindow;
                    break;
                case 'searchReplace': parent = App.replaceTextWindow;
                    break;
                case 'splitFile': parent = App.splitFileWindow;
                    break;
                case 'changeLanguage': parent = App.changeLanguageWindow;
                    break;
                case 'addLanguage': parent = App.addLanguageWindow;
                    break;
                case 'fileInfo': parent = App.fileInfoWindow;
                    break;
                default: parent = App.mainWindow;
            }
        }
        if (arg.key) {
            arg.message = App.i18n.getString(arg.group, arg.key);
        }
        let params: any = {
            icon: this.iconPath,
            type: arg.type,
            message: arg.message,
            buttons: ['OK']
        };
        if (arg.titleKey) {
            params.title = App.i18n.getString(arg.group, arg.titleKey);
        }
        dialog.showMessageBoxSync(parent, params);
    }

    static createWindow(): void {
        App.iconPath = path.join(app.getAppPath(), 'images', 'tmxeditor.png');
        App.mainWindow = new BrowserWindow({
            title: 'TMXEditor',
            width: App.currentDefaults.width,
            height: App.currentDefaults.height,
            x: App.currentDefaults.x,
            y: App.currentDefaults.y,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            show: false,
            icon: App.iconPath
        });
        App.mainWindow.on('close', (ev) => {
            ev.preventDefault();
            App.close();
        });
        App.createMenu();
    }

    static createMenu(): void {
        const iconFolder: string = nativeTheme.shouldUseHighContrastColors ? 'dark' : (nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
        let fileMenu: Menu = Menu.buildFromTemplate([
            { label: App.i18n.getString('menu', 'New'), accelerator: 'CmdOrCtrl+N', click: () => { App.createNewFile(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'new.png') },
            { label: App.i18n.getString('menu', 'Open'), accelerator: 'CmdOrCtrl+O', click: () => { App.openFileDialog(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'open.png') },
            { label: App.i18n.getString('menu', 'Close'), accelerator: 'CmdOrCtrl+W', click: () => { App.closeFile(); } },
            { label: App.i18n.getString('menu', 'Save'), accelerator: 'CmdOrCtrl+s', click: () => { App.saveFile(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'save.png') },
            { label: App.i18n.getString('menu', 'SaveAs'), click: () => { App.saveAs() } },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'ConvertExcel'), click: () => { App.convertExcel(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'convertExcel.png') },
            { label: App.i18n.getString('menu', 'ExportExcel'), click: () => { App.exportExcel(); } },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'ConvertCSV'), click: () => { App.convertCSV(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'convertCSV.png') },
            { label: App.i18n.getString('menu', 'ExportCSV'), click: () => { App.exportDelimited(); } },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'ConvertSDLTM'), click: () => { App.convertSDLTM(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'convertSDLTM.png') },
            { label: App.i18n.getString('menu', 'ConvertTBX'), click: () => { App.convertTBX(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'convertTBX.png') },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'FileProperties'), click: () => { App.showFileInfo(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'fileInfo.png') },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'ValidateTMX'), click: () => { App.validateFile(); } },
            { label: App.i18n.getString('menu', 'CleanInvalidChars'), click: () => { App.cleanCharacters(); } },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'SplitTMX'), click: () => { App.splitFile(); } },
            { label: App.i18n.getString('menu', 'MergeTMX'), click: () => { App.mergeFiles(); } }
        ]);
        let editMenu: Menu = Menu.buildFromTemplate([
            { label: App.i18n.getString('menu', 'EditAttributes'), click: () => { App.editAttributes(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'edit.png') },
            { label: App.i18n.getString('menu', 'EditProperties'), click: () => { App.editProperties(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'edit.png') },
            { label: App.i18n.getString('menu', 'EditNotes'), click: () => { App.editNotes(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'edit.png') },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'ConfirmEdit'), accelerator: 'Alt+Enter', click: () => { App.saveEdits(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'confirmEdit.png') },
            { label: App.i18n.getString('menu', 'CancelEdit'), accelerator: 'Esc', click: () => { App.cancelEdit(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'cancelEdit.png') },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'ReplaceText'), accelerator: 'CmdOrCtrl+F', click: () => { App.replaceText(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'replaceText.png') },
            { label: App.i18n.getString('menu', 'InsertUnit'), click: () => { App.insertUnit(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'insertUnit.png') },
            { label: App.i18n.getString('menu', 'DeleteSelected'), click: () => { App.requestDeleteUnits(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'deleteUnit.png') },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'Undo'), accelerator: 'CmdOrCtrl+Z', click: () => { BrowserWindow.getFocusedWindow()?.webContents.undo(); } },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'Cut'), accelerator: 'CmdOrCtrl+X', click: () => { BrowserWindow.getFocusedWindow()?.webContents.cut(); } },
            { label: App.i18n.getString('menu', 'Copy'), accelerator: 'CmdOrCtrl+C', click: () => { BrowserWindow.getFocusedWindow()?.webContents.copy(); } },
            { label: App.i18n.getString('menu', 'Paste'), accelerator: 'CmdOrCtrl+V', click: () => { BrowserWindow.getFocusedWindow()?.webContents.paste(); } },
            { label: App.i18n.getString('menu', 'SelectAll'), accelerator: 'CmdOrCtrl+A', click: () => { BrowserWindow.getFocusedWindow()?.webContents.selectAll(); } }
        ]);
        let viewMenu: Menu = Menu.buildFromTemplate([
            { label: App.i18n.getString('menu', 'SortUnits'), accelerator: 'F5', click: () => { App.sortUnits(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'sort.png') },
            { label: App.i18n.getString('menu', 'FilterUnits'), accelerator: 'F3', click: () => { App.showFilters() }, icon: join(app.getAppPath(), 'images', iconFolder, 'filter.png') },
            new MenuItem({ type: 'separator' }),
            new MenuItem({ label: App.i18n.getString('menu', 'ToggleFullScreen'), role: 'togglefullscreen' })
        ]);
        if (!app.isPackaged) {
            viewMenu.append(new MenuItem({
                label: App.i18n.getString('menu', 'ToggleDeveloperTools'), accelerator: 'F12', role: 'toggleDevTools', click: () => {
                    BrowserWindow.getFocusedWindow()?.webContents.toggleDevTools();
                }
            }));
        }
        let tasksMenu: Menu = Menu.buildFromTemplate([
            { label: App.i18n.getString('menu', 'ChangeLanguage'), click: () => { App.changeLanguageCode(); } },
            { label: App.i18n.getString('menu', 'AddLanguage'), click: () => { App.showAddLanguage(); } },
            { label: App.i18n.getString('menu', 'RemoveLanguage'), click: () => { App.showRemoveLanguage() } },
            { label: App.i18n.getString('menu', 'ChangeSourceLanguage'), click: () => { App.showChangeSourceLanguage(); } },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'MaintenanceDashboard'), click: () => { App.showMaintenanceDashboard(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'maintenance.png') },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'RemoveTags'), click: () => { App.removeTags(); } },
            { label: App.i18n.getString('menu', 'RemoveDuplicates'), click: () => { App.removeDuplicates(); } },
            { label: App.i18n.getString('menu', 'RemoveUntranslated'), click: () => { App.showRemoveUntranslated(); } },
            { label: App.i18n.getString('menu', 'RemoveSameAsSource'), click: () => { App.showRemoveSameAsSource(); } },
            { label: App.i18n.getString('menu', 'RemoveSpaces'), click: () => { App.removeSpaces(); } },
            { label: App.i18n.getString('menu', 'ConsolidateUnits'), click: () => { App.showConsolidateUnits(); } }
        ]);
        let helpMenu: Menu = Menu.buildFromTemplate([
            { label: App.i18n.getString('menu', 'UserGuide'), accelerator: 'F1', click: () => { App.showHelp(); }, icon: join(app.getAppPath(), 'images', iconFolder, 'help.png') },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'CheckForUpdates'), click: () => { App.checkUpdates(false); } },
            { label: App.i18n.getString('menu', 'ViewLicenses'), click: () => { App.showLicenses({ from: 'menu' }); } },
            new MenuItem({ type: 'separator' }),
            { label: App.i18n.getString('menu', 'ReleaseHistory'), click: () => { App.showReleaseHistory(); } },
            { label: App.i18n.getString('menu', 'SupportGroup'), click: () => { App.showSupportGroup(); } }
        ]);
        let template: MenuItem[] = [
            new MenuItem({ label: App.i18n.getString('menu', 'FileMenu'), role: 'fileMenu', submenu: fileMenu }),
            new MenuItem({ label: App.i18n.getString('menu', 'EditMenu'), role: 'editMenu', submenu: editMenu }),
            new MenuItem({ label: App.i18n.getString('menu', 'ViewMenu'), role: 'viewMenu', submenu: viewMenu }),
            new MenuItem({ label: App.i18n.getString('menu', 'TasksMenu'), submenu: tasksMenu }),
            new MenuItem({ label: App.i18n.getString('menu', 'HelpMenu'), role: 'help', submenu: helpMenu })
        ];
        if (process.platform === 'darwin') {
            let appleMenu: Menu = Menu.buildFromTemplate([
                new MenuItem({ label: App.i18n.getString('menu', 'About'), click: () => { App.showAbout(); } }),
                new MenuItem({
                    label: App.i18n.getString('menu', 'Preferences'), submenu: [
                        { label: App.i18n.getString('menu', 'Settings'), accelerator: 'Cmd+,', click: () => { App.showSettings(); } }
                    ]
                }),
                new MenuItem({ type: 'separator' }),
                new MenuItem({
                    label: App.i18n.getString('menu', 'Services'), role: 'services', submenu: [
                        { label: App.i18n.getString('menu', 'NoServicesApply'), enabled: false }
                    ]
                }),
                new MenuItem({ type: 'separator' }),
                new MenuItem({ label: App.i18n.getString('menu', 'AppleQuit'), accelerator: 'Cmd+Q', role: 'quit', click: () => { App.close(); } })
            ]);
            template.unshift(new MenuItem({ label: app.getName(), role: 'appMenu', submenu: appleMenu }));
        } else {
            let help: MenuItem | undefined = template.pop();
            template.push(new MenuItem({
                label: App.i18n.getString('menu', 'SettingsMenu'), submenu: [
                    { label: App.i18n.getString('menu', 'Preferences'), click: () => { App.showSettings(); } }
                ]
            }));
            if (help) {
                template.push(help);
            }
        }
        if (!existsSync(path.join(app.getPath('appData'), app.name, 'recent.json'))) {
            writeFile(path.join(app.getPath('appData'), app.name, 'recent.json'), '{"files" : []}', (err) => {
                if (err instanceof Error) {
                    App.showMessage({ type: 'error', message: err.message });
                }
            });
        }
        readFile(path.join(app.getPath('appData'), app.name, 'recent.json'), (err, buf: Buffer) => {
            if (err instanceof Error) {
                Menu.setApplicationMenu(Menu.buildFromTemplate(template));
                App.clearSecondaryMenus();
                return;
            }
            let files: string[] | undefined;
            try {
                files = JSON.parse(buf.toString()).files;
            } catch (error) {
                files = undefined;
            }
            if (files !== undefined && files.length > 0) {
                if (process.platform === 'darwin') {
                    let item: MenuItem = template[1];
                    if (item.submenu) {
                        item.submenu.append(new MenuItem({ type: 'separator' }));
                    }
                } else {
                    let item: MenuItem = template[0];
                    if (item.submenu) {
                        item.submenu.append(new MenuItem({ type: 'separator' }));
                    }
                }
                for (let file of files) {
                    if (existsSync(file)) {
                        if (process.platform === 'darwin') {
                            if (template[1].submenu) {
                                template[1].submenu.append(new MenuItem({ label: file, click: () => { App.openFile(file); } }));
                            }
                        } else if (template[0].submenu) {
                            template[0].submenu.append(new MenuItem({ label: file, click: () => { App.openFile(file); } }));
                        }
                    }
                }
            }
            if (process.platform === 'win32') {
                if (template[0].submenu) {
                    template[0].submenu.append(new MenuItem({ type: 'separator' }));
                    template[0].submenu.append(new MenuItem({ label: App.i18n.getString('menu', 'WindowsQuit'), accelerator: 'Alt+F4', role: 'quit', click: () => { App.close(); } }));
                }
                if (template[5].submenu) {
                    template[5].submenu.append(new MenuItem({ type: 'separator' }));
                    template[5].submenu.append(new MenuItem({ label: App.i18n.getString('menu', 'About'), click: () => { App.showAbout(); } }));
                }
            }
            if (process.platform === 'linux') {
                if (template[0].submenu) {
                    template[0].submenu.append(new MenuItem({ type: 'separator' }));
                    template[0].submenu.append(new MenuItem({ label: App.i18n.getString('menu', 'LinuxQuit'), accelerator: 'Ctrl+Q', role: 'quit', click: () => { App.close(); } }));
                }
                if (template[5].submenu) {
                    template[5].submenu.append(new MenuItem({ type: 'separator' }));
                    template[5].submenu.append(new MenuItem({ label: App.i18n.getString('menu', 'About'), click: () => { App.showAbout(); } }));
                }
            }
            Menu.setApplicationMenu(Menu.buildFromTemplate(template));
            App.clearSecondaryMenus();
        });
    }

    static clearSecondaryMenus(): void {
        for (let window of BrowserWindow.getAllWindows()) {
            if (window !== App.mainWindow) {
                window.setMenu(null);
            }
        }
    }

    static close(): void {
        if (App.currentFile !== '' && !App.saved) {
            let clicked: number = dialog.showMessageBoxSync(App.mainWindow, {
                type: 'question',
                title: App.i18n.getString('App', 'SaveChanges'),
                message: App.i18n.getString('App', 'UnsavedWarning'),
                buttons: [
                    App.i18n.getString('App', 'DontSave'),
                    App.i18n.getString('App', 'Cancel'),
                    App.i18n.getString('App', 'Save')
                ],
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

    static adminLanguages(): Language[] {
        let result: Language[] = App.fileLanguages.slice(0);
        result.unshift({ code: '*all*', name: App.i18n.getString('App', 'anyLanguage') });
        return result;
    }

    static showAbout(): void {
        if (App.aboutWindow && !App.aboutWindow.isDestroyed()) {
            App.aboutWindow.focus();
            return;
        }
        App.aboutWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 620,
            height: 340,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.aboutWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'about.html');
        let url: URL = new URL('file://' + filePath);
        App.aboutWindow.loadURL(url.href);
        App.aboutWindow.once('ready-to-show', () => {
            App.aboutWindow.show();
        });
        App.aboutWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.aboutWindow, 'about.html');
    }

    static showSystemInfo(): void {
        this.systemInfoWindow = new BrowserWindow({
            parent: App.aboutWindow,
            width: 430,
            height: 240,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: this.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        this.systemInfoWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'systemInfo.html');
        let url: URL = new URL('file://' + filePath);
        App.systemInfoWindow.loadURL(url.href);
        this.systemInfoWindow.once('ready-to-show', () => {
            this.systemInfoWindow.show();
        });
        this.systemInfoWindow.on('close', () => {
            App.aboutWindow.focus();
        });
        App.setLocation(App.systemInfoWindow, 'systemInfo.html');
    }

    static getSystemInformation(event: IpcMainEvent): void {
        let data: Record<string, string> = {
            tmxeditor: app.getVersion(),
            electron: process.versions.electron
        };
        for (let name of ['sdltm', 'typesbcp47', 'typesexcel', 'typesxml']) {
            data[name] = App.getModuleVersion(name);
        }
        event.sender.send('set-system-info', data);
    }

    static getModuleVersion(moduleName: string): string {
        let packageFile: string = path.join(app.getAppPath(), 'node_modules', moduleName, 'package.json');
        let json: { version: string } = JSON.parse(readFileSync(packageFile, 'utf8'));
        return json.version;
    }

    static showLicenses(arg: any): void {
        let parent: BrowserWindow = App.mainWindow;
        if (arg.from === 'about' && App.aboutWindow) {
            parent = App.aboutWindow;
        }
        App.licensesWindow = new BrowserWindow({
            parent: parent,
            width: 460,
            height: 240,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.licensesWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'licenses.html');
        let url: URL = new URL('file://' + filePath);
        App.licensesWindow.loadURL(url.href);
        App.licensesWindow.once('ready-to-show', () => {
            App.licensesWindow.show();
        });
        App.licensesWindow.on('close', () => {
            parent.focus();
        });
        App.setLocation(App.licensesWindow, 'licenses.html');
    }

    static openLicense(type: string): void {
        let licenseFile = '';
        let title = '';
        switch (type) {
            case 'TMXEditor':
            case "sdltm":
            case "typesbcp47":
            case "typesexcel":
            case "typesxml":
                licenseFile = 'EclipsePublicLicense1.0.html';
                title = 'Eclipse Public License 1.0';
                break;
            case "electron":
                licenseFile = 'electron.txt';
                title = 'MIT License';
                break;
            default:
                App.showMessage({ type: 'error', message: App.i18n.getString('app', 'unknownLicense') });
                return;
        }
        let licenseWindow = new BrowserWindow({
            parent: App.licensesWindow,
            width: 780,
            height: 480,
            show: false,
            title: title,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        licenseWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', 'licenses', licenseFile);
        let url: URL = new URL('file://' + filePath);
        licenseWindow.loadURL(url.href);
        licenseWindow.once('ready-to-show', () => {
            licenseWindow.show();
        });
        licenseWindow.webContents.on('did-finish-load', () => {
            readFile(App.currentCss.substring('file://'.length), (error, data: Buffer) => {
                if (!error) {
                    licenseWindow.webContents.insertCSS(data.toString());
                }
            });
        });
        licenseWindow.on('close', () => {
            App.licensesWindow.focus();
        });
        App.setLocation(licenseWindow, 'license.html');
    }

    static showHelp(): void {
        let path = join(app.getAppPath(), 'tmxeditor_' + App.lang + '.pdf');
        if (process.platform === 'linux' && path.startsWith('/opt')) {
            let tempFolder: string = join(app.getPath('home'), 'tmp', 'tmxeditor');
            if (!existsSync(tempFolder)) {
                mkdirSync(tempFolder, { recursive: true });
            }
            let tempFile: string = join(tempFolder, basename(path));
            try {
                copyFileSync(path, tempFile);
                path = tempFile;
            } catch (error: unknown) {
                console.error('Error copying file:', error);
                if (error instanceof Error) {
                    App.showMessage({ type: 'error', message: error.message });
                }
                return;
            }
        }
        shell.openExternal('file://' + path).catch(() => {
            shell.openPath(path).catch((reason: any) => {
                if (reason instanceof Error) {
                    console.error(reason.message);
                    App.showMessage({ type: 'error', message: reason.message });
                }
            });
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
            console.error(error);
        });
    }

    static modelDatabasePath(): string {
        return path.join(app.getPath('appData'), app.name, 'tmxmodel.db');
    }

    static openModel(file: string, onProgress: (count: number) => void): Promise<TMXModel> {
        let databasePath: string = App.modelDatabasePath();
        for (let suffix of ['', '-wal', '-shm']) {
            if (existsSync(databasePath + suffix)) {
                unlinkSync(databasePath + suffix);
            }
        }
        TmxUtils.setWorkFolder(path.join(app.getPath('appData'), app.name));
        TmxUtils.resetTags();
        let workerPath: string = path.join(app.getAppPath(), 'js', 'tmx', 'tmxImportWorker.js');
        let catalogFile: string = path.join(app.getAppPath(), 'catalog', 'catalog.xml');
        return TMXModel.open(file, databasePath, workerPath, catalogFile, onProgress, App.currentPreferences.changeId);
    }

    static openFile(file: string, needsName: boolean = false): void {
        if (App.currentFile !== '' && App.editingCell.id) {
            App.waitingForEditCheck = true;
            App.pendingEditCheckResume = (changed: boolean) => App.completeOpen(file, needsName, changed);
            App.mainWindow.webContents.send('query-edit-changed');
            return;
        }
        App.completeOpen(file, needsName, false);
    }

    static completeOpen(file: string, needsName: boolean, hasUnconfirmedEdit: boolean): void {
        if (App.currentFile !== '' && (!App.saved || hasUnconfirmedEdit)) {
            let clicked: number = dialog.showMessageBoxSync(App.mainWindow, {
                type: 'question',
                title: App.i18n.getString('App', 'SaveChanges'),
                message: App.i18n.getString('App', 'UnsavedWarning'),
                buttons: [
                    App.i18n.getString('App', 'DontSave'),
                    App.i18n.getString('App', 'Cancel'),
                    App.i18n.getString('App', 'Save')
                ],
                defaultId: 2
            });
            if (clicked === 1) {
                return;
            }
            if (clicked === 2) {
                App.fileToOpen = file;
                App.fileToOpenNeedsName = needsName;
                if (hasUnconfirmedEdit) {
                    App.waitingForEditFlush = true;
                    App.mainWindow.webContents.send('force-save');
                } else {
                    App.saveFile();
                }
                return;
            }
        }
        if (App.model) {
            App.model.close();
            App.model = null;
        }
        App.editingCell = {};
        App.mainWindow.webContents.send('file-closed');
        App.needsName = needsName;
        App.mainWindow.webContents.send('start-waiting');
        App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'OpeningFile'));
        App.openModel(file, (count: number) => {
            App.mainWindow.webContents.send('set-status', App.i18n.format(App.i18n.getString('App', 'LoadedUnits'), ['' + count]));
        }).then((model: TMXModel) => {
            App.model = model;
            App.getFileLanguages();
            App.filterOptions = {};
            App.sortOptions = {};
            App.currentFile = file;
            if (App.needsName) {
                App.mainWindow.setTitle(App.i18n.getString('App', 'untitled'));
                App.saved = false;
                App.mainWindow.setDocumentEdited(true);
            } else {
                App.mainWindow.setTitle(App.currentFile);
                App.saved = true;
                App.mainWindow.setDocumentEdited(false);
            }
            App.mainWindow.webContents.send('set-status', '');
            App.mainWindow.webContents.send('end-waiting');
            App.mainWindow.webContents.send('file-loaded', { status: SUCCESS, count: model.getCount() });
        }).catch((error: Error) => {
            App.mainWindow.webContents.send('end-waiting');
            App.mainWindow.webContents.send('set-status', '');
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    static closeFile(onClosed?: () => void): void {
        if (App.currentFile === '') {
            if (onClosed) {
                onClosed();
            }
            return;
        }
        if (App.editingCell.id) {
            App.waitingForEditCheck = true;
            App.pendingEditCheckResume = (changed: boolean) => App.completeClose(onClosed, changed);
            App.mainWindow.webContents.send('query-edit-changed');
            return;
        }
        App.completeClose(onClosed, false);
    }

    static completeClose(onClosed: (() => void) | undefined, hasUnconfirmedEdit: boolean): void {
        if (!App.saved || hasUnconfirmedEdit) {
            let clicked: number = dialog.showMessageBoxSync(App.mainWindow, {
                type: 'question',
                title: App.i18n.getString('App', 'SaveChanges'),
                message: App.i18n.getString('App', 'UnsavedWarning'),
                buttons: [
                    App.i18n.getString('App', 'DontSave'),
                    App.i18n.getString('App', 'Cancel'),
                    App.i18n.getString('App', 'Save')
                ],
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
                App.onFileClosed = onClosed;
                if (hasUnconfirmedEdit) {
                    App.waitingForEditFlush = true;
                    App.mainWindow.webContents.send('force-save');
                } else {
                    App.saveFile();
                }
                return;
            }
        }
        App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'ClosingFile'));
        App.mainWindow.webContents.send('start-waiting');
        if (App.model) {
            App.model.close();
            App.model = null;
        }
        App.editingCell = {};
        App.mainWindow.webContents.send('end-waiting');
        App.mainWindow.webContents.send('file-closed');
        App.mainWindow.webContents.send('set-status', '');
        App.currentFile = '';
        App.mainWindow.setTitle(app.getName());
        App.saved = true;
        App.mainWindow.setDocumentEdited(false);
        if (onClosed) {
            onClosed();
        }
    }

    static describeLanguage(code: string): string {
        let language = LanguageUtils.getLanguage(code, App.lang);
        if (language) {
            return language.getDescription();
        }
        let normalized: string = code.replace('_', '-');
        if (normalized.indexOf('-') !== -1) {
            let primary: string = normalized.split('-')[0];
            let base = LanguageUtils.getLanguage(primary, App.lang);
            if (base) {
                return base.getDescription();
            }
        }
        return code;
    }

    static getFileLanguages(): void {
        App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'GettingLanguages'));
        if (!App.model) {
            App.mainWindow.webContents.send('set-status', '');
            return;
        }
        let codes: string[] = App.model.getLanguages();
        let result: Language[] = [];
        for (let code of codes) {
            result.push({ code: code, name: App.describeLanguage(code) });
        }
        App.fileLanguages = result;
        App.mainWindow.webContents.send('set-status', '');
        App.mainWindow.webContents.send('update-languages', App.fileLanguages);
    }

    static saveDefaults(): void {
        let defaults: Electron.Rectangle = App.mainWindow.getBounds();
        writeFileSync(path.join(app.getPath('appData'), app.name, 'defaults.json'), JSON.stringify(defaults, undefined, 4));
    }

    static loadSegments(): void {
        if (App.currentFile === '' || !App.model) {
            return;
        }
        let start: number = App.loadOptions.start ?? 0;
        let count: number = App.loadOptions.count ?? 200;
        let filter: SegmentFilter = {};
        Object.assign(filter, App.filterOptions);
        Object.assign(filter, App.sortOptions);
        App.mainWindow.webContents.send('start-waiting');
        App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'LoadingSegments'));
        try {
            let units: string[] = App.model.getSegments(start, count, filter);
            App.mainWindow.webContents.send('set-status', '');
            App.mainWindow.webContents.send('end-waiting');
            App.mainWindow.webContents.send('update-segments', { status: SUCCESS, units: units });
        } catch (error: any) {
            App.mainWindow.webContents.send('end-waiting');
            App.showMessage({ type: 'error', message: error.message });
        }
    }

    static loadDefaults(): void {
        App.currentDefaults = { width: 950, height: 700, x: 0, y: 0 };
        if (existsSync(path.join(app.getPath('appData'), app.name, 'defaults.json'))) {
            try {
                let data: Buffer = readFileSync(path.join(app.getPath('appData'), app.name, 'defaults.json'));
                App.currentDefaults = JSON.parse(data.toString());
            } catch (err) {
                console.error(err);
            }
        }
    }

    static savePreferences(preferences: Preferences): void {
        writeFileSync(path.join(app.getPath('appData'), app.name, 'preferences.json'), JSON.stringify(preferences, undefined, 4));
        if (app.isReady() && preferences.appLang !== App.lang) {
            dialog.showMessageBox({
                type: 'question',
                message: App.i18n.getString('App', 'languageChanged'),
                buttons: [App.i18n.getString('App', 'restart'), App.i18n.getString('App', 'dismiss')],
                cancelId: 1
            }).then((value: MessageBoxReturnValue) => {
                if (value.response == 0) {
                    app.relaunch();
                    app.quit();
                }
            });
        }
        App.currentPreferences = preferences;
        App.currentCss = App.resolveThemeCss(preferences.theme);
        BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
            window.webContents.send('set-theme', App.currentCss);
        });
    }

    static resolveThemeCss(theme: string): string {
        let dark: string = 'file://' + path.join(app.getAppPath(), 'css', 'dark.css');
        let light: string = 'file://' + path.join(app.getAppPath(), 'css', 'light.css');
        let highContrast: string = 'file://' + path.join(app.getAppPath(), 'css', 'highcontrast.css');
        if (theme === 'system') {
            let css: string = nativeTheme.shouldUseDarkColors ? dark : light;
            if (nativeTheme.shouldUseHighContrastColors) {
                css = highContrast;
            }
            return css;
        }
        if (theme === 'dark') {
            return dark;
        }
        if (theme === 'highcontrast') {
            return highContrast;
        }
        return light;
    }

    static loadPreferences(): void {
        let dark: string = 'file://' + path.join(app.getAppPath(), 'css', 'dark.css');
        let light: string = 'file://' + path.join(app.getAppPath(), 'css', 'light.css');
        let highContrast: string = 'file://' + path.join(app.getAppPath(), 'css', 'highcontrast.css');
        let oldCss: string = App.currentCss;
        let preferencesFile: string = path.join(app.getPath('appData'), app.name, 'preferences.json');
        if (!existsSync(preferencesFile)) {
            let locales: string[] = app.getPreferredSystemLanguages();
            let appLang: string = 'en';
            if (locales.length > 0) {
                if (locales[0].startsWith('es')) {
                    appLang = 'es';
                }
                if (locales[0].startsWith('fr')) {
                    appLang = 'fr';
                }
            }
            this.savePreferences({ theme: 'system', indentation: 2, appLang: appLang, changeId: false });
        }
        try {
            let data: Buffer = readFileSync(preferencesFile);
            let json: any = JSON.parse(data.toString());
            if (!json.appLang) {
                json.appLang = 'en';
            }
            if (!json.changeId) {
                json.changeId = false;
            }
            App.currentPreferences = json;
            App.lang = App.currentPreferences.appLang;
        } catch (err) {
            console.error(err);
        }
        App.currentCss = App.resolveThemeCss(App.currentPreferences.theme);
        if ((oldCss === dark || oldCss === light) && App.currentCss === highContrast) {
            App.deleteAllTags('#003e66;', '#ffffff');
        }
        if (oldCss === highContrast && (App.currentCss === light || App.currentCss === dark)) {
            App.deleteAllTags('#009688', '#ffffff');
        }
    }

    static deleteAllTags(background: string, foreground: string): void {
        let tagsFolder: string = path.join(app.getPath('userData'), 'images');
        if (existsSync(tagsFolder)) {
            rmSync(tagsFolder, { recursive: true, force: true });
        }
        mkdirSync(tagsFolder);
        let colors: any = { background: background, foreground: foreground };
        writeFileSync(path.join(app.getPath('userData'), 'images', 'tagColors.json'), JSON.stringify(colors, null, 2));
        if (app.isReady()) {
            App.showMessage({ type: 'info', message: App.i18n.getString('App', 'tagColors') });
        }
    }

    static saveRecent(file: string): void {
        readFile(path.join(app.getPath('appData'), app.name, 'recent.json'), (err, data: Buffer) => {
            if (err instanceof Error) {
                return;
            }
            let jsonData: { files: string[] };
            try {
                jsonData = JSON.parse(data.toString());
            } catch (error) {
                jsonData = { files: [] };
            }
            if (!Array.isArray(jsonData.files)) {
                jsonData.files = [];
            }
            jsonData.files = jsonData.files.filter((f: string) => {
                return f !== file;
            });
            jsonData.files.unshift(file);
            if (jsonData.files.length > 8) {
                jsonData.files = jsonData.files.slice(0, 8);
            }
            writeFile(path.join(app.getPath('appData'), app.name, 'recent.json'), JSON.stringify(jsonData, undefined, 4), (error) => {
                if (error instanceof Error) {
                    App.showMessage({ type: 'error', message: error.message });
                }
            });
        });
        app.addRecentDocument(file);
    }

    static getCellProperties(id: string, lang: string): void {
        if (!App.model) {
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        try {
            let data: any = App.model.getTuvData(id, lang);
            data.status = SUCCESS;
            App.mainWindow.webContents.send('end-waiting');
            data.type = lang;
            let attributesLabel: string = App.i18n.getString('App', 'langAttributes');
            let propertiesLabel: string = App.i18n.getString('App', 'langProperties');
            let notesLabel: string = App.i18n.getString('App', 'langNotes');
            data.attributesType = App.i18n.format(attributesLabel, [lang]);
            data.propertiesType = App.i18n.format(propertiesLabel, [lang]);
            data.notesType = App.i18n.format(notesLabel, [lang]);
            App.mainWindow.webContents.send('update-properties', data);
        } catch (error) {
            App.mainWindow.webContents.send('end-waiting');
            App.showMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    }

    static getRowProperties(id: string): void {
        if (!App.model) {
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        try {
            let tuData: TuData | undefined = App.model.getTuData(id);
            App.mainWindow.webContents.send('end-waiting');
            if (tuData) {
                let data: any = tuData;
                data.status = SUCCESS;
                data.type = 'TU';
                data.attributesType = App.i18n.getString('App', 'tuAttributes');
                data.propertiesType = App.i18n.getString('App', 'tuProperties');
                data.notesType = App.i18n.getString('App', 'tuNotes');
                App.mainWindow.webContents.send('update-properties', data);
            } else {
                App.showMessage({ type: 'error', message: 'null tu' });
            }
        } catch (error) {
            App.mainWindow.webContents.send('end-waiting');
            App.showMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    }

    editAttributes(arg: any): void {
        App.attributesWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 700,
            height: 390,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.attributesArg = arg;
        App.attributesWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'attributes.html');
        let url: URL = new URL('file://' + filePath);
        App.attributesWindow.loadURL(url.href);
        App.attributesWindow.once('ready-to-show', () => {
            App.attributesWindow.show();
        });
        App.attributesWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.attributesWindow, 'attributes.html');
    }

    saveAttributes(arg: any): void {
        App.mainWindow.webContents.send('start-waiting');
        App.attributesWindow.close();
        if (App.model) {
            try {
                App.model.setAttributes(arg.id, arg.lang, arg.attributes);
                if (arg.lang === '') {
                    App.getRowProperties(arg.id);
                } else {
                    App.getCellProperties(arg.id, arg.lang);
                }
                App.saved = false;
                App.mainWindow.setDocumentEdited(true);
            } catch (error) {
                App.showMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
            }
        }
        App.mainWindow.webContents.send('end-waiting');
    }

    editProperties(arg: any): void {
        App.propertiesWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 500,
            height: 280,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        arg.removeText = App.i18n.getString('App', 'RemoveProperties');
        App.propertiesArg = arg;
        App.propertiesWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'properties.html');
        let url: URL = new URL('file://' + filePath);
        App.propertiesWindow.loadURL(url.href);
        App.propertiesWindow.once('ready-to-show', () => {
            App.propertiesWindow.show();
        });
        App.propertiesWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.propertiesWindow, 'properties.html');
    }

    static showAddProperty(event: IpcMainEvent, parent: string): void {
        App.propertyEvent = event;
        App.addPropertyWindow = new BrowserWindow({
            parent: (parent === 'fileInfo' ? App.fileInfoWindow : App.propertiesWindow),
            width: 350,
            height: 150,
            minimizable: false,
            maximizable: false,
            resizable: false,
            modal: true,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.addPropertyWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'addProperty.html');
        let url: URL = new URL('file://' + filePath);
        App.addPropertyWindow.loadURL(url.href);
        App.addPropertyWindow.once('ready-to-show', () => {
            App.addPropertyWindow.show();
        });
        App.addPropertyWindow.on('close', () => {
            App.addPropertyWindow.getParentWindow()?.focus();
        });
        App.setLocation(App.addPropertyWindow, 'addProperty.html');
    }

    addNewProperty(arg: any): void {
        App.addPropertyWindow.close();
        App.propertyEvent.sender.send('set-new-property', arg);
    }

    saveProperties(arg: any): void {
        App.mainWindow.webContents.send('start-waiting');
        App.propertiesWindow.close();
        if (App.model) {
            try {
                App.model.setProperties(arg.id, arg.lang, arg.properties);
                if (arg.lang === '') {
                    App.getRowProperties(arg.id);
                } else {
                    App.getCellProperties(arg.id, arg.lang);
                }
                App.saved = false;
                App.mainWindow.setDocumentEdited(true);
            } catch (error) {
                App.showMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
            }
        }
        App.mainWindow.webContents.send('end-waiting');
    }

    static showNotesPanel(arg: any): void {
        App.notesWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 500,
            height: 280,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        arg.removeText = App.i18n.getString('App', 'RemoveNotes');
        App.notesArg = arg;
        App.notesWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'notes.html');
        let url: URL = new URL('file://' + filePath);
        App.notesWindow.loadURL(url.href);
        App.notesWindow.once('ready-to-show', () => {
            App.notesWindow.show();
        });
        App.notesWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.notesWindow, 'notes.html');
    }

    showAddNote(parent: string): void {
        App.addNotesWindow = new BrowserWindow({
            parent: parent === 'fileInfo' ? App.fileInfoWindow : App.notesWindow,
            width: 350,
            height: 100,
            minimizable: false,
            maximizable: false,
            resizable: false,
            modal: true,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.addNotesWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'addNote.html');
        let url: URL = new URL('file://' + filePath);
        App.addNotesWindow.loadURL(url.href);
        App.addNotesWindow.once('ready-to-show', () => {
            App.addNotesWindow.show();
        });
        App.addNotesWindow.on('close', () => {
            App.addNotesWindow.getParentWindow()?.focus();
        });
        App.setLocation(App.addNotesWindow, 'addNote.html');
    }

    addNewNote(note: string): void {
        App.addNotesWindow.getParentWindow()?.webContents.send('set-new-note', note);
        App.addNotesWindow.close();
    }

    saveNotes(arg: any): void {
        App.mainWindow.webContents.send('start-waiting');
        App.notesWindow.close();
        if (App.model) {
            App.model.setNotes(arg.id, arg.lang, arg.notes);
            if (arg.lang === '') {
                App.getRowProperties(arg.id);
            } else {
                App.getCellProperties(arg.id, arg.lang);
            }
            App.saved = false;
            App.mainWindow.setDocumentEdited(true);
        }
        App.mainWindow.webContents.send('end-waiting');
    }

    static showSettings(): void {
        App.settingsWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 500,
            height: 220,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.settingsWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'preferences.html');
        let url: URL = new URL('file://' + filePath);
        App.settingsWindow.loadURL(url.href);
        App.settingsWindow.once('ready-to-show', () => {
            App.settingsWindow.show();
        });
        App.settingsWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.settingsWindow, 'preferences.html');
    }

    static setTheme(): void {
        App.mainWindow.webContents.send('request-theme');
    }

    static createNewFile(): void {
        if (App.newFileWindow && !App.newFileWindow.isDestroyed()) {
            App.newFileWindow.focus();
            return;
        }
        App.newFileWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 480,
            height: 150,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.newFileWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'newFile.html');
        let url: URL = new URL('file://' + filePath);
        App.newFileWindow.loadURL(url.href);
        App.newFileWindow.once('ready-to-show', () => {
            App.newFileWindow.show();
        });
        App.newFileWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.newFileWindow, 'newFile.html');
    }

    createFile(srcLang: string, tgtLang: string): void {
        App.newFileWindow.close();
        if (App.currentFile !== '' && !App.saved) {
            let response: number = dialog.showMessageBoxSync(App.mainWindow, {
                type: 'question',
                message: App.i18n.getString('App', 'SaveChanges'),
                buttons: [App.i18n.getString('App', 'Yes'), App.i18n.getString('App', 'No')]
            });
            if (response === 0) {
                App.saveFile();
            }
        }
        try {
            let content: string = TmxUtils.newFileContent(srcLang, tgtLang, app.name, app.getVersion());
            let tempFile: string = path.join(app.getPath('temp'), 'temp' + Date.now() + '.tmx');
            writeFileSync(tempFile, content, 'utf8');
            App.openFile(tempFile, true);
        } catch (error) {
            App.showMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    }

    static saveFile(): void {
        if (App.currentFile === '') {
            return;
        }
        if (App.needsName) {
            App.saveAs();
            return;
        }
        App.writeFile();
    }

    static writeFile(): void {
        if (!App.model) {
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'Saving'));
        try {
            App.model.saveFile(App.currentFile);
            App.saved = true;
            App.mainWindow.setDocumentEdited(false);
            App.mainWindow.webContents.send('end-waiting');
            App.mainWindow.webContents.send('set-status', '');
            if (App.shouldClose) {
                App.shouldClose = false;
                let onClosed: (() => void) | undefined = App.onFileClosed;
                App.onFileClosed = undefined;
                App.closeFile(onClosed);
            }
            if (App.fileToOpen !== '') {
                let file: string = App.fileToOpen;
                let needsName: boolean = App.fileToOpenNeedsName;
                App.fileToOpen = '';
                App.fileToOpenNeedsName = false;
                App.openFile(file, needsName);
            }
            if (App.shouldQuit) {
                app.quit();
            }
        } catch (error) {
            App.mainWindow.webContents.send('end-waiting');
            App.mainWindow.webContents.send('set-status', '');
            App.showMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    }

    static saveAs(): void {
        dialog.showSaveDialog({
            title: App.i18n.getString('App', 'SaveTMX'),
            properties: ['showOverwriteConfirmation', 'createDirectory'],
            filters: [
                { name: App.i18n.getString('App', 'TMXFile'), extensions: ['tmx'] },
                { name: App.i18n.getString('App', 'AnyFile'), extensions: ['*'] }
            ]
        }).then((value: SaveDialogReturnValue) => {
            if (!value.canceled && value.filePath) {
                App.currentFile = value.filePath;
                App.needsName = false;
                App.mainWindow.setTitle(App.currentFile);
                App.saveRecent(App.currentFile);
                App.saveFile();
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    static convertCSV(): void {
        App.convertCsvWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 700,
            height: 530,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.convertCsvWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'convertCSV.html');
        let url: URL = new URL('file://' + filePath);
        App.convertCsvWindow.loadURL(url.href);
        App.convertCsvWindow.once('ready-to-show', () => {
            App.convertCsvWindow.show();
        });
        App.convertCsvWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.convertCsvWindow, 'convertCSV.html');
    }

    static convertTBX(): void {
        App.convertTBXWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 700,
            height: 200,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.convertTBXWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'convertTBX.html');
        let url: URL = new URL('file://' + filePath);
        App.convertTBXWindow.loadURL(url.href);
        App.convertTBXWindow.once('ready-to-show', () => {
            App.convertTBXWindow.show();
        });
        App.convertTBXWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.convertTBXWindow, 'convert.html');
    }

    static convertSDLTM(): void {
        App.convertSDLTMWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 700,
            height: 200,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.convertSDLTMWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'convertSDLTM.html');
        let url: URL = new URL('file://' + filePath);
        App.convertSDLTMWindow.loadURL(url.href);
        App.convertSDLTMWindow.once('ready-to-show', () => {
            App.convertSDLTMWindow.show();
        });
        App.convertSDLTMWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.convertSDLTMWindow, 'convertSDLTM.html');
    }

    static convertExcel(): void {
        App.convertExcelWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 700,
            height: 450,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.convertExcelWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'convertExcel.html');
        let url: URL = new URL('file://' + filePath);
        App.convertExcelWindow.loadURL(url.href);
        App.convertExcelWindow.once('ready-to-show', () => {
            App.convertExcelWindow.show();
        });
        App.convertExcelWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.convertExcelWindow, 'convertExcel.html');
    }

    convertCsvTmx(arg: any): void {
        App.convertCsvWindow.close();
        try {
            let converter: Csv2Tmx = new Csv2Tmx(app.getName(), app.getVersion(), App.lang,
                path.join(app.getAppPath(), 'i18n', 'tmxeditor_' + App.lang + '.json'));
            converter.convert(arg.csvFile, arg.tmxFile, arg.langs, arg.charSet, arg.columnsSeparator, arg.textDelimiter);
            if (arg.openTMX) {
                if (App.currentFile !== '') {
                    App.closeFile(() => App.openFile(arg.tmxFile));
                } else {
                    App.openFile(arg.tmxFile);
                }
            } else {
                App.showMessage({ type: 'info', message: App.i18n.getString('App', 'fileConverted') });
            }
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                App.showMessage({ type: 'error', message: err.message });
            }
        }
    }

    convertTbxTmx(arg: any): void {
        App.convertTBXWindow.close();
        App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'Converting'));
        try {
            let converter: Tbx2Tmx = new Tbx2Tmx(app.getName(), app.getVersion(), path.join(app.getAppPath(), 'i18n', 'tmxeditor_' + App.lang + '.json'));
            converter.convert(arg.tbxFile, arg.tmxFile);
            App.mainWindow.webContents.send('set-status', App.i18n.getString('App', ''));
            if (arg.openTMX) {
                if (App.currentFile !== '') {
                    App.closeFile(() => App.openFile(arg.tmxFile));
                } else {
                    App.openFile(arg.tmxFile);
                }
            }
        } catch (err: unknown) {
            App.mainWindow.webContents.send('set-status', App.i18n.getString('App', ''));
            console.error(err);
            if (err instanceof Error) {
                App.showMessage({ type: 'error', message: err.message });
            }
        }
    }

    convertSdltmTmx(arg: any): void {
        App.convertSDLTMWindow.close();
        App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'Converting'));
        const reader: TMReader = new TMReader({ 'productName': app.getName(), 'version': app.getVersion() });
        reader.convert(arg.sdltmFile, arg.tmxFile).then((result: TMReaderResult) => {
            App.mainWindow.webContents.send('end-waiting');
            App.mainWindow.webContents.send('set-status', App.i18n.getString('App', ''));
            if (result.status === SUCCESS) {
                if (arg.openTMX) {
                    if (App.currentFile !== '') {
                        App.closeFile(() => App.openFile(arg.tmxFile));
                    } else {
                        App.openFile(arg.tmxFile);
                    }
                } else {
                    App.showMessage({
                        type: 'info',
                        message: App.i18n.format(App.i18n.getString('App', 'convertedEntries'), ['' + result.count])
                    });
                }
            }
        }).catch((err: any) => {
            console.error(err);
            App.mainWindow.webContents.send('end-waiting');
            App.mainWindow.webContents.send('set-status', App.i18n.getString('App', ''));
            console.error(err);
            if (err instanceof Error) {
                App.showMessage({ type: 'error', message: err.message });
            }
        });
    }

    convertExcelTmx(arg: any): void {
        App.convertExcelWindow.close();
        try {
            let converter: Excel2Tmx = new Excel2Tmx(app.getName(), app.getVersion(), App.lang,
                path.join(app.getAppPath(), 'i18n', 'tmxeditor_' + App.lang + '.json'));
            converter.convert(arg.excelFile, arg.tmxFile, arg.sheet, arg.langs);
            if (arg.openTMX) {
                if (App.currentFile !== '') {
                    App.closeFile(() => App.openFile(arg.tmxFile));
                } else {
                    App.openFile(arg.tmxFile);
                }
            } else {
                App.showMessage({
                    type: 'info',
                    message: App.i18n.getString('App', 'fileConverted')
                });
            }
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                App.showMessage({ type: 'error', message: err.message });
            }
        }
    }

    getCsvPreview(event: IpcMainEvent, arg: any): void {
        try {
            let converter: Csv2Tmx = new Csv2Tmx(app.getName(), app.getVersion(), App.lang,
                path.join(app.getAppPath(), 'i18n', 'tmxeditor_' + App.lang + '.json'));
            event.sender.send('set-preview', converter.preview(arg.csvFile, arg.charSet, arg.columnsSeparator, arg.textDelimiter));
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                App.showMessage({ type: 'error', message: err.message });
            }
        }
    }

    getExcelPreview(event: IpcMainEvent, excelFile: string): void {
        try {
            let converter: Excel2Tmx = new Excel2Tmx(app.getName(), app.getVersion(), App.lang,
                path.join(app.getAppPath(), 'i18n', 'tmxeditor_' + App.lang + '.json'));
            event.sender.send('set-preview', converter.preview(excelFile));
        } catch (err: unknown) {
            console.error(err);
            if (err instanceof Error) {
                App.showMessage({ type: 'error', message: err.message });
            }
        }
    }

    getCsvFile(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: App.i18n.getString('App', 'OpenCSV'),
            properties: ['openFile'],
            filters: [
                { name: App.i18n.getString('App', 'CSVFile'), extensions: ['csv', 'txt', 'tsv'] },
                { name: App.i18n.getString('App', 'AnyFile'), extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-csvfile', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    getTbxFile(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: App.i18n.getString('App', 'OpenTBX'),
            properties: ['openFile'],
            filters: [
                { name: App.i18n.getString('App', 'TBXFile'), extensions: ['tbx'] },
                { name: App.i18n.getString('App', 'AnyFile'), extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-tbxfile', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    getSdltmFile(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: App.i18n.getString('App', 'OpenSDLTM'),
            properties: ['openFile'],
            filters: [
                { name: App.i18n.getString('App', 'SDLTMFile'), extensions: ['sdltm'] },
                { name: App.i18n.getString('App', 'AnyFile'), extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-sdltmfile', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    getExcelFile(event: IpcMainEvent): void {
        dialog.showOpenDialog({
            title: App.i18n.getString('App', 'OpenExcel'),
            properties: ['openFile'],
            filters: [
                { name: App.i18n.getString('App', 'ExcelFile'), extensions: ['xlsx'] },
                { name: App.i18n.getString('App', 'AnyFile'), extensions: ['*'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                event.sender.send('set-excelfile', value.filePaths[0]);
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    getConvertedTMX(event: IpcMainEvent, arg: any): void {
        dialog.showSaveDialog({
            title: App.i18n.getString('App', 'ConvertedTMX'),
            defaultPath: arg.default,
            properties: ['showOverwriteConfirmation', 'createDirectory'],
            filters: [
                { name: App.i18n.getString('App', 'TMXFile'), extensions: ['tmx'] },
                { name: App.i18n.getString('App', 'AnyFile'), extensions: ['*'] }
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
        let labels: string[] = [];
        for (let i = 0; i < arg.columns; i++) {
            let label: string = App.i18n.getString('App', 'columnLabel');
            labels.push(App.i18n.format(label, ['' + (i + 1)]));
        }
        App.csvLangArgs.labels = labels;
        App.csvLanguagesWindow = new BrowserWindow({
            parent: App.convertCsvWindow,
            modal: false,
            width: 520,
            height: 280,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.csvLanguagesWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'csvLanguages.html');
        let url: URL = new URL('file://' + filePath);
        App.csvLanguagesWindow.loadURL(url.href);
        App.csvLanguagesWindow.once('ready-to-show', () => {
            App.csvLanguagesWindow.show();
        });
        App.csvLanguagesWindow.on('close', () => {
            App.convertCsvWindow.focus();
        });
        App.setLocation(App.csvLanguagesWindow, 'csvLanguages.html');
    }

    setCsvLanguages(arg: any): void {
        App.csvLanguagesWindow.close();
        App.csvEvent.sender.send('csv-languages', arg);
    }

    getExcelLanguages(event: IpcMainEvent, arg: any): void {
        App.excelEvent = event;
        let labels: string[] = [];
        for (let col of arg.columns) {
            labels.push(App.i18n.format(App.i18n.getString('App', 'columnLabel'), col));
        }
        App.excelLangArgs = arg;
        App.excelLangArgs.labels = labels;
        App.excelLanguagesWindow = new BrowserWindow({
            parent: App.convertExcelWindow,
            modal: false,
            width: 520,
            height: 280,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.excelLanguagesWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'excelLanguages.html');
        let url: URL = new URL('file://' + filePath);
        App.excelLanguagesWindow.loadURL(url.href);
        App.excelLanguagesWindow.once('ready-to-show', () => {
            App.excelLanguagesWindow.show();
        });
        App.excelLanguagesWindow.on('close', () => {
            App.convertExcelWindow.focus();
        });
        App.setLocation(App.excelLanguagesWindow, 'excelLanguages.html');
    }

    setExcelLanguages(arg: any): void {
        App.excelLanguagesWindow.close();
        App.excelEvent.sender.send('excel-languages', arg);
    }

    static exportDelimited(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        dialog.showSaveDialog({
            title: App.i18n.getString('App', 'ExportTabDelimited'),
            defaultPath: this.currentFile.substring(0, this.currentFile.lastIndexOf('.')) + '.csv',
            properties: ['showOverwriteConfirmation', 'createDirectory'],
            filters: [
                { name: App.i18n.getString('App', 'CSVFile'), extensions: ['csv'] },
                { name: App.i18n.getString('App', 'TextFile'), extensions: ['txt'] },
                { name: App.i18n.getString('App', 'AnyFile'), extensions: ['*'] }
            ]
        }).then((value: SaveDialogReturnValue) => {
            if (!value.canceled) {
                App.mainWindow.webContents.send('start-waiting');
                App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'Exporting'));
                try {
                    new Tmx2Csv(path.join(app.getAppPath(), 'catalog', 'catalog.xml')).convert(App.currentFile, value.filePath);
                    App.mainWindow.webContents.send('end-waiting');
                    App.mainWindow.webContents.send('set-status', '');
                    App.showMessage({ type: 'info', message: App.i18n.getString('App', 'fileExported') });
                } catch (err: unknown) {
                    App.mainWindow.webContents.send('end-waiting');
                    App.mainWindow.webContents.send('set-status', '');
                    console.error(err);
                    if (err instanceof Error) {
                        App.showMessage({ type: 'error', message: err.message });
                    }
                }
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    static exportExcel(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        dialog.showSaveDialog({
            title: App.i18n.getString('App', 'ExportExcel'),
            defaultPath: this.currentFile.substring(0, this.currentFile.lastIndexOf('.')) + '.xlsx',
            properties: ['showOverwriteConfirmation', 'createDirectory'],
            filters: [
                { name: App.i18n.getString('App', 'ExcelFile'), extensions: ['xlsx'] },
                { name: App.i18n.getString('App', 'AnyFile'), extensions: ['*'] }
            ]
        }).then((value: SaveDialogReturnValue) => {
            if (!value.canceled) {
                App.mainWindow.webContents.send('start-waiting');
                App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'Exporting'));
                try {
                    new Tmx2Excel(path.join(app.getAppPath(), 'catalog', 'catalog.xml')).convert(App.currentFile, value.filePath);
                    App.mainWindow.webContents.send('end-waiting');
                    App.mainWindow.webContents.send('set-status', '');
                    App.showMessage({ type: 'info', message: App.i18n.getString('App', 'fileExported') });
                } catch (err: unknown) {
                    App.mainWindow.webContents.send('end-waiting');
                    App.mainWindow.webContents.send('set-status', '');
                    console.error(err);
                    if (err instanceof Error) {
                        App.showMessage({ type: 'error', message: err.message });
                    }
                }
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    static showFileInfo(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.fileInfoWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 760,
            height: 470,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.fileInfoWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'fileInfo.html');
        let url: URL = new URL('file://' + filePath);
        App.fileInfoWindow.loadURL(url.href);
        App.fileInfoWindow.once('ready-to-show', () => {
            App.fileInfoWindow.show();
        });
        App.fileInfoWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.fileInfoWindow, 'fileInfo.html');
    }

    static saveFileAttributes(arg: any): void {
        if (!App.model) {
            return;
        }
        App.model.setFileAttributes(arg);
        App.showMessage({ parent: 'fileInfo', type: 'info', message: App.i18n.getString('App', 'fileAttributesSaved') });
        App.saved = false;
        App.mainWindow.setDocumentEdited(true);
    }

    static saveFileProperties(properties: Array<string[]>): void {
        if (!App.model) {
            return;
        }
        App.model.setFileProperties(properties as [string, string][]);
        App.showMessage({ parent: 'fileInfo', type: 'info', message: App.i18n.getString('App', 'filePropertiesSaved') });
        App.saved = false;
        App.mainWindow.setDocumentEdited(true);
    }

    static saveFileNotes(notes: string[]): void {
        if (!App.model) {
            return;
        }
        App.model.setFileNotes(notes);
        App.showMessage({ parent: 'fileInfo', type: 'info', message: App.i18n.getString('App', 'fileNotesSaved') });
        App.saved = false;
        App.mainWindow.setDocumentEdited(true);
    }

    fileProperties(event: IpcMainEvent): void {
        if (!App.model) {
            return;
        }
        let data: any = App.model.getFileProperties();
        if (data.attributes.srclang && data.attributes.srclang !== '*all*') {
            data.attributes.srclang = LanguageUtils.normalizeCode(data.attributes.srclang);
        }
        if (data.attributes.adminlang) {
            data.attributes.adminlang = LanguageUtils.normalizeCode(data.attributes.adminlang);
        }
        data.fileLanguages = [{ code: '*all*', name: App.i18n.getString('App', 'anyLanguage') }, ...App.fileLanguages];
        data.removeProperties = App.i18n.getString('App', 'RemoveProperties');
        data.removeNotes = App.i18n.getString('App', 'RemoveNotes');
        event.sender.send('set-file-properties', data);
    }

    static validateFile(): void {
        dialog.showOpenDialog({
            title: App.i18n.getString('App', 'ValidateTMX'),
            properties: ['openFile'],
            filters: [
                { name: App.i18n.getString('App', 'TMXFile'), extensions: ['tmx'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                App.mainWindow.webContents.send('start-waiting');
                App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'Validating'));
                try {
                    let catalogFile: string = path.join(app.getAppPath(), 'catalog', 'catalog.xml');
                    new Validator(catalogFile, App.i18n).validateFile(value.filePaths[0]);
                    App.mainWindow.webContents.send('end-waiting');
                    App.mainWindow.webContents.send('set-status', '');
                    App.showMessage({ type: 'info', message: App.i18n.getString('App', 'fileIsValid') });
                } catch (error: any) {
                    App.mainWindow.webContents.send('end-waiting');
                    App.mainWindow.webContents.send('set-status', '');
                    App.showMessage({ type: 'error', message: error.message });
                }
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    static cleanCharacters(): void {
        dialog.showOpenDialog({
            title: App.i18n.getString('App', 'CleanCharacters'),
            properties: ['openFile'],
            filters: [
                { name: App.i18n.getString('App', 'TMXFile'), extensions: ['tmx'] }
            ]
        }).then((value: OpenDialogReturnValue) => {
            if (!value.canceled) {
                App.mainWindow.webContents.send('start-waiting');
                App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'Cleaning'));
                try {
                    new TmxCleaner().clean(value.filePaths[0]);
                    App.mainWindow.webContents.send('end-waiting');
                    App.mainWindow.webContents.send('set-status', '');
                    App.showMessage({ type: 'info', message: App.i18n.getString('App', 'fileCleaned') });
                } catch (error: any) {
                    App.mainWindow.webContents.send('end-waiting');
                    App.mainWindow.webContents.send('set-status', '');
                    App.showMessage({ type: 'error', message: error.message });
                }
            }
        }).catch((error: Error) => {
            App.showMessage({ type: 'error', message: error.message });
        });
    }

    static splitFile(): void {
        App.splitFileWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 500,
            height: 150,
            minimizable: false,
            maximizable: false,
            resizable: true,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.splitFileWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'splitFile.html');
        let url: URL = new URL('file://' + filePath);
        App.splitFileWindow.loadURL(url.href);
        App.splitFileWindow.once('ready-to-show', () => {
            App.splitFileWindow.show();
        });
        App.splitFileWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.splitFileWindow, 'splitFile.html');
    }

    splitTmx(arg: any): void {
        App.splitFileWindow.close();
        App.mainWindow.webContents.send('start-waiting');
        App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'Splitting'));
        try {
            new Tmx2Split(path.join(app.getAppPath(), 'catalog', 'catalog.xml')).split(arg.file, arg.parts);
            App.mainWindow.webContents.send('end-waiting');
            App.mainWindow.webContents.send('set-status', '');
            App.showMessage({ type: 'info', message: App.i18n.getString('App', 'fileSplit') });
        } catch (err: unknown) {
            App.mainWindow.webContents.send('end-waiting');
            App.mainWindow.webContents.send('set-status', '');
            console.error(err);
            if (err instanceof Error) {
                App.showMessage({ type: 'error', message: err.message });
            }
        }
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
            width: 600,
            height: 460,
            minimizable: false,
            maximizable: false,
            resizable: true,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.mergeFilesWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'mergeFiles.html');
        let url: URL = new URL('file://' + filePath);
        App.mergeFilesWindow.loadURL(url.href);
        App.mergeFilesWindow.once('ready-to-show', () => {
            App.mergeFilesWindow.show();
        });
        App.mergeFilesWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.mergeFilesWindow, 'mergeFiles.html');
    }

    mergeTmxFiles(arg: any): void {
        App.mergeFilesWindow.close();
        App.mainWindow.webContents.send('start-waiting');
        App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'Merging'));
        try {
            new Tmx2Merge(app.getName(), app.getVersion(), path.join(app.getAppPath(), 'catalog', 'catalog.xml'))
                .merge(arg.merged, arg.files);
            App.mainWindow.webContents.send('end-waiting');
            App.mainWindow.webContents.send('set-status', '');
            if (arg.openTMX) {
                if (App.currentFile !== '') {
                    App.closeFile(() => App.openFile(arg.merged));
                } else {
                    App.openFile(arg.merged);
                }
            } else {
                App.showMessage({ type: 'info', message: App.i18n.getString('App', 'filesMerged') });
            }
        } catch (err: unknown) {
            App.mainWindow.webContents.send('end-waiting');
            App.mainWindow.webContents.send('set-status', '');
            console.error(err);
            if (err instanceof Error) {
                App.showMessage({ type: 'error', message: err.message });
            }
        }
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
            title: App.i18n.getString('App', 'TMXFiles'),
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: App.i18n.getString('App', 'TMXFile'), extensions: ['tmx'] },
                { name: App.i18n.getString('App', 'AnyFile'), extensions: ['*'] }
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
            title: App.i18n.getString('App', 'MergedFile'),
            properties: ['showOverwriteConfirmation', 'createDirectory'],
            filters: [
                { name: App.i18n.getString('App', 'TMXFile'), extensions: ['tmx'] },
                { name: App.i18n.getString('App', 'AnyFile'), extensions: ['*'] }
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
        if (!App.model) {
            return;
        }
        try {
            let updated: string = App.model.saveTuvData(arg.id, arg.lang, arg.data);
            App.mainWindow.setDocumentEdited(true);
            App.saved = false;
            event.sender.send('data-saved', { status: SUCCESS, id: arg.id, lang: arg.lang, data: updated });
        } catch (error: any) {
            App.mainWindow.setDocumentEdited(true);
            App.saved = false;
            event.sender.send('data-saved', { status: 'Error', id: arg.id, lang: arg.lang });
            App.showMessage({ type: 'error', message: error.message });
        }
    }

    static replaceText(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.replaceTextWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 550,
            height: 210,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.replaceTextWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'searchReplace.html');
        let url: URL = new URL('file://' + filePath);
        App.replaceTextWindow.loadURL(url.href);
        App.replaceTextWindow.once('ready-to-show', () => {
            App.replaceTextWindow.show();
        });
        App.replaceTextWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.replaceTextWindow, 'searchReplace.html');
    }

    findText(args: { searchText: string, caseSensitive: boolean, useRegex: boolean }): void {
        this.performSearch(args.searchText, 0, 0, args.caseSensitive, args.useRegex);
    }

    findNextText(args: { searchText: string, caseSensitive: boolean, useRegex: boolean }): void {
        if (!App.model) {
            return;
        }
        App.mainWindow.webContents.send('get-search-start', args);
    }

    searchStartReceived(args: { searchText: string, caseSensitive: boolean, useRegex: boolean, position: number, langIndex: number }): void {
        if (!App.model) {
            return;
        }
        let languages: string[] = App.model.getLanguages();
        let nextLangIndex: number = args.langIndex + 1;
        let nextPosition: number = args.position;
        if (nextLangIndex >= languages.length) {
            nextLangIndex = 0;
            nextPosition = args.position + 1;
        }
        this.performSearch(args.searchText, nextPosition, nextLangIndex, args.caseSensitive, args.useRegex);
    }

    private isValidRegex(text: string, useRegex: boolean): boolean {
        if (!useRegex) {
            return true;
        }
        try {
            new RegExp(text);
            return true;
        } catch (error) {
            return false;
        }
    }

    private performSearch(text: string, position: number, langIndex: number, caseSensitive: boolean, useRegex: boolean): void {
        if (!App.model) {
            return;
        }
        if (!this.isValidRegex(text, useRegex)) {
            App.replaceTextWindow?.webContents.send('match-found', false);
            App.showMessage({ parent: 'searchReplace', type: 'error', message: App.i18n.getString('searchReplace', 'invalidRegex') });
            return;
        }
        let match: { id: string, position: number, lang: string } | null = App.model.searchText(text, position, langIndex, caseSensitive, useRegex);
        App.replaceTextWindow?.webContents.send('match-found', match !== null);
        if (match) {
            App.mainWindow.webContents.send('select-match', { id: match.id, position: match.position, lang: match.lang, searchText: text, caseSensitive: caseSensitive, useRegex: useRegex });
        } else {
            App.showMessage({ parent: 'searchReplace', type: 'info', message: App.i18n.getString('searchReplace', 'textNotFound') });
        }
    }

    replaceAllRequest(args: { searchText: string, replaceText: string, caseSensitive: boolean, useRegex: boolean }): void {
        if (!App.model) {
            return;
        }
        if (!this.isValidRegex(args.searchText, args.useRegex)) {
            App.showMessage({ parent: 'searchReplace', type: 'error', message: App.i18n.getString('searchReplace', 'invalidRegex') });
            return;
        }
        let clicked: number = dialog.showMessageBoxSync(App.replaceTextWindow, {
            type: 'question',
            title: App.i18n.getString('menu', 'ReplaceText'),
            message: App.i18n.getString('searchReplace', 'confirmReplaceAll'),
            buttons: [App.i18n.getString('App', 'Yes'), App.i18n.getString('App', 'No')],
            defaultId: 1,
            cancelId: 1
        });
        if (clicked !== 0) {
            return;
        }
        try {
            let count: number = App.model.replaceAll(args.searchText, args.replaceText, args.caseSensitive, args.useRegex);
            if (count > 0) {
                App.saved = false;
                App.mainWindow.setDocumentEdited(true);
                App.loadSegments();
            }
            App.showMessage({ parent: 'searchReplace', type: 'info', message: App.i18n.format(App.i18n.getString('searchReplace', 'replacementsMade'), ['' + count]) });
        } catch (error) {
            App.showMessage({ parent: 'searchReplace', type: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    }

    static sortUnits(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.sortUnitsWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 520,
            height: 200,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.sortUnitsWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'sortUnits.html');
        let url: URL = new URL('file://' + filePath);
        App.sortUnitsWindow.loadURL(url.href);
        App.sortUnitsWindow.once('ready-to-show', () => {
            App.sortUnitsWindow.show();
        });
        App.sortUnitsWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.sortUnitsWindow, 'sortUnits.html');
    }

    setSort(arg: SegmentFilter): void {
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
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.filtersWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 520,
            height: 320,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.filtersWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'filters.html');
        let url: URL = new URL('file://' + filePath);
        App.filtersWindow.loadURL(url.href);
        App.filtersWindow.once('ready-to-show', () => {
            App.filtersWindow.show();
        });
        App.filtersWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.filtersWindow, 'filters.html');
    }

    setFilterOptions(arg: SegmentFilter): void {
        if (!App.filterOptions || Object.keys(App.filterOptions).length === 0) {
            App.preFilterStart = App.loadOptions.start ?? 0;
        }
        App.filterOptions = arg;
        App.filtersWindow.close();
        App.loadOptions.start = 0;
        App.loadSegments();
        App.mainWindow.webContents.send('filters-on');
    }

    clearFilterOptions(): void {
        App.filterOptions = {};
        App.filtersWindow.close();
        if (App.model) {
            App.mainWindow.webContents.send('segments-reset', { count: App.model.getCount(), start: App.preFilterStart });
        }
        App.mainWindow.webContents.send('filters-off');
    }

    static insertUnit(): void {
        if (App.currentFile === '' || !App.model) {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        try {
            let id: string = 'tmx' + Date.now();
            App.model.insertUnit(id, app.name, app.getVersion());
            App.mainWindow.webContents.send('unit-inserted', { id: id, count: App.model.getCount() });
            App.saved = false;
            App.mainWindow.setDocumentEdited(true);
        } catch (error: any) {
            App.showMessage({ type: 'error', message: error.message });
        }
    }

    static requestDeleteUnits(): void {
        App.mainWindow.webContents.send('request-delete');
    }

    deleteUnits(arg: any): void {
        if (App.currentFile === '' || !App.model) {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        let selected: string[] = arg;
        if (selected.length === 0) {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'selectUnits') });
            return;
        }
        try {
            App.model.deleteUnits(selected);
            App.getFileLanguages();
            App.getCount();
            App.loadSegments();
            App.saved = false;
            App.mainWindow.setDocumentEdited(true);
        } catch (error: any) {
            App.showMessage({ type: 'error', message: error.message });
        }
    }

    static changeLanguageCode(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.changeLanguageWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 490,
            height: 150,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.changeLanguageWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'changeLanguage.html');
        let url: URL = new URL('file://' + filePath);
        App.changeLanguageWindow.loadURL(url.href);
        App.changeLanguageWindow.once('ready-to-show', () => {
            App.changeLanguageWindow.show();
        });
        App.changeLanguageWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.changeLanguageWindow, 'changeLanguage.html');
    }

    changeLanguage(oldLanguage: string, newLanguage: string): void {
        App.changeLanguageWindow.close();
        if (!App.model) {
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'Changing'));
        try {
            App.model.changeLanguage(oldLanguage, newLanguage);
            App.getFileLanguages();
            App.loadSegments();
            App.saved = false;
            App.mainWindow.setDocumentEdited(true);
        } catch (error: any) {
            App.showMessage({ type: 'error', message: App.i18n.getString('App', 'errorChangingLanguage') });
        }
        App.mainWindow.webContents.send('end-waiting');
        App.mainWindow.webContents.send('set-status', '');
    }

    allLanguages(event: IpcMainEvent): void {
        let result: Language[] = LanguageUtils.getLanguages(App.lang).map((lang): Language => ({ code: lang.getCode(), name: lang.getDescription() }));
        result.unshift({ code: 'none', name: App.i18n.getString('App', 'selectLanguage') });
        event.sender.send('languages-list', result);
    }

    static showRemoveLanguage(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.removeLanguageWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 420,
            height: 100,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.removeLanguageWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'removeLanguage.html');
        let url: URL = new URL('file://' + filePath);
        App.removeLanguageWindow.loadURL(url.href);
        App.removeLanguageWindow.once('ready-to-show', () => {
            App.removeLanguageWindow.show();
        });
        App.removeLanguageWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.removeLanguageWindow, 'removeLanguage.html');
    }

    removeLanguage(lang: string): void {
        App.removeLanguageWindow.close();
        if (!App.model) {
            return;
        }
        try {
            App.model.removeLanguage(lang);
            App.getFileLanguages();
            App.loadSegments();
            App.saved = false;
            App.mainWindow.setDocumentEdited(true);
        } catch (error: any) {
            App.showMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    }

    static showAddLanguage(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.addLanguageWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 420,
            height: 100,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.addLanguageWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'addLanguage.html');
        let url: URL = new URL('file://' + filePath);
        App.addLanguageWindow.loadURL(url.href);
        App.addLanguageWindow.once('ready-to-show', () => {
            App.addLanguageWindow.show();
        });
        App.addLanguageWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.addLanguageWindow, 'addLanguage.html');
    }

    addLanguage(lang: string): void {
        App.addLanguageWindow.close();
        if (!App.model) {
            return;
        }
        try {
            App.model.addLanguage(lang);
            App.getFileLanguages();
            App.loadSegments();
            App.saved = false;
            App.mainWindow.setDocumentEdited(true);
        } catch (error: any) {
            App.showMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    }

    static showChangeSourceLanguage(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.srcLanguageWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 420,
            height: 100,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.srcLanguageWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'srcLanguage.html');
        let url: URL = new URL('file://' + filePath);
        App.srcLanguageWindow.loadURL(url.href);
        App.srcLanguageWindow.once('ready-to-show', () => {
            App.srcLanguageWindow.show();
        });
        App.srcLanguageWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.srcLanguageWindow, 'srcLanguage.html');
    }

    getSourceLanguage(event: IpcMainEvent): void {
        if (!App.model) {
            return;
        }
        let code: string = App.model.getSrcLanguage();
        if (code === '*all*') {
            event.sender.send('set-source-language', { status: SUCCESS, srcLang: code });
            return;
        }
        let language = LanguageUtils.getLanguage(code, App.lang);
        if (language) {
            event.sender.send('set-source-language', { status: SUCCESS, srcLang: language.getCode() });
        } else {
            App.showMessage({ type: 'warning', message: 'Invalid source language: ' + code });
        }
    }

    static removeTags(): void {
        if (App.currentFile === '' || !App.model) {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        try {
            App.model.removeTags();
            App.loadSegments();
            App.saved = false;
            App.mainWindow.setDocumentEdited(true);
        } catch (error: any) {
            dialog.showErrorBox(App.i18n.getString('App', 'Error'), App.i18n.getString('App', 'ErrorRemovingTags'));
        }
        App.mainWindow.webContents.send('end-waiting');
    }

    changeSourceLanguage(srcLang: string): void {
        App.srcLanguageWindow.close();
        if (!App.model) {
            return;
        }
        App.model.setSrcLanguage(srcLang);
        App.saved = false;
        App.mainWindow.setDocumentEdited(true);
    }

    static removeDuplicates(): void {
        if (App.currentFile === '' || !App.model) {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        try {
            App.model.removeDuplicates();
            App.loadSegments();
            App.getCount();
            App.saved = false;
            App.mainWindow.setDocumentEdited(true);
        } catch (error: any) {
            dialog.showErrorBox(App.i18n.getString('App', 'Error'), App.i18n.getString('App', 'ErrorRemovingDuplicates'));
        }
        App.mainWindow.webContents.send('end-waiting');
    }

    static getCount(): void {
        if (!App.model) {
            return;
        }
        let count: number = App.model.getCount();
        App.mainWindow.webContents.send('status-changed', { status: SUCCESS, count: count });
    }

    static showRemoveUntranslated(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.removeUntranslatedWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 470,
            height: 100,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.removeUntranslatedWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'removeUntranslated.html');
        let url: URL = new URL('file://' + filePath);
        App.removeUntranslatedWindow.loadURL(url.href);
        App.removeUntranslatedWindow.once('ready-to-show', () => {
            App.removeUntranslatedWindow.show();
        });
        App.removeUntranslatedWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.removeUntranslatedWindow, 'removeUntranslated.html');
    }

    static showRemoveSameAsSource(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.removeSameAsSourceWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 470,
            height: 100,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.removeSameAsSourceWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'removeSameAsSource.html');
        let url: URL = new URL('file://' + filePath);
        App.removeSameAsSourceWindow.loadURL(url.href);
        App.removeSameAsSourceWindow.once('ready-to-show', () => {
            App.removeSameAsSourceWindow.show();
        });
        App.removeSameAsSourceWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.removeSameAsSourceWindow, 'removeSameAsSource.html');
    }

    removeUntranslated(srcLang: string): void {
        App.removeUntranslatedWindow.close();
        if (!App.model) {
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        try {
            App.model.removeUntranslated(srcLang);
            App.loadSegments();
            App.getCount();
            App.saved = false;
            App.mainWindow.setDocumentEdited(true);
        } catch (error: any) {
            dialog.showErrorBox(App.i18n.getString('App', 'Error'), App.i18n.getString('App', 'ErrorRemovingUnits'));
        }
        App.mainWindow.webContents.send('end-waiting');
    }

    removeSameAsSource(srcLang: string): void {
        App.removeSameAsSourceWindow.close();
        if (!App.model) {
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        try {
            App.model.removeSameAsSource(srcLang);
            App.loadSegments();
            App.getCount();
            App.saved = false;
            App.mainWindow.setDocumentEdited(true);
        } catch (error: any) {
            dialog.showErrorBox(App.i18n.getString('App', 'Error'), App.i18n.getString('App', 'ErrorRemovingEntries'));
        }
        App.mainWindow.webContents.send('end-waiting');
    }

    static removeSpaces(): void {
        if (App.currentFile === '' || !App.model) {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        try {
            App.model.removeSpaces();
            App.loadSegments();
            App.saved = false;
            App.mainWindow.setDocumentEdited(true);
        } catch (error: any) {
            dialog.showErrorBox(App.i18n.getString('App', 'Error'), App.i18n.getString('App', 'ErrorRemovingSpaces'));
        }
        App.mainWindow.webContents.send('end-waiting');
    }

    static showConsolidateUnits(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        if (App.fileLanguages.length < 3) {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'fileNeeds3Languages') });
            return;
        }
        App.consolidateWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 470,
            height: 100,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.consolidateWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'consolidate.html');
        let url: URL = new URL('file://' + filePath);
        App.consolidateWindow.loadURL(url.href);
        App.consolidateWindow.once('ready-to-show', () => {
            App.consolidateWindow.show();
        });
        App.consolidateWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.consolidateWindow, 'consolidate.html');
    }

    consolidateUnits(srcLang: string): void {
        App.consolidateWindow.close();
        if (!App.model) {
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'Consolidating'));
        try {
            App.model.consolidateUnits(srcLang);
            App.loadSegments();
            App.getCount();
            App.saved = false;
            App.mainWindow.setDocumentEdited(true);
        } catch (error: any) {
            dialog.showErrorBox(App.i18n.getString('App', 'Error'), App.i18n.getString('App', 'ErrorConsolidating'));
        }
        App.mainWindow.webContents.send('end-waiting');
        App.mainWindow.webContents.send('set-status', '');
    }

    static showMaintenanceDashboard(): void {
        if (App.currentFile === '') {
            App.showMessage({ type: 'warning', message: App.i18n.getString('App', 'openTmxFile') });
            return;
        }
        App.maintenanceWindow = new BrowserWindow({
            parent: App.mainWindow,
            width: 470,
            height: 340,
            minimizable: false,
            maximizable: false,
            resizable: false,
            show: false,
            icon: App.iconPath,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        App.maintenanceWindow.setMenu(null);
        let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'maintenance.html');
        let url: URL = new URL('file://' + filePath);
        App.maintenanceWindow.loadURL(url.href);
        App.maintenanceWindow.once('ready-to-show', () => {
            App.maintenanceWindow.show();
        });
        App.maintenanceWindow.on('close', () => {
            App.mainWindow.focus();
        });
        App.setLocation(App.maintenanceWindow, 'maintenance.html');
    }

    static maintenanceTasks(arg: { tags: boolean, untranslated: boolean, duplicates: boolean, spaces: boolean, consolidate: boolean, sourceLanguage: string }): void {
        App.maintenanceWindow.close();
        if (!App.model) {
            return;
        }
        App.mainWindow.webContents.send('start-waiting');
        try {
            if (arg.tags) {
                App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'RemovingTags'));
                App.model.removeTags();
            }
            if (arg.spaces) {
                App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'RemovingSpaces'));
                App.model.removeSpaces();
            }
            if (arg.untranslated) {
                App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'RemovingUnits'));
                App.model.removeUntranslated(arg.sourceLanguage);
            }
            if (arg.duplicates) {
                App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'RemovingDuplicates'));
                App.model.removeDuplicates();
            }
            if (arg.consolidate) {
                App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'Consolidating'));
                App.model.consolidateUnits(arg.sourceLanguage);
            }
            App.loadSegments();
            App.getCount();
            App.saved = false;
            App.mainWindow.setDocumentEdited(true);
        } catch (error: any) {
            dialog.showErrorBox(App.i18n.getString('App', 'Error'), App.i18n.getString('App', 'MaintenanceError'));
        }
        App.mainWindow.webContents.send('end-waiting');
        App.mainWindow.webContents.send('set-status', '');
    }

    static showReleaseHistory(): void {
        shell.openExternal('https://www.maxprograms.com/products/tmxlog.html');
    }

    static showSupportGroup(): void {
        shell.openExternal('https://groups.io/g/maxprograms/');
    }

    static downloadLatest(): void {
        let downloadsFolder = app.getPath('downloads');
        let url: URL = new URL(App.downloadLink);
        let path: string = url.pathname;
        path = path.substring(path.lastIndexOf('/') + 1);
        let file: string = downloadsFolder + (process.platform === 'win32' ? '\\' : '/') + path;
        if (existsSync(file)) {
            unlinkSync(file);
        }
        let request: Electron.ClientRequest = net.request({
            url: App.downloadLink,
            session: session.defaultSession
        });
        App.mainWindow.webContents.send('set-status', App.i18n.getString('App', 'Downloading'));
        App.updatesWindow.close();
        request.on('response', (response: IncomingMessage) => {
            let fileSize: number = Number.parseInt(response.headers['content-length'] as string);
            let received: number = 0;
            response.on('data', (chunk: Buffer) => {
                received += chunk.length;
                if (process.platform === 'win32' || process.platform === 'darwin') {
                    App.mainWindow.setProgressBar(received / fileSize);
                }
                App.mainWindow.webContents.send('set-status',
                    App.i18n.format(App.i18n.getString('App', 'Downloaded'), ['' + Math.trunc(received * 100 / fileSize)]));
                appendFileSync(file, chunk);
            });
            response.on('end', () => {
                App.mainWindow.webContents.send('set-status', '');
                dialog.showMessageBox({
                    type: 'info',
                    message: App.i18n.getString('App', 'UpdateDownloaded')
                });
                if (process.platform === 'win32' || process.platform === 'darwin') {
                    App.mainWindow.setProgressBar(0);
                    shell.openPath(file).then(() => {
                        app.quit();
                    }).catch((reason: string) => {
                        dialog.showErrorBox(App.i18n.getString('App', 'Error'), reason);
                    });
                }
                if (process.platform === 'linux') {
                    shell.showItemInFolder(file);
                }
            });
            response.on('error', (error: Error) => {
                App.mainWindow.webContents.send('set-status', '');
                dialog.showErrorBox(App.i18n.getString('App', 'Error'), error.message);
                if (process.platform === 'win32' || process.platform === 'darwin') {
                    App.mainWindow.setProgressBar(0);
                }
            });
        });
        request.end();
    }

    static setLocation(window: BrowserWindow, key: string): void {
        if (App.locations.hasLocation(key)) {
            let position: Point | undefined = App.locations.getLocation(key);
            if (position) {
                window.setPosition(position.x, position.y, true);
            }
        }
        window.addListener('moved', () => {
            let bounds: Rectangle = window.getBounds();
            App.locations.setLocation(key, bounds.x, bounds.y);
        });
    }

    static checkUpdates(silent: boolean): void {
        session.defaultSession.clearCache().then(() => {
            let request: Electron.ClientRequest = net.request({
                url: 'https://maxprograms.com/tmxeditor.json',
                session: session.defaultSession
            });
            request.on('response', (response: IncomingMessage) => {
                let responseData: string = '';
                response.on('data', (chunk: Buffer) => {
                    responseData += chunk;
                });
                response.on('end', () => {
                    try {
                        let parsedData: any = JSON.parse(responseData);
                        if (app.getVersion() !== parsedData.version) {
                            App.latestVersion = parsedData.version;
                            switch (process.platform) {
                                case 'darwin':
                                    App.downloadLink = process.arch === 'arm64' ? parsedData.arm64 : parsedData.darwin;
                                    break;
                                case 'win32':
                                    App.downloadLink = parsedData.win32;
                                    break;
                                case 'linux':
                                    App.downloadLink = parsedData.linux;
                                    break;
                            }
                            App.updatesWindow = new BrowserWindow({
                                parent: App.mainWindow,
                                width: 600,
                                height: 220,
                                minimizable: false,
                                maximizable: false,
                                resizable: false,
                                show: false,
                                icon: this.iconPath,
                                webPreferences: {
                                    nodeIntegration: true,
                                    contextIsolation: false
                                }
                            });
                            App.updatesWindow.setMenu(null);
                            let filePath: string = path.join(app.getAppPath(), 'html', App.lang, 'updates.html');
                            let url: URL = new URL('file://' + filePath);
                            App.updatesWindow.loadURL(url.href);
                            App.updatesWindow.once('ready-to-show', () => {
                                App.updatesWindow.show();
                                App.updatesWindow.center();
                            });
                            App.updatesWindow.on('close', () => {
                                App.mainWindow.focus();
                            });
                        } else if (!silent) {
                            App.showMessage({
                                type: 'info',
                                message: App.i18n.getString('App', 'noUpdates')
                            });
                        }
                    } catch (reason: any) {
                        if (!silent) {
                            App.showMessage({ type: 'error', message: reason.message });
                        }
                    }
                });
            });
            request.end();
        });
    }

    static editAttributes(): void {
        App.mainWindow.webContents.send('edit-attributes');
    }

    static editProperties(): void {
        App.mainWindow.webContents.send('edit-properties');
    }

    static editNotes(): void {
        App.mainWindow.webContents.send('edit-notes');
    }
}

try {
    new App(process.argv);
} catch (e) {
    console.error("Unable to instantiate App();");
}