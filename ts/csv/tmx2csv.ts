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

import { writeFileSync } from "node:fs";
import { Catalog, SAXParser } from "typesxml";
import { CellValue } from "typesexcel";
import { TmxLanguagesHandler } from "../tmx/tmxLanguagesHandler.js";
import { TmxExcelHandler } from "../tmx/tmxExcelHandler.js";

export class Tmx2Csv {

    private catalog: Catalog;

    constructor(catalogFile: string) {
        this.catalog = new Catalog(catalogFile);
    }

    convert(tmxFile: string, csvFile: string): number {
        let languages: string[] = this.harvestLanguages(tmxFile);
        let rows: CellValue[][] = this.harvestRows(tmxFile, languages);

        let lines: string[] = [languages.join('\t')];
        for (let row of rows) {
            lines.push(row.map((cell: CellValue) => this.cleanCell(cell)).join('\t'));
        }
        let text: string = lines.join('\n') + '\n';

        let bom: Buffer = Buffer.from([0xFF, 0xFE]);
        let body: Buffer = Buffer.from(text, 'utf16le');
        writeFileSync(csvFile, Buffer.concat([bom, body]));

        return rows.length;
    }

    private cleanCell(cell: CellValue): string {
        let text: string = cell !== null && cell !== undefined ? '' + cell : '';
        if (text === '') {
            return ' ';
        }
        return text.replace(/\n/g, ' ').replace(/\t/g, ' ');
    }

    private harvestLanguages(tmxFile: string): string[] {
        let handler: TmxLanguagesHandler = new TmxLanguagesHandler();
        let parser: SAXParser = new SAXParser();
        parser.setValidating(false);
        parser.setCatalog(this.catalog);
        parser.setContentHandler(handler);
        parser.parseFile(tmxFile);
        return Array.from(handler.languages).sort();
    }

    private harvestRows(tmxFile: string, languages: string[]): CellValue[][] {
        let handler: TmxExcelHandler = new TmxExcelHandler(languages);
        let parser: SAXParser = new SAXParser();
        parser.setValidating(false);
        parser.setCatalog(this.catalog);
        parser.setContentHandler(handler);
        parser.parseFile(tmxFile);
        return handler.rows;
    }
}
