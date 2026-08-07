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

import { Catalog, SAXParser } from "typesxml";
import { CellValue, ExcelSheet, ExcelWriter } from "typesexcel";
import { TmxLanguagesHandler } from "../tmx/tmxLanguagesHandler.js";
import { TmxExcelHandler } from "../tmx/tmxExcelHandler.js";

export class Tmx2Excel {

    private catalog: Catalog;

    constructor(catalogFile: string) {
        this.catalog = new Catalog(catalogFile);
    }

    convert(tmxFile: string, excelFile: string): number {
        let languages: string[] = this.harvestLanguages(tmxFile);
        let rows: CellValue[][] = this.harvestRows(tmxFile, languages);

        let sheet: ExcelSheet = new ExcelSheet('Sheet1', languages, rows, { boldHeader: true });
        new ExcelWriter('en').writeFile(excelFile, sheet);
        return rows.length;
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
