import { Catalog, ContentHandler, Grammar, ValidationResult, XMLAttribute, XMLElement } from "typesxml";
import { Language, LanguageUtils } from "typesbcp47";
import { I18n } from "../i18n.js";

export class ValidatingHandler implements ContentHandler {

    i18n: I18n;

    private current: XMLElement | null;
    private stack: Array<XMLElement>;
    private xMap: Map<string, Set<string>>;
    private inCDATA: boolean;
    private srcLang: string;
    private root: XMLElement | null;
    private ids: Map<string, string>;
    private balance: number;
    private version: string;
    private currentLang: string;
    private grammar: Grammar | undefined;
    private hasHeader: boolean = false;
    private hasBody: boolean = false;

    constructor(i18n: I18n) {
        this.i18n = i18n;
        this.current = null;
        this.stack = [];
        this.xMap = new Map();
        this.inCDATA = false;
        this.srcLang = '';
        this.root = null;
        this.ids = new Map();
        this.balance = 0;
        this.version = '';
        this.currentLang = '';
    }

    initialize(): void {
        this.current = null;
        this.stack = [];
        this.xMap = new Map();
        this.inCDATA = false;
        this.srcLang = '';
        this.root = null;
        this.ids = new Map();
        this.balance = 0;
        this.version = '';
        this.currentLang = '';
        this.grammar = undefined;
        this.hasHeader = false;
        this.hasBody = false;
    }

    startCDATA(): void {
        this.inCDATA = true;
    }

    endCDATA(): void {
        this.inCDATA = false;
    }

    getGrammar(): Grammar | undefined {
        return this.grammar;
    }

    setGrammar(grammar: Grammar | undefined): void {
        this.grammar = grammar;
    }

    startDocument(): void {
        // ignore
    }

    endDocument(): void {
        this.stack = [];
    }

    xmlDeclaration(version: string, encoding: string, standalone: string | undefined): void {
        // ignore
    }

    internalSubset(declaration: string): void {
        // ignore
    }

    startDTD(name: string, publicId: string, systemId: string): void {
        // ignore
    }

    endDTD(): void {
        // ignore
    }

    setCatalog(catalog: Catalog): void {
        // ignore
    }

