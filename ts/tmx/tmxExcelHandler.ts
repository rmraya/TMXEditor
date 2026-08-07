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
import { CellValue } from "typesexcel";

interface InlineFrame {
    capture: boolean;
}

export class TmxExcelHandler implements ContentHandler {

    rows: CellValue[][] = [];

    private columnIndex: Map<string, number> = new Map();
    private currentRow: CellValue[] = [];

    private inTuv: boolean = false;
    private currentLang: string = '';

    private inSeg: boolean = false;
    private segText: string = '';
    private inlineStack: InlineFrame[] = [];

    constructor(languages: string[]) {
        for (let i = 0; i < languages.length; i++) {
            this.columnIndex.set(languages[i], i);
        }
    }

    initialize(): void {
        this.rows = [];
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
        if (this.inSeg) {
            let capturing: boolean = this.currentCapture();
            this.inlineStack.push({ capture: capturing ? (name === 'sub' || name === 'hi') : false });
            return;
        }
        if (name === 'tu') {
            this.currentRow = new Array(this.columnIndex.size).fill('');
        } else if (name === 'tuv') {
            this.inTuv = true;
            this.currentLang = '';
            for (let att of atts) {
                if (att.getName() === 'xml:lang' || att.getName() === 'lang') {
                    this.currentLang = att.getValue();
                }
            }
        } else if (name === 'seg' && this.inTuv) {
            this.inSeg = true;
            this.segText = '';
            this.inlineStack = [];
        }
    }

    endElement(name: string): void {
        if (this.inSeg && name !== 'seg') {
            this.inlineStack.pop();
            return;
        }
        if (name === 'seg' && this.inSeg) {
            this.inSeg = false;
            let index: number | undefined = this.columnIndex.get(this.currentLang);
            if (index !== undefined) {
                this.currentRow[index] = this.segText;
            }
            return;
        }
        if (name === 'tuv') {
            this.inTuv = false;
        } else if (name === 'tu') {
            this.rows.push(this.currentRow);
        }
    }

    private currentCapture(): boolean {
        if (this.inlineStack.length === 0) {
            return true;
        }
        return this.inlineStack[this.inlineStack.length - 1].capture;
    }

    internalSubset(declaration: string): void {
        // do nothing
    }

    characters(ch: string): void {
        if (this.inSeg && this.currentCapture()) {
            this.segText += ch;
        }
    }

    ignorableWhitespace(ch: string): void {
        this.characters(ch);
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
        return this.inSeg ? this.segText : '';
    }
}
