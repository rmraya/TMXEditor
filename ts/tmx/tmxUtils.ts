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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { join } from 'node:path';
import { DOMBuilder, Indenter, SAXParser, TextNode, XMLAttribute, XMLElement, XMLUtils } from 'typesxml';

export class TmxUtils {

    private static readonly STYLE: string = "class='highlighted'";
    private static readonly SPACE: string = "class='spaces'";

    private static readonly builder: DOMBuilder = new DOMBuilder();
    private static readonly parser: SAXParser = TmxUtils.createFragmentParser();

    private static workFolder: string = '';
    private static maxTag: number = 0;

    private static createFragmentParser(): SAXParser {
        let parser: SAXParser = new SAXParser();
        parser.setValidating(false);
        parser.setContentHandler(TmxUtils.builder);
        return parser;
    }

    static prolog(): string {
        return '<?xml version="1.0" encoding="UTF-8"?>\n'
            + '<!DOCTYPE tmx PUBLIC "-//LISA OSCAR:1998//DTD for Translation Memory eXchange//EN" "tmx14.dtd">\n'
            + '<tmx version="1.4">\n';
    }

    static textOnly(seg: XMLElement | undefined): string {
        if (!seg) {
            return '';
        }
        let text: string = '';
        for (let node of seg.getContent()) {
            if (node instanceof TextNode) {
                text += node.getValue();
            } else if (node instanceof XMLElement) {
                let name: string = node.getName();
                if (name === 'sub' || name === 'hi') {
                    text += TmxUtils.textOnly(node);
                }
            }
        }
        return text;
    }

    static stripSegment(seg: XMLElement): XMLElement {
        let text: string = TmxUtils.textContent(seg).trim();
        return TmxUtils.parseElement('<seg>' + text + '</seg>');
    }

    private static textContent(element: XMLElement): string {
        let text: string = '';
        for (let node of element.getContent()) {
            if (node instanceof TextNode) {
                text += XMLUtils.cleanString(node.getValue());
            } else if (node instanceof XMLElement) {
                text += node.toString();
            }
        }
        return text;
    }

    static parseElement(text: string): XMLElement {
        TmxUtils.parser.parseString(text);
        let root: XMLElement | undefined = TmxUtils.builder.getDocument()?.getRoot();
        if (!root) {
            throw new Error('Could not parse stored XML fragment');
        }
        return root;
    }

    static setWorkFolder(folder: string): void {
        TmxUtils.workFolder = folder;
    }

    static resetTags(): void {
        TmxUtils.maxTag = 0;
    }

    static escapeHtml(text: string): string {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    }

