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

import { Catalog, ContentHandler, Grammar, XMLAttribute } from "typesxml";

export class TmxLanguagesHandler implements ContentHandler {

    languages: Set<string> = new Set();

    initialize(): void {
        this.languages = new Set();
    }

    setCatalog(catalog: Catalog): void {
        // not needed, DTD/schema loading is disabled
    }

    startDocument(): void {
        // do nothing
    }

    endDocument(): void {
        // do nothing
    }

    xmlDeclaration(version: string, encoding: string, standalone: string | undefined): void {
        // do nothing
    }

    startElement(name: string, atts: XMLAttribute[]): void {
        if (name !== 'tuv') {
            return;
        }
        for (let att of atts) {
            if (att.getName() === 'xml:lang' || att.getName() === 'lang') {
                this.languages.add(att.getValue());
            }
        }
    }

    endElement(name: string): void {
        // do nothing
    }

    internalSubset(declaration: string): void {
        // do nothing
    }

    characters(ch: string): void {
        // do nothing
    }

    ignorableWhitespace(ch: string): void {
        // do nothing
    }

    comment(ch: string): void {
        // do nothing
    }

    processingInstruction(target: string, data: string): void {
        // do nothing
    }

    startCDATA(): void {
        // do nothing
    }

    endCDATA(): void {
        // do nothing
    }

    startDTD(name: string, publicId: string, systemId: string): void {
        // do nothing, validation and schema loading are disabled
    }

    endDTD(): void {
        // do nothing
    }

    skippedEntity(name: string): void {
        // do nothing
    }

    getGrammar(): Grammar | undefined {
        return undefined;
    }

    setGrammar(grammar: Grammar | undefined): void {
        // do nothing
    }

    getCurrentText(): string {
        return '';
    }
}
