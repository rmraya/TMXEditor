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

import { appendFileSync, writeFileSync } from "node:fs";
import { Catalog, Indenter, SAXParser, XMLElement } from "typesxml";
import { TmxUnitHandler } from "./tmxUnitHandler.js";
import { TmxUtils } from "./tmxUtils.js";

export class Tmx2Split {

    private catalog: Catalog;

    constructor(catalogFile: string) {
        this.catalog = new Catalog(catalogFile);
    }

    split(tmxFile: string, parts: number): number {
        let total: number = this.countUnits(tmxFile);
        let unitsPerFile: number = Math.ceil(total / parts);
        this.writeSplitFiles(tmxFile, total, unitsPerFile);
        return total;
    }

    private countUnits(tmxFile: string): number {
        let count: number = 0;
        let handler: TmxUnitHandler = new TmxUnitHandler(
            () => { /* header not needed for counting */ },
            () => { count++; }
        );
        this.parse(tmxFile, handler);
        return count;
    }

    private writeSplitFiles(tmxFile: string, total: number, unitsPerFile: number): void {
        let baseName: string = tmxFile.toLowerCase().endsWith('.tmx') ? tmxFile.substring(0, tmxFile.length - 4) : tmxFile;
        let headerIndenter: Indenter = new Indenter(2, 1);
        let tuIndenter: Indenter = new Indenter(2, 2);

        let header: XMLElement | undefined;
        let currentPath: string = '';
        let writtenInFile: number = 0;
        let writtenTotal: number = 0;
        let fileCount: number = 1;

        let openFile = (): void => {
            currentPath = baseName + '_' + fileCount + '.tmx';
            fileCount++;
            writeFileSync(currentPath, TmxUtils.prolog(), 'utf8');
            if (header) {
                headerIndenter.indent(header);
                appendFileSync(currentPath, '  ' + header.toString() + '\n', 'utf8');
            }
            appendFileSync(currentPath, '  <body>\n', 'utf8');
            writtenInFile = 0;
        };

        let closeFile = (): void => {
            appendFileSync(currentPath, '  </body>\n</tmx>', 'utf8');
        };

        let handler: TmxUnitHandler = new TmxUnitHandler(
            (h: XMLElement) => {
                header = h;
                openFile();
            },
            (tu: XMLElement) => {
                tuIndenter.indent(tu);
                appendFileSync(currentPath, '    ' + tu.toString() + '\n', 'utf8');
                writtenInFile++;
                writtenTotal++;
                if (writtenInFile === unitsPerFile && writtenTotal < total) {
                    closeFile();
                    openFile();
                }
            }
        );
        this.parse(tmxFile, handler);
        if (currentPath !== '') {
            closeFile();
        }
    }

    private parse(tmxFile: string, handler: TmxUnitHandler): void {
        let parser: SAXParser = new SAXParser();
        parser.setValidating(false);
        parser.setCatalog(this.catalog);
        parser.setContentHandler(handler);
        parser.parseFile(tmxFile);
    }
}