    static tmxDate(): string {
        let now: Date = new Date();
        let pad = (n: number): string => (n < 10 ? '0' : '') + n;
        return '' + now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate())
            + 'T' + pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
    }

    static newFileContent(srcLang: string, tgtLang: string, appName: string, version: string): string {
        let creationId: string = userInfo().username;
        let creationDate: string = TmxUtils.tmxDate();

        let header: XMLElement = new XMLElement('header');
        header.setAttribute(new XMLAttribute('creationtool', appName));
        header.setAttribute(new XMLAttribute('creationtoolversion', version));
        header.setAttribute(new XMLAttribute('creationid', creationId));
        header.setAttribute(new XMLAttribute('creationdate', creationDate));
        header.setAttribute(new XMLAttribute('datatype', 'xml'));
        header.setAttribute(new XMLAttribute('segtype', 'block'));
        header.setAttribute(new XMLAttribute('adminlang', 'en'));
        header.setAttribute(new XMLAttribute('o-tmf', 'unknown'));
        header.setAttribute(new XMLAttribute('srclang', '*all*'));

        let tu: XMLElement = new XMLElement('tu');
        tu.setAttribute(new XMLAttribute('creationid', creationId));
        tu.setAttribute(new XMLAttribute('creationdate', creationDate));
        tu.setAttribute(new XMLAttribute('creationtool', appName));
        tu.setAttribute(new XMLAttribute('creationtoolversion', version));
        tu.addElement(TmxUtils.newTuv(srcLang, srcLang, creationId, creationDate));
        tu.addElement(TmxUtils.newTuv(tgtLang, tgtLang, creationId, creationDate));

        let headerIndenter: Indenter = new Indenter(2, 1);
        headerIndenter.indent(header);
        let tuIndenter: Indenter = new Indenter(2, 2);
        tuIndenter.indent(tu);

        return TmxUtils.prolog() + '  ' + header.toString() + '\n  <body>\n    ' + tu.toString() + '\n  </body>\n</tmx>';
    }

    private static newTuv(lang: string, segText: string, creationId: string, creationDate: string): XMLElement {
        let tuv: XMLElement = new XMLElement('tuv');
        tuv.setAttribute(new XMLAttribute('xml:lang', lang));
        tuv.setAttribute(new XMLAttribute('creationid', creationId));
        tuv.setAttribute(new XMLAttribute('creationdate', creationDate));
        let seg: XMLElement = new XMLElement('seg');
        seg.addString(segText);
        tuv.addElement(seg);
        return tuv;
    }

    static replaceTags(text: string): string {
        let source: string = text.replace(/&nbsp;/g, '\u00A0').replace(/<br>/g, '\n');
        let index: number = source.indexOf('<img ');
        let tagNumber: number = 0;
        let currentTags: string[] = [];
        while (index >= 0) {
            let start: string = source.substring(0, index);
            let rest: string = source.substring(index + 1);
            let end: number = rest.indexOf('>');
            let tag: string = '<' + rest.substring(0, end) + '>';
            currentTags.push(tag);
            source = start + '[[' + tagNumber + ']]' + rest.substring(end + 1);
            tagNumber++;
            index = source.indexOf('<img ');
        }
        for (let i: number = 0; i < currentTags.length; i++) {
            let tag: string = currentTags[i];
            let start: number = tag.indexOf('title="');
            let end: number = tag.indexOf('"', start + 7);
            let code: string = tag.substring(start + 7, end);
            source = source.replace('[[' + i + ']]', TmxUtils.restoreAngles(code));
        }
        return source;
    }

    private static restoreAngles(text: string): string {
        let result: string = text.replace(/\u200B\u2039/g, '<');
        result = result.replace(/\u200B\u203A/g, '>');
        result = result.replace(/\u200B\u2033/g, '"');
        return result.replace(/&amp;/g, '&');
    }

    static pureText(seg: XMLElement | undefined, clearTags: boolean, filterText: string | undefined,
        caseSensitive: boolean, regExp: boolean, filterLanguage: string | undefined): string {
        if (!seg) {
            return '';
        }
        if (clearTags) {
            TmxUtils.tagNumber = 1;
        }
        let text: string = '';
        for (let node of seg.getContent()) {
            if (node instanceof TextNode) {
                let value: string = node.getValue();
                if (filterText === undefined || filterText === '') {
                    text += TmxUtils.escapeHtml(value);
                } else if (regExp) {
                    text += TmxUtils.highlightRegExp(value, filterText);
                } else {
                    let cleaned: string = TmxUtils.escapeHtml(value);
                    let target: string = TmxUtils.escapeHtml(filterText);
                    if (caseSensitive) {
                        if (cleaned.indexOf(target) !== -1) {
                            text += TmxUtils.highlight(cleaned, target, caseSensitive, filterLanguage);
                        } else {
                            text += cleaned;
                        }
                    } else {
                        let locale: string = filterLanguage ? filterLanguage : 'en';
                        if (cleaned.toLocaleLowerCase(locale).indexOf(target.toLocaleLowerCase(locale)) !== -1) {
                            text += TmxUtils.highlight(cleaned, target, caseSensitive, filterLanguage);
                        } else {
                            text += cleaned;
                        }
                    }
                }
            } else if (node instanceof XMLElement) {
                let name: string = node.getName();
                if (name === 'sub' || name === 'hi') {
                    TmxUtils.checkSVG();
                    text += TmxUtils.tagImage(node.getHead());
                    TmxUtils.tagNumber++;
                    text += TmxUtils.pureText(node, false, filterText, caseSensitive, regExp, filterLanguage);
                    TmxUtils.checkSVG();
                    text += TmxUtils.tagImage(node.getTail());
                    TmxUtils.tagNumber++;
                } else {
                    TmxUtils.checkSVG();
                    let element: string = node.toString();
                    text += TmxUtils.tagImage(element);
                    TmxUtils.tagNumber++;
                }
            }
        }
        return TmxUtils.highlightSpaces(text);
    }

    private static tagNumber: number = 1;

    private static tagImage(markup: string): string {
        return "<img src='file://" + join(TmxUtils.workFolder, 'images', TmxUtils.tagNumber + '.svg')
            + "' align='bottom' alt='' title=\"" + TmxUtils.unquote(TmxUtils.cleanAngles(markup)) + "\"/>";
    }

    private static unquote(text: string): string {
        return text.replace(/"/g, '\u200B\u2033');
    }

    private static cleanAngles(text: string): string {
        let result: string = text.replace(/&/g, '&amp;');
        result = result.replace(/</g, '\u200B\u2039');
        result = result.replace(/>/g, '\u200B\u203A');
        return result;
    }

    private static checkSVG(): void {
        if (TmxUtils.tagNumber <= TmxUtils.maxTag) {
            return;
        }
        let folder: string = join(TmxUtils.workFolder, 'images');
        let colorsFile: string = join(folder, 'tagColors.json');
        if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
        }
        if (!existsSync(colorsFile)) {
            writeFileSync(colorsFile, JSON.stringify({ background: '#009688', foreground: '#ffffff' }, undefined, 2), 'utf8');
        }
        let svgFile: string = join(folder, TmxUtils.tagNumber + '.svg');
        if (!existsSync(svgFile)) {
            let colors: { background: string, foreground: string } = JSON.parse(readFileSync(colorsFile, 'utf8'));
            let width: number = 16;
            if (TmxUtils.tagNumber >= 10) {
                width = 22;
            }
            if (TmxUtils.tagNumber >= 100) {
                width = 28;
            }
            let svg: string = '<?xml version="1.0" encoding="UTF-8"?>'
                + '<svg xmlns="http://www.w3.org/2000/svg" width="' + (width + 1) + 'px" height="17px" version="1.1">\n'
                + '   <g>\n'
                + '      <rect style="fill:' + colors.background + '" width="' + width + 'px" height="16px" x="1" y="1" rx="3" ry="3" />\n'
                + '      <text style="font-size:12px;font-style:normal;font-weight:normal;text-align:center;font-family:Sans;"  x="6" y="14" fill="' + colors.foreground + '" fill-opacity="1">\n'
                + '         <tspan>' + TmxUtils.tagNumber + '</tspan>\n'
                + '      </text>\n'
                + '   </g>\n'
                + '</svg>';
            writeFileSync(svgFile, svg, 'utf8');
            TmxUtils.maxTag = TmxUtils.tagNumber;
        }
    }

    private static highlight(text: string, target: string, caseSensitive: boolean, filterLanguage: string | undefined): string {
        let result: string = text;
        let locale: string = filterLanguage ? filterLanguage : 'en';
        let start: number = -1;
        let replacement: string = "<span " + TmxUtils.STYLE + ">" + target + "</span>";
        if (caseSensitive) {
            start = result.indexOf(target);
        } else {
            start = result.toLocaleLowerCase(locale).indexOf(target.toLocaleLowerCase(locale));
            if (start !== -1) {
                replacement = "<span " + TmxUtils.STYLE + ">" + result.substring(start, start + target.length) + "</span>";
            }
        }
        while (start !== -1) {
            result = result.substring(0, start) + replacement + result.substring(start + target.length);
            start = start + replacement.length;
            if (caseSensitive) {
                start = result.indexOf(target, start);
            } else {
                start = result.toLocaleLowerCase(locale).indexOf(target.toLocaleLowerCase(locale), start);
                if (start !== -1) {
                    replacement = "<span " + TmxUtils.STYLE + ">" + result.substring(start, start + target.length) + "</span>";
                }
            }
        }
        return result;
    }

    private static highlightSpaces(text: string): string {
        if (text.trim() === text) {
            return text;
        }
        let result: string = text;
        let leading: string = '';
        for (let i: number = 0; i < result.length; i++) {
            let c: string = result.charAt(i);
            if (c === ' ' || c === '\u00A0' || c === '\t' || c === '\n' || c === '\r') {
                leading += c;
            } else {
                break;
            }
        }
        if (leading.length > 0) {
            result = "<span " + TmxUtils.SPACE + ">" + leading + "</span>" + result.substring(leading.length);
        }
        let trailing: string = '';
        for (let i: number = result.length - 1; i >= 0; i--) {
            let c: string = result.charAt(i);
            if (c === ' ' || c === '\u00A0' || c === '\t' || c === '\n' || c === '\r') {
                trailing = c + trailing;
            } else {
                break;
            }
        }
        if (trailing.length > 0) {
            result = result.substring(0, result.length - trailing.length) + "<span " + TmxUtils.SPACE + ">" + trailing + "</span>";
        }
        return result;
    }

    private static highlightRegExp(text: string, pattern: string): string {
        let regex: RegExp;
        try {
            regex = new RegExp(pattern, 'g');
        } catch (error) {
            return TmxUtils.escapeHtml(text);
        }
        let result: string = '';
        let lastIndex: number = 0;
        let found: boolean = false;
        let match: RegExpExecArray | null = regex.exec(text);
        while (match !== null) {
            found = true;
            result += TmxUtils.escapeHtml(text.substring(lastIndex, match.index));
            result += "<span " + TmxUtils.STYLE + ">";
            result += TmxUtils.escapeHtml(match[0]);
            result += "</span>";
            lastIndex = match.index + match[0].length;
            if (match[0].length === 0) {
                regex.lastIndex++;
            }
            match = regex.exec(text);
        }
        if (!found) {
            return TmxUtils.escapeHtml(text);
        }
        result += TmxUtils.escapeHtml(text.substring(lastIndex));
        return result;
    }
}
