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
import { Language, LanguageUtils } from "typesbcp47";
import { CsvEncoding, CsvReader } from "./csvReader.js";
import { I18n } from "../i18n.js";

export interface CsvPreview {
    columns: number;
    rows: number;
    data: string[][];
    langs?: string[];
}

export class Csv2Tmx {

    private appName: string;
    private version: string;
    private locale: string;
    private i18n: I18n;

    constructor(appName: string, version: string, locale: string, resourcesFile: string) {
        this.appName = appName;
        this.version = version;
        this.locale = locale;
        this.i18n = new I18n(resourcesFile);
    }

    preview(csvFile: string, encoding: CsvEncoding, columnSeparator: string, textDelimiter: string): CsvPreview {
        let rows: string[][] = new CsvReader().readRows(csvFile, encoding, columnSeparator, textDelimiter);
        let columnCount: number = rows.length > 0 ? rows[0].length : 0;
        let preview: CsvPreview = {
            columns: columnCount,
            rows: rows.length,
            data: rows.slice(0, 10)
        };
        let langs: string[] | undefined = rows.length > 0 ? this.guessLanguages(rows[0], columnCount) : undefined;
        if (langs) {
            preview.langs = langs;
        }
        return preview;
    }

    private guessLanguages(firstRow: string[], columnCount: number): string[] | undefined {
        if (firstRow.length !== columnCount) {
            return undefined;
        }
        let langs: string[] = [];
        for (let cell of firstRow) {
            if (cell === '') {
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

    convert(csvFile: string, tmxFile: string, langs: string[], encoding: CsvEncoding, columnSeparator: string, textDelimiter: string): void {
        let rows: string[][] = new CsvReader().readRows(csvFile, encoding, columnSeparator, textDelimiter);

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
        header.setAttribute(new XMLAttribute('datatype', 'csv'));
        header.setAttribute(new XMLAttribute('o-tmf', 'csv'));
        header.setAttribute(new XMLAttribute('segtype', 'block'));
        tmxRoot.addElement(header);

        let body: XMLElement = new XMLElement('body');
        tmxRoot.addElement(body);

        let id: number = Date.now();
        let today: string = this.tmxDateNow();
        for (let row of rows) {
            if (row.length !== langs.length) {
                throw new Error(this.i18n.getString('csv2tmx', 'columnMismatch'));
            }
            let nonEmptyCells: number = row.filter((cell: string) => cell !== '').length;
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
                seg.addString(row[c]);
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
