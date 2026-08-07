/*******************************************************************************
 * Copyright (c) 2005-2026 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { Catalog, ContentHandler, Grammar, XMLAttribute } from "typesxml";
import { I18n } from "../i18n.js";

export class CustomError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CustomError';
    }
}

export class VersionHandler implements ContentHandler {

    version: string = "";
    hasDoctype: boolean = false;
    i18n: I18n;

    constructor(i18n: I18n) {
        this.i18n = i18n;
    }

    getCurrentText(): string {
        return '';
    }

    initialize(): void {
        // ignore
    }

    startElement(name: string, attributes: Array<XMLAttribute>): void {
        if (name === "tmx") {
            for (let attribute of attributes) {
                if (attribute.getName() === "version") {
                    this.version = attribute.getValue();
                }
            }
            throw new CustomError('Finished');
        } else {
            let message: string = this.i18n.format(this.i18n.getString("versionhandler", "unexpectedroot"), [name]);
            throw new Error(message);
        }
    }

    getVersion(): string {
        return this.version;
    }

    hasDoctypeDeclaration(): boolean {
        return this.hasDoctype;
    }

    endElement(name: string): void {
    }

    setCatalog(catalog: Catalog): void {
        // ignore
    }

    startDocument(): void {
        // ignore
    }

    endDocument(): void {
        // ignore
    }

    xmlDeclaration(version: string, encoding: string, standalone: string | undefined): void {
        // ignore
    }

    internalSubset(declaration: string): void {
        // ignore
    }

    characters(ch: string): void {
        // ignore
    }

    ignorableWhitespace(ch: string): void {
        // ignore
    }

    comment(ch: string): void {
        // ignore
    }

    processingInstruction(target: string, data: string): void {
        // ignore
    }

    startCDATA(): void {
        // ignore
    }

    endCDATA(): void {
        // ignore
    }

    startDTD(name: string, publicId: string, systemId: string): void {
        this.hasDoctype = true;
    }

    endDTD(): void {
        // ignore
    }

    skippedEntity(name: string): void {
        // ignore
    }

    getGrammar(): Grammar | undefined {
        return undefined
    }

    setGrammar(grammar: Grammar | undefined): void {
        // ignore
    }

}