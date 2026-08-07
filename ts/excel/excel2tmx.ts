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

import { XMLDocumentType, XMLElement, XMLDocument, XMLAttribute, Indenter, XMLWriter } from "typesxml";
import { CellValue, ColumnUtils, ExcelReader, ExcelSheetData } from "typesexcel";
import { Language, LanguageUtils } from "typesbcp47";
import { I18n } from "../i18n.js";

export interface ExcelSheetPreview {
    name: string;
    columns: number;
    rows: number;
    data: CellValue[][];
    langs?: string[];
}

export class Excel2Tmx {

    private appName: string;
    private version: string;
    private locale: string;
    private i18n: I18n;
    private columnUtils: ColumnUtils;

    constructor(appName: string, version: string, locale: string, resourcesFile: string) {
        this.appName = appName;
        this.version = version;
        this.locale = locale;
        this.i18n = new I18n(resourcesFile);
        this.columnUtils = new ColumnUtils();
    }

    preview(excelFile: string): ExcelSheetPreview[] {
        let sheets: ExcelSheetData[] = new ExcelReader(this.locale).readSheets(excelFile);
        let result: ExcelSheetPreview[] = [];
        for (let sheet of sheets) {
            let columnCount: number = sheet.rows.length > 0 ? sheet.rows[0].length : 0;
            let columnsRow: string[] = [];
            for (let c: number = 0; c < columnCount; c++) {
                columnsRow.push(this.columnUtils.columnName(c));
            }
            let data: CellValue[][] = [columnsRow];
            for (let r: number = 0; r < 10 && r < sheet.rows.length; r++) {
                data.push(sheet.rows[r]);
            }
            let preview: ExcelSheetPreview = {
                name: sheet.name,
                columns: columnCount,
                rows: sheet.rows.length,
                data: data
            };
            let langs: string[] | undefined = this.guessLanguages(sheet.rows.length > 0 ? sheet.rows[0] : [], columnCount);
            if (langs) {
                preview.langs = langs;
            }
            result.push(preview);
        }
        return result;
    }

    private guessLanguages(firstRow: CellValue[], columnCount: number): string[] | undefined {
        if (firstRow.length !== columnCount) {
            return undefined;
        }
        let langs: string[] = [];
        for (let cell of firstRow) {
            if (typeof cell !== 'string' || cell === '') {
                return undefined;
            }
            let language: Language | undefined = LanguageUtils.getLanguage(cell, this.locale);
            if (!language) {
                return undefined;
            }
            langs.push(language.getCode());
        }
        return langs;
    }

    convert(excelFile: string, tmxFile: string, sheetName: string, langs: string[]): void {
        let sheets: ExcelSheetData[] = new ExcelReader(this.locale).readSheets(excelFile);
        let sheet: ExcelSheetData | undefined = sheets.find((s: ExcelSheetData) => s.name === sheetName);
        if (!sheet) {
            throw new Error(this.i18n.format(this.i18n.getString('excel2tmx', 'sheetNotFound'), [sheetName]));
        }

        let tmx: XMLDocument = new XMLDocument();
        tmx.setDocumentType(new XMLDocumentType('tmx', '-//LISA OSCAR:1998//DTD for Translation Memory eXchange//EN', 'tmx14.dtd'));
        let tmxRoot: XMLElement = new XMLElement('tmx');
        tmx.setRoot(tmxRoot);
        tmxRoot.setAttribute(new XMLAttribute('version', '1.4'));

        let header: XMLElement = new XMLElement('header');
        header.setAttribute(new XMLAttribute('creationtool', this.appName));
        header.setAttribute(new XMLAttribute('creationtoolversion', this.version));
        header.setAttribute(new XMLAttribute('srclang', '*all*'));
        header.setAttribute(new XMLAttribute('adminlang', 'en'));
        header.setAttribute(new XMLAttribute('datatype', 'excel'));
        header.setAttribute(new XMLAttribute('o-tmf', 'excel'));
        header.setAttribute(new XMLAttribute('segtype', 'block'));
        tmxRoot.addElement(header);

        let body: XMLElement = new XMLElement('body');
        tmxRoot.addElement(body);

        let id: number = Date.now();
        let today: string = this.tmxDateNow();
        for (let row of sheet.rows) {
            let nonEmptyCells: number = row.filter((cell: CellValue) => cell !== null && cell !== undefined && ('' + cell) !== '').length;
            if (nonEmptyCells < 2) {
                continue;
            }
            let tu: XMLElement = new XMLElement('tu');
            tu.setAttribute(new XMLAttribute('creationtool', this.appName));
            tu.setAttribute(new XMLAttribute('creationtoolversion', this.version));
            tu.setAttribute(new XMLAttribute('tuid', '' + (id++)));
            tu.setAttribute(new XMLAttribute('creationdate', today));
            for (let c: number = 0; c < langs.length; c++) {
                let tuv: XMLElement = new XMLElement('tuv');
                tuv.setAttribute(new XMLAttribute('xml:lang', langs[c]));
                tuv.setAttribute(new XMLAttribute('creationdate', today));
                let seg: XMLElement = new XMLElement('seg');
                let cell: CellValue = c < row.length ? row[c] : null;
                seg.addString(cell !== null && cell !== undefined ? '' + cell : '');
                tuv.addElement(seg);
                tu.addElement(tuv);
            }
            body.addElement(tu);
        }

        let indenter: Indenter = new Indenter(2);
        indenter.indent(tmxRoot);
        XMLWriter.writeDocument(tmx, tmxFile);
    }

    private tmxDateNow(): string {
        let now: Date = new Date();
        let pad = (n: number): string => (n < 10 ? '0' : '') + n;
        return '' + now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate())
            + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
    }
}