    startElement(name: string, atts: Array<XMLAttribute>): void {
        let element: XMLElement = new XMLElement(name);
        for (let att of atts) {
            element.setAttribute(att);
        }
        if (this.current === null) {
            if (this.root !== null && name !== "tu") {
                throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "invalidbodyelement"), [name]));
            }
            this.current = element;
            this.stack.push(this.current);
        } else {
            this.current.addElement(element);
            this.stack.push(this.current);
            this.current = element;
        }
        if (this.root === null) {
            if (name === "tmx") {
                this.root = this.current;
                this.version = this.getAttrValue(this.current, "version");
                if (this.version === '') {
                    throw new Error(this.i18n.getString("validatinghandler", "missingversion"));
                }
                let validVersions: string[] = ['1.1', '1.2', '1.3', '1.4'];
                if (!validVersions.includes(this.version)) {
                    throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "incorrectversion"), [this.version]));
                }
            } else {
                throw new Error(this.i18n.getString("validatinghandler", "notmxdoc"));
            }
        }
        if (name === "header") {
            this.hasHeader = true;
            this.srcLang = this.getAttrValue(this.current, "srclang");
            if (this.srcLang === '') {
                throw new Error(this.i18n.getString("validatinghandler", "nosrclang"));
            }
            if (this.srcLang !== "*all*") {
                if (!this.checkLang(this.srcLang)) {
                    throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "invalidsrclang"), [this.srcLang]));
                }
            }
        }
        if (name === "body") {
            if (!this.hasHeader) {
                throw new Error(this.i18n.getString("validatinghandler", "bodybeforeheader"));
            }
            this.hasBody = true;
        }
        if (name === "tu") {
            this.xMap = new Map();
        }
        if (name === "tuv") {
            let xmlLang: string = this.getAttrValue(this.current, "xml:lang");
            this.currentLang = xmlLang !== '' ? xmlLang : this.getAttrValue(this.current, "lang");
        }
        if (this.grammar) {
            let attMap: Map<string, string> = new Map();
            for (let att of atts) {
                attMap.set(att.getName(), att.getValue());
            }
            let attResult: ValidationResult = this.grammar.validateAttributes(name, attMap);
            if (!attResult.isValid) {
                throw new Error(attResult.errors[0].message);
            }
        }
        if (this.current.hasAttribute("x") && (name === "bpt" || name === "it" || name === "ph" || name === "hi")) {
            let x: string = this.getAttrValue(this.current, "x");
            if (!this.isNumber(x)) {
                throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "invalidxattr"), [x]));
            }
            let set: Set<string> | undefined = this.xMap.get(this.currentLang);
            if (!set) {
                set = new Set<string>();
                this.xMap.set(this.currentLang, set);
            }
            if (set.has(name + x)) {
                throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "duplicatexattr"), [x, name]));
            }
            set.add(name + x);
        }
    }

    endElement(name: string): void {
        if (name === "tmx" && !this.hasBody) {
            throw new Error(this.i18n.getString("validatinghandler", "missingbody"));
        }
        if (this.current === null) {
            return;
        }
        let attributes: Array<XMLAttribute> = this.current.getAttributes();
        for (let a of attributes) {
            let attrName: string = a.getName();
            let value: string = a.getValue();
            if (attrName === "lang" || attrName === "adminlang" || attrName === "xml:lang") {
                if (!this.checkLang(value)) {
                    throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "invalidlang"), [value]));
                }
            }
            if (attrName === "usagecount" && !this.isNumber(value)) {
                throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "invalidusagecount"), [value]));
            }
            if ((attrName === "lastusagedate" || attrName === "changedate" || attrName === "creationdate") && !ValidatingHandler.checkDate(value)) {
                throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "invaliddateformat"), [value]));
            }
        }
        if (this.grammar) {
            let childNames: string[] = this.current.getChildren().map(c => c.getName());
            let elemResult: ValidationResult = this.grammar.validateElement(this.current.getName(), '', childNames, this.getCurrentText());
            if (!elemResult.isValid) {
                throw new Error(elemResult.errors[0].message);
            }
        }
        if (this.current.getName() === "seg") {
            this.balance = 0;
            this.ids = new Map();
            this.recurse(this.current);
            if (this.balance !== 0) {
                throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "unbalancedbptept"), [this.current.toString()]));
            }
            if (this.ids.size > 0) {
                for (let value of this.ids.values()) {
                    if (value !== "0") {
                        throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "unmatchedbptept"), [this.current.toString()]));
                    }
                }
            }
        }
        if (name === "tu") {
            if (this.srcLang !== "*all*") {
                this.checkLanguageVariants(this.current);
            }
            let xKeys: Array<string> = Array.from(this.xMap.keys());
            if (xKeys.length > 0) {
                let tuvCount: number = this.current.getChildren().filter(c => c.getName() === "tuv").length;
                if (tuvCount !== xKeys.length) {
                    throw new Error(this.i18n.getString("validatinghandler", "incorrectxmatching"));
                }
                let xValues: Set<string> | undefined = this.xMap.get(this.currentLang);
                if (xValues) {
                    for (let key of xKeys) {
                        let langSet: Set<string> = this.xMap.get(key)!;
                        if (langSet.size !== xValues.size || ![...xValues].every(v => langSet.has(v))) {
                            throw new Error(this.i18n.getString("validatinghandler", "incorrectxmatching"));
                        }
                    }
                }
            }
            this.current = null;
            this.stack = [];
        }
        if (this.stack.length > 0) {
            this.current = this.stack.pop()!;
        }
    }

    getCurrentText(): string {
        return this.current !== null ? this.current.pureText() : '';
    }

    characters(ch: string): void {
        if (!this.inCDATA && this.current !== null) {
            this.current.addString(ch);
        }
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

    notationDecl(name: string, publicId: string | undefined, systemId: string | undefined): void {
        // ignore
    }

    unparsedEntityDecl(name: string, publicId: string | undefined, systemId: string | undefined, notationName: string): void {
        // ignore
    }

    skippedEntity(name: string): void {
        // ignore
    }

    private checkLanguageVariants(tu: XMLElement): void {
        let variants: Array<XMLElement> = tu.getChildren().filter(c => c.getName() === "tuv");
        let found: boolean = false;
        for (let tuv of variants) {
            if (found) {
                break;
            }
            let lang: string = this.getAttrValue(tuv, "xml:lang");
            if (lang === '' && (this.version === "1.1" || this.version === "1.2")) {
                lang = this.getAttrValue(tuv, "lang");
            }
            if (lang === '') {
                throw new Error(this.i18n.getString("validatinghandler", "tuvnolang"));
            }
            if (lang.toLowerCase() === this.srcLang.toLowerCase()) {
                found = true;
            }
        }
        if (!found) {
            throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "tuvmissingsrclang"), [this.srcLang]));
        }
    }

    private recurse(element: XMLElement): void {
        for (let e of element.getChildren()) {
            if (e.getName() === "bpt") {
                this.balance += 1;
                if (this.version === "1.4") {
                    let s: string = this.getAttrValue(e, "i");
                    if (!this.isNumber(s)) {
                        throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "invalidibpt"), [element.toString()]));
                    }
                    if (!this.ids.has(s)) {
                        this.ids.set(s, "1");
                    } else {
                        if (this.ids.get(s) === "-1") {
                            this.ids.set(s, "0");
                        } else {
                            throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "duplicateibpt"), [element.toString()]));
                        }
                    }
                }
            }
            if (e.getName() === "ept") {
                this.balance -= 1;
                if (this.version === "1.4") {
                    let s: string = this.getAttrValue(e, "i");
                    if (!this.isNumber(s)) {
                        throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "invalidiept"), [element.toString()]));
                    }
                    if (!this.ids.has(s)) {
                        this.ids.set(s, "-1");
                    } else {
                        if (this.ids.get(s) === "1") {
                            this.ids.set(s, "0");
                        } else {
                            throw new Error(this.i18n.format(this.i18n.getString("validatinghandler", "mismatchedi"), [element.toString()]));
                        }
                    }
                }
            }
            this.recurse(e);
        }
    }

    private checkLang(lang: string): boolean {
        if (lang.startsWith("x-") || lang.startsWith("X-")) {
            return true;
        }
        let language: Language | undefined = LanguageUtils.getLanguage(lang, 'en');
        if (!language) {
            return false;
        }
        return language.getCode().toLowerCase() === lang.toLowerCase();
    }

    private static checkDate(date: string): boolean {
        if (date.length !== 16) {
            return false;
        }
        if (date.charAt(8) !== 'T') {
            return false;
        }
        if (date.charAt(15) !== 'Z') {
            return false;
        }
        try {
            let year: number = parseInt(date.charAt(0) + date.charAt(1) + date.charAt(2) + date.charAt(3), 10);
            if (isNaN(year) || year < 0) {
                return false;
            }
            let month: number = parseInt(date.charAt(4) + date.charAt(5), 10);
            if (isNaN(month) || month < 1 || month > 12) {
                return false;
            }
            let day: number = parseInt(date.charAt(6) + date.charAt(7), 10);
            if (isNaN(day)) {
                return false;
            }
            if (month === 1 || month === 3 || month === 5 || month === 7 || month === 8 || month === 10 || month === 12) {
                if (day < 1 || day > 31) {
                    return false;
                }
            } else if (month === 4 || month === 6 || month === 9 || month === 11) {
                if (day < 1 || day > 30) {
                    return false;
                }
            } else if (month === 2) {
                if (year % 4 === 0) {
                    if (year % 100 === 0) {
                        if (year % 400 === 0) {
                            if (day < 1 || day > 29) {
                                return false;
                            }
                        } else {
                            if (day < 1 || day > 28) {
                                return false;
                            }
                        }
                    } else {
                        if (day < 1 || day > 29) {
                            return false;
                        }
                    }
                } else if (day < 1 || day > 28) {
                    return false;
                }
            } else {
                return false;
            }
            let hour: number = parseInt(date.charAt(9) + date.charAt(10), 10);
            if (isNaN(hour) || hour < 0 || hour > 23) {
                return false;
            }
            let min: number = parseInt(date.charAt(11) + date.charAt(12), 10);
            if (isNaN(min) || min < 0 || min > 59) {
                return false;
            }
            let sec: number = parseInt(date.charAt(13) + date.charAt(14), 10);
            if (isNaN(sec) || sec < 0 || sec > 59) {
                return false;
            }
        } catch (e) {
            return false;
        }
        return true;
    }

    private isNumber(s: string): boolean {
        if (s === '') {
            return false;
        }
        return !isNaN(Number(s));
    }

    private getAttrValue(element: XMLElement, name: string): string {
        let att: XMLAttribute | undefined = element.getAttribute(name);
        return att ? att.getValue() : '';
    }
}