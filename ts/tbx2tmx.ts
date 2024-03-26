/*******************************************************************************
 * Copyright (c) 2018-2024 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { XMLDocumentType, XMLElement, XMLDocument, SAXParser, DOMBuilder, XMLAttribute, XMLNode, TextNode, Constants, Indenter, XMLWriter } from "typesxml";

export class Tbx2Tmx {

    tmx: XMLDocument;
    tmxRoot: XMLElement;
    header: XMLElement;
    body: XMLElement;
    currentTU: XMLElement;
    currentTUV: XMLElement;
    currentSeg: XMLElement;
    currentLang: string;
    inTUV: boolean;
    tuvNotes: Array<XMLElement>;

    constructor(appName: string, version: string) {
        this.tmx = new XMLDocument();
        this.tmx.setDocumentType(new XMLDocumentType('tmx', '-//LISA OSCAR:1998//DTD for Translation Memory eXchange//EN', 'tmx14.dtd'));
        this.tmxRoot = new XMLElement('tmx');
        this.tmx.setRoot(this.tmxRoot);
        this.tmxRoot.setAttribute(new XMLAttribute('version', '1.4'));
        this.header = new XMLElement('header');
        this.header.setAttribute(new XMLAttribute('creationtool', appName));
        this.header.setAttribute(new XMLAttribute('creationtoolversion', version));
        this.header.setAttribute(new XMLAttribute('srclang', '*all*'));
        this.header.setAttribute(new XMLAttribute('adminlang', 'en'));
        this.header.setAttribute(new XMLAttribute('datatype', 'xml'));
        this.header.setAttribute(new XMLAttribute('o-tmf', 'TBX'));
        this.header.setAttribute(new XMLAttribute('segtype', 'block'));
        this.tmxRoot.addElement(this.header);
        this.body = new XMLElement('body');
        this.tmxRoot.addElement(this.body);
    }

    convert(tbxFile: string, tmxFile: string): void {
        let saxParser: SAXParser = new SAXParser();
        let contentHandler: DOMBuilder = new DOMBuilder();
        saxParser.setContentHandler(contentHandler);
        saxParser.parseFile(tbxFile);
        let root: XMLElement = contentHandler.getDocument().getRoot();
        this.recurse(root);
        this.export(tmxFile);
    }

    recurse(e: XMLElement): void {
        if ('tbx' === e.getName()) {
            let tbxLang: string = e.getAttribute("xml:lang").getValue();
            if (tbxLang) {
                this.header.setAttribute(new XMLAttribute('srclang', tbxLang));
            }
        }
        if ('sourceDesc' === e.getName() || 'publicationStmt' === e.getName()) {
            let notes:string[] = getHeaderNotes(e);
            if (notes.length > 0) {
                for (let note of notes) {
                    let noteElement: XMLElement = new XMLElement('note');
                    noteElement.addString(note);
                    this.header.addElement(noteElement);
                }
            }
        }
        if ('termEntry' === e.getName() || 'conceptEntry' === e.getName()) {
            this.currentTU = new XMLElement('tu');
            let id = e.getAttribute("id");
            if (id) {
                this.currentTU.setAttribute(new XMLAttribute('tuid', id.getValue()));
            }
            this.body.addElement(this.currentTU);
            this.inTUV = false;
        }
        if ('langSet' === e.getName() || 'langSec' === e.getName()) {
            this.currentLang = e.getAttribute("xml:lang").getValue();
            this.tuvNotes = new Array();
        }
        if ('tig' === e.getName() || 'termGrp' === e.getName() || 'termSec' === e.getName()) {
            this.currentTUV = new XMLElement('tuv');
            this.currentTUV.setAttribute(new XMLAttribute('xml:lang', this.currentLang));
            if (this.tuvNotes.length > 0) {
                for (let note of this.tuvNotes) {
                    this.currentTUV.addElement(note);
                }
            }
            this.currentTU.addElement(this.currentTUV);
            this.inTUV = true;
        }
        if ('term' === e.getName()) {
            this.currentSeg = new XMLElement("seg");
            this.currentTUV.addElement(this.currentSeg);
            let content: Array<XMLNode> = e.getContent();
            for (let n of content) {
                if (n.getNodeType() === Constants.TEXT_NODE) {
                    this.currentSeg.addTextNode(n as TextNode);
                }
                if (n.getNodeType() === Constants.ELEMENT_NODE) {
                    this.recurse(n as XMLElement);
                }
                return;
            }
        }
        if ("descrip" === e.getName()) {
            let note: XMLElement = new XMLElement('note');
            note.addString(e.getText());
            if (this.inTUV) {
                this.tuvNotes.push(note);
            } else {
                let content: Array<XMLNode> = this.currentTU.getContent();
                content.splice(0, 0, note);
                this.currentTU.setContent(content);
            }
        }
        if ('termNote' === e.getName()) {
            let type: string = e.getAttribute("type").getValue();
            if (type !== '') {
                let prop: XMLElement = new XMLElement('prop');
                prop.setAttribute(new XMLAttribute('type', type));
                prop.addString(e.getText());
                let content: Array<XMLNode> = this.currentTUV.getContent();
                content.splice(0, 0, prop);
                this.currentTUV.setContent(content);
            }
        }
        if ('hi' === e.getName()) {
            let content: Array<XMLNode> = this.currentTUV.getContent();
            for (let n of content) {
                if (n.getNodeType() === Constants.TEXT_NODE) {
                    this.currentSeg.addTextNode(n as TextNode);
                }
                if (n.getNodeType() === Constants.ELEMENT_NODE) {
                    this.recurse(n as XMLElement);
                }
            }
            return;
        }
        if ('note' === e.getName()) {
            let note: XMLElement = new XMLElement('note');
            note.addString(e.getText());
            if (this.inTUV) {
                let content: Array<XMLNode> = this.currentTUV.getContent();
                content.splice(0, 0, note);
                this.currentTUV.setContent(content);
            } else {
                let content: Array<XMLNode> = this.currentTU.getContent();
                content.splice(0, 0, note);
                this.currentTU.setContent(content);
            }
        }
        let children: Array<XMLElement> = e.getChildren();
        for (let child of children) {
            this.recurse(child);
        }
        if ('tig' === e.getName() || 'termGrp' === e.getName() || 'termSec' === e.getName()) {
            this.inTUV = false;
        }
    }

    export(tmxFile: string): void {
        let indenter: Indenter = new Indenter(2);
        indenter.indent(this.tmxRoot);
        XMLWriter.writeDocument(this.tmx, tmxFile);
    }
}

function getHeaderNotes(e: XMLElement): string[] {
    let notes: string[] = new Array();
    e.getChildren().forEach(child => {
        if ('p' === child.getName()) {
            notes.push(child.getText());
        }
    });
    return notes;
}
