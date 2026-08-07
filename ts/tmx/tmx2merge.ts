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
import { Catalog, Indenter, SAXParser, XMLAttribute, XMLElement } from "typesxml";
import { TmxUnitHandler } from "./tmxUnitHandler.js";
import { TmxUtils } from "./tmxUtils.js";

export class Tmx2Merge {

    private catalog: Catalog;

    constructor(private appName: string, private version: string, catalogFile: string) {
        this.catalog = new Catalog(catalogFile);
    }

    merge(mergedFile: string, files: string[]): number {
        writeFileSync(mergedFile, TmxUtils.prolog(), 'utf8');

        let header: XMLElement = this.buildHeader();
        let headerIndenter: Indenter = new Indenter(2, 1);
        headerIndenter.indent(header);
        appendFileSync(mergedFile, '  ' + header.toString() + '\n', 'utf8');
        appendFileSync(mergedFile, '  <body>\n', 'utf8');

        let tuIndenter: Indenter = new Indenter(2, 2);
        let count: number = 0;
        let handler: TmxUnitHandler = new TmxUnitHandler(
            () => { /* source headers are not reused */ },
            (tu: XMLElement) => {
                tuIndenter.indent(tu);
                appendFileSync(mergedFile, '    ' + tu.toString() + '\n', 'utf8');
                count++;
            }
        );
        for (let file of files) {
            let parser: SAXParser = new SAXParser();
            parser.setValidating(false);
            parser.setCatalog(this.catalog);
            parser.setContentHandler(handler);
            parser.parseFile(file);
        }

        appendFileSync(mergedFile, '  </body>\n</tmx>', 'utf8');
        return count;
    }

    private buildHeader(): XMLElement {
        let header: XMLElement = new XMLElement('header');
        header.setAttribute(new XMLAttribute('creationtool', this.appName));
        header.setAttribute(new XMLAttribute('creationtoolversion', this.version));
        header.setAttribute(new XMLAttribute('creationdate', this.tmxDateNow()));
        header.setAttribute(new XMLAttribute('srclang', '*all*'));
        header.setAttribute(new XMLAttribute('adminlang', 'en'));
        header.setAttribute(new XMLAttribute('datatype', 'xml'));
        header.setAttribute(new XMLAttribute('o-tmf', 'unknown'));
        header.setAttribute(new XMLAttribute('segtype', 'block'));
        return header;
    }

    private tmxDateNow(): string {
        let now: Date = new Date();
        let pad = (n: number): string => (n < 10 ? '0' : '') + n;
        return '' + now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate())
            + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
    }
}
