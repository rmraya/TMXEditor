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

import { Catalog, CData, ContentHandler, Grammar, ProcessingInstruction, TextNode, XMLAttribute, XMLComment, XMLElement } from "typesxml";

export class TmxUnitHandler implements ContentHandler {

    private stack: XMLElement[] = [];
    private inCdData: boolean = false;
    private currentCData: CData = new CData('');

    constructor(private onHeader: (header: XMLElement) => void, private onUnit: (tu: XMLElement) => void) {
    }

    initialize(): void {
        this.stack = [];
        this.inCdData = false;
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
        if (this.stack.length === 0 && name !== 'header' && name !== 'tu') {
            return;
        }
        let element: XMLElement = new XMLElement(name);
        for (let att of atts) {
            element.setAttribute(att);
        }
        if (this.stack.length > 0) {
            this.stack[this.stack.length - 1].addElement(element);
        }
        this.stack.push(element);
    }

    endElement(name: string): void {
        if (this.stack.length === 0) {
            return;
        }
        let element: XMLElement = this.stack.pop() as XMLElement;
        if (this.stack.length === 0) {
            if (name === 'header') {
                this.onHeader(element);
            } else if (name === 'tu') {
                this.onUnit(element);
            }
        }
    }

    internalSubset(declaration: string): void {
        // do nothing
    }

    characters(ch: string): void {
        if (this.stack.length === 0) {
            return;
        }
        if (this.inCdData) {
            this.currentCData.setValue(this.currentCData.getValue() + ch);
            return;
        }
        this.stack[this.stack.length - 1].addTextNode(new TextNode(ch));
    }

    ignorableWhitespace(ch: string): void {
        this.characters(ch);
    }

    comment(ch: string): void {
        if (this.stack.length === 0) {
            return;
        }
        this.stack[this.stack.length - 1].addComment(new XMLComment(ch));
    }

    processingInstruction(target: string, data: string): void {
        if (this.stack.length === 0) {
            return;
        }
        this.stack[this.stack.length - 1].addProcessingInstruction(new ProcessingInstruction(target, data));
    }

    startCDATA(): void {
        this.currentCData = new CData('');
        this.inCdData = true;
    }

    endCDATA(): void {
        if (this.stack.length > 0) {
            this.stack[this.stack.length - 1].addCData(this.currentCData);
        }
        this.inCdData = false;
    }

    startDTD(name: string, publicId: string, systemId: string): void {
        // do nothing, validation and schema loading are disabled
    }

    endDTD(): void {
        // do nothing
    }

    skippedEntity(name: string): void {
        this.characters('&' + name + ';');
    }

    getGrammar(): Grammar | undefined {
        return undefined;
    }

    setGrammar(grammar: Grammar | undefined): void {
        // do nothing
    }

    getCurrentText(): string {
        if (this.stack.length > 0) {
            return this.stack[this.stack.length - 1].pureText();
        }
        return '';
    }
}
