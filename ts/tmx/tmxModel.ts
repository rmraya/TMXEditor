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

import { appendFileSync, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { DatabaseSync, StatementSync } from 'node:sqlite';
import { Worker } from 'node:worker_threads';
import { LanguageUtils } from 'typesbcp47';
import { Indenter, TextNode, XMLAttribute, XMLElement } from 'typesxml';
import { TmxSchema } from './tmxSchema.js';
import { TmxUtils } from './tmxUtils.js';

export interface SegmentFilter {
    filterText?: string;
    filterLanguage?: string;
    caseSensitiveFilter?: boolean;
    regExp?: boolean;
    filterUntranslated?: boolean;
    filterSrcLanguage?: string;
    sortLanguage?: string;
    ascending?: boolean;
    caseSensitiveSort?: boolean;
}

export interface TuData {
    attributes: [string, string][];
    properties: [string, string][];
    notes: string[];
}

export class TMXModel {

    private database: DatabaseSync;
    private header: XMLElement;
    private languages: string[];
    private saved: boolean = true;
    private selectTU: StatementSync;
    private selectTUS: StatementSync;
    private selectTuvByLang: Map<string, StatementSync> = new Map();
    private selectPureByLang: Map<string, StatementSync> = new Map();
    private updateTuvByLang: Map<string, StatementSync> = new Map();
    private selectCount: StatementSync;
    private insertTU: StatementSync;
    private insertTUV: StatementSync;
    private updateTUStatement: StatementSync;
    private deleteTU: StatementSync;
    private deleteTUV: StatementSync;
    private selectMaxPosition: StatementSync;
    private setChangeId: boolean;

    constructor(databasePath: string, header: XMLElement, languages: string[], setChangeId: boolean = false) {
        this.database = new DatabaseSync(databasePath, { enableForeignKeyConstraints: true, timeout: 5000 });
        this.header = header;
        for (let attribute of this.header.getAttributes().filter((a: XMLAttribute) => a.getValue() === '')) {
            this.header.removeAttribute(attribute.getName());
        }
        this.languages = languages;
        this.setChangeId = setChangeId;
        TmxSchema.createSchema(this.database, this.languages);
        this.registerFunctions();
        this.selectTU = this.database.prepare('SELECT tu FROM tu WHERE id = ?');
        this.selectTUS = this.database.prepare('SELECT id, position FROM tu WHERE position >= ? ORDER BY position');
        this.selectCount = this.database.prepare('SELECT COUNT(*) AS count FROM tu');
        this.insertTU = this.database.prepare('INSERT INTO tu (id, tu, position) VALUES (?, ?, ?)');
        this.insertTUV = this.database.prepare('INSERT INTO tuv (id) VALUES (?)');
        this.updateTUStatement = this.database.prepare('UPDATE tu SET tu = ? WHERE id = ?');
        this.deleteTU = this.database.prepare('DELETE FROM tu WHERE id = ?');
        this.deleteTUV = this.database.prepare('DELETE FROM tuv WHERE id = ?');
        for (let lang of this.languages) {
            let prefix: string = TmxSchema.columnPrefix(lang);
            this.selectTuvByLang.set(lang, this.database.prepare('SELECT ' + prefix + '_tuv AS value FROM tuv WHERE id = ?'));
            this.selectPureByLang.set(lang, this.database.prepare('SELECT ' + prefix + '_pure AS value FROM tuv WHERE id = ?'));
            this.updateTuvByLang.set(lang, this.database.prepare('UPDATE tuv SET ' + prefix + '_pure=?, ' + prefix + '_tuv=? WHERE id=?'));
        }
        this.selectMaxPosition = this.database.prepare('SELECT MAX(position) AS maxPosition FROM tu');
    }

    private registerFunctions(): void {
        this.database.function('TEXT_MATCHES', { deterministic: true }, (value: unknown, pattern: unknown, caseSensitive: unknown) => {
            try {
                let regex: RegExp = new RegExp(String(pattern), caseSensitive ? '' : 'i');
                return regex.test(value === null || value === undefined ? '' : String(value)) ? 1 : 0;
            } catch (error) {
                return 0;
            }
        });
        this.database.function('TEXT_MATCH_COUNT', { deterministic: true }, (value: unknown, pattern: unknown, caseSensitive: unknown) => {
            try {
                let regex: RegExp = new RegExp(String(pattern), (caseSensitive ? '' : 'i') + 'g');
                let matches: RegExpMatchArray | null = (value === null || value === undefined ? '' : String(value)).match(regex);
                return matches ? matches.length : 0;
            } catch (error) {
                return 0;
            }
        });
        this.database.function('TEXT_REPLACE', { deterministic: true }, (value: unknown, pattern: unknown, caseSensitive: unknown, replacement: unknown) => {
            let original: string = value === null || value === undefined ? '' : String(value);
            try {
                let regex: RegExp = new RegExp(String(pattern), (caseSensitive ? '' : 'i') + 'g');
                return original.replace(regex, String(replacement));
            } catch (error) {
                return original;
            }
        });
        this.database.function('LOCALE_LOWER', { deterministic: true }, (value: unknown, locale: unknown) => {
            let original: string = value === null || value === undefined ? '' : String(value);
            try {
                return original.toLocaleLowerCase(String(locale));
            } catch (error) {
                return original.toLowerCase();
            }
        });
        this.database.function('TEXT_CONTAINS', { deterministic: true }, (value: unknown, target: unknown, caseSensitive: unknown, locale: unknown) => {
            let original: string = value === null || value === undefined ? '' : String(value);
            let search: string = target === null || target === undefined ? '' : String(target);
            if (caseSensitive) {
                return original.indexOf(search) !== -1 ? 1 : 0;
            }
            try {
                let loc: string = String(locale);
                return original.toLocaleLowerCase(loc).indexOf(search.toLocaleLowerCase(loc)) !== -1 ? 1 : 0;
            } catch (error) {
                return original.toLowerCase().indexOf(search.toLowerCase()) !== -1 ? 1 : 0;
            }
        });
    }

    saveFile(outputFile: string): void {
        writeFileSync(outputFile, TmxUtils.prolog(), 'utf8');

        let headerIndenter: Indenter = new Indenter(2, 1);
        headerIndenter.indent(this.header);
        appendFileSync(outputFile, '  ' + this.header.toString() + '\n', 'utf8');
        appendFileSync(outputFile, '  <body>\n', 'utf8');

        let tuIndenter: Indenter = new Indenter(2, 2);
        this.database.exec('BEGIN');
        let rows: unknown[] = this.selectTUS.all(0);
        for (let row of rows as Record<string, unknown>[]) {
            let id: string = String(row.id);
            let tu: XMLElement | undefined = this.getTu(id);
            if (!tu) {
                continue;
            }
            let count: number = 0;
            for (let lang of this.languages) {
                let tuv: XMLElement | undefined = this.getTuv(id, lang);
                if (tuv) {
                    tu.addElement(tuv);
                    count++;
                }
            }
            if (count === 0) {
                continue;
            }
            tuIndenter.indent(tu);
            appendFileSync(outputFile, '    ' + tu.toString() + '\n', 'utf8');
        }
        this.database.exec('COMMIT');
        appendFileSync(outputFile, '  </body>\n</tmx>', 'utf8');
        this.saved = true;
    }

    private getTu(id: string): XMLElement | undefined {
        let row: Record<string, unknown> | undefined = this.selectTU.get(id) as Record<string, unknown> | undefined;
        return row && typeof row.tu === 'string' ? TmxUtils.parseElement(row.tu) : undefined;
    }

    private getTuv(id: string, lang: string): XMLElement | undefined {
        let stmt: StatementSync | undefined = this.selectTuvByLang.get(lang);
        if (!stmt) {
            return undefined;
        }
        let row: Record<string, unknown> | undefined = stmt.get(id) as Record<string, unknown> | undefined;
        if (!row || typeof row.value !== 'string' || row.value === '') {
            return undefined;
        }
        let tuv: XMLElement = TmxUtils.parseElement(row.value);
        tuv.setAttribute(new XMLAttribute('xml:lang', lang));
        return tuv;
    }

    getSrcLanguage(): string {
        let attribute: XMLAttribute | undefined = this.header.getAttribute('srclang');
        return attribute ? attribute.getValue() : '';
    }

    setSrcLanguage(srcLang: string): void {
        this.header.setAttribute(new XMLAttribute('srclang', srcLang));
        this.saved = false;
    }

    getFileProperties(): { attributes: Record<string, string>, properties: [string, string][], notes: string[] } {
        let value = (name: string): string => this.header.getAttribute(name)?.getValue() ?? '';
        let attributes: Record<string, string> = {
            creationid: value('creationid'),
            creationdate: value('creationdate'),
            creationtool: value('creationtool'),
            creationtoolversion: value('creationtoolversion'),
            segtype: value('segtype'),
            o_tmf: value('o-tmf'),
            adminlang: value('adminlang'),
            srclang: value('srclang'),
            datatype: value('datatype'),
            changedate: value('changedate'),
            changeid: value('changeid'),
            o_encoding: value('o-encoding')
        };
        let properties: [string, string][] = this.header.getChildren()
            .filter((e: XMLElement) => e.getName() === 'prop')
            .map((e: XMLElement): [string, string] => [e.getAttribute('type')?.getValue() ?? '', e.getText()]);
        let notes: string[] = this.header.getChildren()
            .filter((e: XMLElement) => e.getName() === 'note')
            .map((e: XMLElement) => e.getText());
        return { attributes: attributes, properties: properties, notes: notes };
    }

    setFileAttributes(attributes: Record<string, string>): void {
        for (let key of Object.keys(attributes)) {
            let value: string = attributes[key];
            let name: string = key === 'o_encoding' ? 'o-encoding' : key === 'o_tmf' ? 'o-tmf' : key;
            if (value === '') {
                if (this.header.hasAttribute(name)) {
                    this.header.removeAttribute(name);
                }
            } else {
                this.header.setAttribute(new XMLAttribute(name, value));
            }
        }
        this.saved = false;
    }

    setFileProperties(properties: [string, string][]): void {
        for (let prop of this.header.getChildren().filter((e: XMLElement) => e.getName() === 'prop')) {
            this.header.removeChild(prop);
        }
        for (let [type, text] of properties) {
            let prop: XMLElement = new XMLElement('prop');
            prop.setAttribute(new XMLAttribute('type', type));
            prop.addString(text);
            this.header.addElement(prop);
        }
        this.saved = false;
    }

    setFileNotes(notes: string[]): void {
        for (let note of this.header.getChildren().filter((e: XMLElement) => e.getName() === 'note')) {
            this.header.removeChild(note);
        }
        for (let text of notes) {
            let note: XMLElement = new XMLElement('note');
            note.addString(text);
            this.header.addElement(note);
        }
        this.saved = false;
    }

    getTuData(id: string): TuData | undefined {
        let tu: XMLElement | undefined = this.getTu(id);
        if (!tu) {
            return undefined;
        }
        let attributes: [string, string][] = tu.getAttributes().map((a: XMLAttribute): [string, string] => [a.getName(), a.getValue()]);
        attributes.sort((a: [string, string], b: [string, string]) => a[0].localeCompare(b[0]));
        let properties: [string, string][] = tu.getChildren()
            .filter((e: XMLElement) => e.getName() === 'prop')
            .map((e: XMLElement): [string, string] => [e.getAttribute('type')?.getValue() ?? '', e.getText()]);
        properties.sort((a: [string, string], b: [string, string]) => a[0].localeCompare(b[0]));
        let notes: string[] = tu.getChildren()
            .filter((e: XMLElement) => e.getName() === 'note')
            .map((e: XMLElement) => e.getText());
        return { attributes: attributes, properties: properties, notes: notes };
    }

    getTuvData(id: string, lang: string): TuData {
        let tuv: XMLElement | undefined = this.getTuv(id, lang);
        if (!tuv) {
            return { attributes: [['xml:lang', lang]], properties: [], notes: [] };
        }
        let attributes: [string, string][] = tuv.getAttributes().map((a: XMLAttribute): [string, string] => [a.getName(), a.getValue()]);
        let properties: [string, string][] = tuv.getChildren()
            .filter((e: XMLElement) => e.getName() === 'prop')
            .map((e: XMLElement): [string, string] => [e.getAttribute('type')?.getValue() ?? '', e.getText()]);
        let notes: string[] = tuv.getChildren()
            .filter((e: XMLElement) => e.getName() === 'note')
            .map((e: XMLElement) => e.getText());
        return { attributes: attributes, properties: properties, notes: notes };
    }

    saveTuvData(id: string, lang: string, value: string): string {
        let text: string = TmxUtils.replaceTags(value);
        let tuv: XMLElement | undefined = this.getTuv(id, lang);
        if (tuv) {
            let seg: XMLElement | undefined = tuv.getChild('seg');
            if (!seg) {
                seg = new XMLElement('seg');
                tuv.addElement(seg);
            }
            try {
                let parsed: XMLElement = TmxUtils.parseElement('<seg>' + text + '</seg>');
                seg.setContent(parsed.getContent());
            } catch (error) {
                seg.setContent([]);
                seg.addString(text);
            }
            if (this.setChangeId) {
                tuv.setAttribute(new XMLAttribute('changeid', userInfo().username));
                tuv.setAttribute(new XMLAttribute('changedate', TmxUtils.tmxDate()));
            }
        } else {
            tuv = new XMLElement('tuv');
            tuv.setAttribute(new XMLAttribute('xml:lang', lang));
            tuv.setAttribute(new XMLAttribute('creationid', userInfo().username));
            tuv.setAttribute(new XMLAttribute('creationdate', TmxUtils.tmxDate()));
            let seg: XMLElement = new XMLElement('seg');
            seg.addString(text);
            tuv.addElement(seg);
        }
        this.updateTuv(id, lang, tuv);
        this.saved = false;
        return TmxUtils.pureText(tuv.getChild('seg'), true, undefined, false, false, lang);
    }

    private updateTuv(id: string, lang: string, tuv: XMLElement): void {
        let stmt: StatementSync | undefined = this.updateTuvByLang.get(lang);
        if (!stmt) {
            return;
        }
        stmt.run(TmxUtils.textOnly(tuv.getChild('seg')), tuv.toString(), id);
    }

    private updateTU(id: string, tu: XMLElement): void {
        this.updateTUStatement.run(tu.toString(), id);
    }

    setAttributes(id: string, lang: string, attributes: [string, string][]): void {
        let attrs: XMLAttribute[] = attributes.map(([name, value]: [string, string]) => new XMLAttribute(name, value));
        if (lang === '') {
            let tu: XMLElement | undefined = this.getTu(id);
            if (!tu) {
                return;
            }
            tu.setAttributes(attrs);
            this.updateTU(id, tu);
        } else {
            let tuv: XMLElement | undefined = this.getTuv(id, lang);
            if (!tuv) {
                return;
            }
            tuv.setAttributes(attrs);
            this.updateTuv(id, lang, tuv);
        }
        this.saved = false;
    }

    setProperties(id: string, lang: string, properties: [string, string][]): void {
        let props: XMLElement[] = properties
            .filter(([type, text]: [string, string]) => type !== '' && text !== '')
            .map(([type, text]: [string, string]): XMLElement => {
                let prop: XMLElement = new XMLElement('prop');
                prop.setAttribute(new XMLAttribute('type', type));
                prop.addString(text);
                return prop;
            });
        if (lang === '') {
            let tu: XMLElement | undefined = this.getTu(id);
            if (!tu) {
                return;
            }
            let notes: XMLElement[] = tu.getChildren().filter((e: XMLElement) => e.getName() === 'note');
            tu.setContent([...props, ...notes]);
            if (this.setChangeId) {
                tu.setAttribute(new XMLAttribute('changeid', userInfo().username));
                tu.setAttribute(new XMLAttribute('changedate', TmxUtils.tmxDate()));
            }
            this.updateTU(id, tu);
        } else {
            let tuv: XMLElement | undefined = this.getTuv(id, lang);
            if (!tuv) {
                return;
            }
            for (let prop of tuv.getChildren().filter((e: XMLElement) => e.getName() === 'prop')) {
                tuv.removeChild(prop);
            }
            let content: XMLElement[] = tuv.getChildren();
            for (let prop of props) {
                content = [prop, ...content];
            }
            tuv.setContent(content);
            if (this.setChangeId) {
                tuv.setAttribute(new XMLAttribute('changeid', userInfo().username));
                tuv.setAttribute(new XMLAttribute('changedate', TmxUtils.tmxDate()));
            }
            this.updateTuv(id, lang, tuv);
        }
        this.saved = false;
    }

    setNotes(id: string, lang: string, notes: string[]): void {
        let noteElements: XMLElement[] = notes
            .filter((text: string) => text !== '')
            .map((text: string): XMLElement => {
                let note: XMLElement = new XMLElement('note');
                note.addString(text);
                return note;
            });
        if (lang === '') {
            let tu: XMLElement | undefined = this.getTu(id);
            if (!tu) {
                return;
            }
            let props: XMLElement[] = tu.getChildren().filter((e: XMLElement) => e.getName() === 'prop');
            tu.setContent([...props, ...noteElements]);
            if (this.setChangeId) {
                tu.setAttribute(new XMLAttribute('changeid', userInfo().username));
                tu.setAttribute(new XMLAttribute('changedate', TmxUtils.tmxDate()));
            }
            this.updateTU(id, tu);
        } else {
            let tuv: XMLElement | undefined = this.getTuv(id, lang);
            if (!tuv) {
                return;
            }
            for (let note of tuv.getChildren().filter((e: XMLElement) => e.getName() === 'note')) {
                tuv.removeChild(note);
            }
            let content: XMLElement[] = tuv.getChildren();
            for (let note of noteElements) {
                content = [note, ...content];
            }
            tuv.setContent(content);
            if (this.setChangeId) {
                tuv.setAttribute(new XMLAttribute('changeid', userInfo().username));
                tuv.setAttribute(new XMLAttribute('changedate', TmxUtils.tmxDate()));
            }
            this.updateTuv(id, lang, tuv);
        }
        this.saved = false;
    }

    insertUnit(id: string, creationTool: string, creationToolVersion: string): void {
        let tu: XMLElement = new XMLElement('tu');
        tu.setAttribute(new XMLAttribute('tuid', id));
        tu.setAttribute(new XMLAttribute('creationdate', TmxUtils.tmxDate()));
        tu.setAttribute(new XMLAttribute('creationid', userInfo().username));
        tu.setAttribute(new XMLAttribute('creationtool', creationTool));
        tu.setAttribute(new XMLAttribute('creationtoolversion', creationToolVersion));
        let maxPositionRow: Record<string, unknown> = this.selectMaxPosition.get() as Record<string, unknown>;
        let position: number = maxPositionRow.maxPosition === null ? 0 : Number(maxPositionRow.maxPosition) + 1;
        this.insertTU.run(id, tu.toString(), position);
        this.insertTUV.run(id);
        this.saved = false;
    }

    deleteUnits(ids: string[]): void {
        this.database.exec('BEGIN');
        for (let id of ids) {
            this.deleteTU.run(id);
            this.deleteTUV.run(id);
        }
        this.database.exec('COMMIT');
        this.saved = false;
    }

    removeUntranslated(srcLang: string): number {
        let prefix: string = TmxSchema.columnPrefix(srcLang);
        let rows: unknown[] = this.database.prepare('SELECT * FROM tuv WHERE ' + prefix + '_pure IS NOT NULL').all();
        let result: number = 0;
        this.database.exec('BEGIN');
        for (let row of rows as Record<string, unknown>[]) {
            let sourceValue: unknown = row[prefix + '_pure'];
            if (typeof sourceValue !== 'string' || sourceValue.trim() === '') {
                continue;
            }
            let id: string = String(row.id);
            let translated: boolean = false;
            for (let lang of this.languages) {
                if (lang === srcLang) {
                    continue;
                }
                let value: unknown = row[TmxSchema.columnPrefix(lang) + '_pure'];
                if (typeof value === 'string' && value.trim() !== '') {
                    translated = true;
                    break;
                }
            }
            if (!translated) {
                this.deleteTU.run(id);
                this.deleteTUV.run(id);
                result++;
            }
        }
        this.database.exec('COMMIT');
        if (result > 0) {
            this.saved = false;
        }
        return result;
    }

    removeSameAsSource(srcLang: string): void {
        let rows: unknown[] = this.selectTUS.all(0);
        this.database.exec('BEGIN');
        for (let row of rows as Record<string, unknown>[]) {
            let id: string = String(row.id);
            let srcTuv: XMLElement | undefined = this.getTuv(id, srcLang);
            if (!srcTuv) {
                continue;
            }
            let src: XMLElement | undefined = srcTuv.getChild('seg');
            if (!src) {
                continue;
            }
            let count: number = 0;
            for (let lang of this.languages) {
                if (lang === srcLang) {
                    continue;
                }
                let tuv: XMLElement | undefined = this.getTuv(id, lang);
                if (!tuv) {
                    continue;
                }
                let tgt: XMLElement | undefined = tuv.getChild('seg');
                if (tgt && src.equals(tgt)) {
                    this.clearTuv(id, lang);
                } else {
                    count++;
                }
            }
            if (count === 0) {
                this.deleteTU.run(id);
                this.deleteTUV.run(id);
            }
        }
        this.database.exec('COMMIT');
        this.saved = false;
    }

    private clearTuv(id: string, lang: string): void {
        let stmt: StatementSync | undefined = this.updateTuvByLang.get(lang);
        if (!stmt) {
            return;
        }
        stmt.run('', '', id);
    }

    removeTags(): void {
        let rows: unknown[] = this.selectTUS.all(0);
        this.database.exec('BEGIN');
        for (let row of rows as Record<string, unknown>[]) {
            let id: string = String(row.id);
            for (let lang of this.languages) {
                let tuv: XMLElement | undefined = this.getTuv(id, lang);
                if (!tuv) {
                    continue;
                }
                let seg: XMLElement | undefined = tuv.getChild('seg');
                if (!seg || seg.getChildren().length === 0) {
                    continue;
                }
                let text: string = TmxUtils.textOnly(seg);
                seg.setContent([]);
                seg.addString(text);
                if (this.setChangeId) {
                    tuv.setAttribute(new XMLAttribute('changeid', userInfo().username));
                    tuv.setAttribute(new XMLAttribute('changedate', TmxUtils.tmxDate()));
                }
                this.updateTuv(id, lang, tuv);
            }
        }
        this.database.exec('COMMIT');
        this.saved = false;
    }

    removeDuplicates(): void {
        let orderBy: string = this.languages.map((lang: string) => TmxSchema.columnPrefix(lang) + '_pure').join(', ');
        let rows: unknown[] = this.database.prepare('SELECT * FROM tuv ORDER BY ' + orderBy).all();
        let lastSegments: Map<string, XMLElement> = new Map();
        this.database.exec('BEGIN');
        for (let row of rows as Record<string, unknown>[]) {
            let id: string = String(row.id);
            let segments: Map<string, XMLElement> = new Map();
            for (let lang of this.languages) {
                let value: unknown = row[TmxSchema.columnPrefix(lang) + '_tuv'];
                if (typeof value === 'string' && value !== '') {
                    let tuv: XMLElement = TmxUtils.parseElement(value);
                    let seg: XMLElement | undefined = tuv.getChild('seg');
                    if (seg) {
                        segments.set(lang, seg);
                    }
                }
            }
            if (this.segmentsEqual(segments, lastSegments)) {
                this.deleteTU.run(id);
                this.deleteTUV.run(id);
            } else {
                lastSegments = segments;
            }
        }
        this.database.exec('COMMIT');
        this.saved = false;
    }

    private segmentsEqual(a: Map<string, XMLElement>, b: Map<string, XMLElement>): boolean {
        if (a.size !== b.size) {
            return false;
        }
        for (let [lang, seg] of a) {
            let other: XMLElement | undefined = b.get(lang);
            if (!other || !seg.equals(other)) {
                return false;
            }
        }
        return true;
    }

    removeSpaces(): void {
        let rows: unknown[] = this.database.prepare('SELECT * FROM tuv').all();
        this.database.exec('BEGIN');
        for (let row of rows as Record<string, unknown>[]) {
            let id: string = String(row.id);
            for (let lang of this.languages) {
                let prefix: string = TmxSchema.columnPrefix(lang);
                let pure: unknown = row[prefix + '_pure'];
                if (typeof pure !== 'string' || pure === pure.trim()) {
                    continue;
                }
                let tuvValue: unknown = row[prefix + '_tuv'];
                if (typeof tuvValue !== 'string' || tuvValue === '') {
                    continue;
                }
                let tuv: XMLElement = TmxUtils.parseElement(tuvValue);
                let seg: XMLElement | undefined = tuv.getChild('seg');
                if (!seg) {
                    continue;
                }
                seg.setContent(TmxUtils.stripSegment(seg).getContent());
                if (this.setChangeId) {
                    tuv.setAttribute(new XMLAttribute('changeid', userInfo().username));
                    tuv.setAttribute(new XMLAttribute('changedate', TmxUtils.tmxDate()));
                }
                this.updateTuv(id, lang, tuv);
            }
        }
        this.database.exec('COMMIT');
        this.saved = false;
    }

    consolidateUnits(srcLang: string): void {
        let prefix: string = TmxSchema.columnPrefix(srcLang);
        let rows: unknown[] = this.database.prepare('SELECT * FROM tuv WHERE ' + prefix + '_pure IS NOT NULL ORDER BY ' + prefix + '_pure').all();
        let lastSegments: Map<string, XMLElement> = new Map();
        let lastId: string = '';
        let first: boolean = true;
        this.database.exec('BEGIN');
        for (let row of rows as Record<string, unknown>[]) {
            let sourcePure: unknown = row[prefix + '_pure'];
            if (typeof sourcePure !== 'string' || sourcePure.trim() === '') {
                continue;
            }
            let id: string = String(row.id);
            let segments: Map<string, XMLElement> = new Map();
            for (let lang of this.languages) {
                let value: unknown = row[TmxSchema.columnPrefix(lang) + '_tuv'];
                if (typeof value === 'string' && value !== '') {
                    segments.set(lang, TmxUtils.parseElement(value));
                }
            }
            if (first) {
                lastSegments = segments;
                lastId = id;
                first = false;
                continue;
            }
            let currentSrcSeg: XMLElement | undefined = segments.get(srcLang)?.getChild('seg');
            let lastSrcSeg: XMLElement | undefined = lastSegments.get(srcLang)?.getChild('seg');
            if (currentSrcSeg && lastSrcSeg && currentSrcSeg.equals(lastSrcSeg)) {
                for (let lang of this.languages) {
                    if (lang === srcLang) {
                        continue;
                    }
                    let a: XMLElement | undefined = lastSegments.get(lang);
                    let b: XMLElement | undefined = segments.get(lang);
                    if (!a && b) {
                        lastSegments.set(lang, b);
                        if (this.setChangeId) {
                            b.setAttribute(new XMLAttribute('changeid', userInfo().username));
                            b.setAttribute(new XMLAttribute('changedate', TmxUtils.tmxDate()));
                        }
                        this.updateTuv(lastId, lang, b);
                        this.clearTuv(id, lang);
                    }
                }
            } else {
                lastSegments = segments;
                lastId = id;
            }
        }
        this.database.exec('COMMIT');
        this.saved = false;
        this.removeUntranslated(srcLang);
    }

    changeLanguage(oldLanguage: string, newLanguage: string): void {
        if (!this.languages.includes(oldLanguage) || this.languages.includes(newLanguage)) {
            return;
        }
        let oldPrefix: string = TmxSchema.columnPrefix(oldLanguage);
        let newPrefix: string = TmxSchema.columnPrefix(newLanguage);
        this.database.exec('ALTER TABLE tuv RENAME COLUMN ' + oldPrefix + '_pure TO ' + newPrefix + '_pure;');
        this.database.exec('ALTER TABLE tuv RENAME COLUMN ' + oldPrefix + '_tuv TO ' + newPrefix + '_tuv;');

        this.languages.splice(this.languages.indexOf(oldLanguage), 1);
        this.languages.push(newLanguage);

        this.selectTuvByLang.delete(oldLanguage);
        this.selectPureByLang.delete(oldLanguage);
        this.updateTuvByLang.delete(oldLanguage);
        this.selectTuvByLang.set(newLanguage, this.database.prepare('SELECT ' + newPrefix + '_tuv AS value FROM tuv WHERE id = ?'));
        this.selectPureByLang.set(newLanguage, this.database.prepare('SELECT ' + newPrefix + '_pure AS value FROM tuv WHERE id = ?'));
        this.updateTuvByLang.set(newLanguage, this.database.prepare('UPDATE tuv SET ' + newPrefix + '_pure=?, ' + newPrefix + '_tuv=? WHERE id=?'));

        this.saved = false;
    }

    addLanguage(lang: string): void {
        if (this.languages.includes(lang)) {
            return;
        }
        let prefix: string = TmxSchema.columnPrefix(lang);
        this.database.exec('ALTER TABLE tuv ADD COLUMN ' + prefix + '_pure TEXT;');
        this.database.exec('ALTER TABLE tuv ADD COLUMN ' + prefix + '_tuv TEXT;');

        this.languages.push(lang);
        this.selectTuvByLang.set(lang, this.database.prepare('SELECT ' + prefix + '_tuv AS value FROM tuv WHERE id = ?'));
        this.selectPureByLang.set(lang, this.database.prepare('SELECT ' + prefix + '_pure AS value FROM tuv WHERE id = ?'));
        this.updateTuvByLang.set(lang, this.database.prepare('UPDATE tuv SET ' + prefix + '_pure=?, ' + prefix + '_tuv=? WHERE id=?'));

        this.saved = false;
    }

    removeLanguage(lang: string): void {
        if (!this.languages.includes(lang)) {
            return;
        }
        let prefix: string = TmxSchema.columnPrefix(lang);
        this.database.exec('ALTER TABLE tuv DROP COLUMN ' + prefix + '_pure;');
        this.database.exec('ALTER TABLE tuv DROP COLUMN ' + prefix + '_tuv;');

        this.languages.splice(this.languages.indexOf(lang), 1);
        this.selectTuvByLang.delete(lang);
        this.selectPureByLang.delete(lang);
        this.updateTuvByLang.delete(lang);

        this.saved = false;
    }

    getLanguages(): string[] {
        return this.languages;
    }

    getCount(): number {
        let row: Record<string, unknown> = this.selectCount.get() as Record<string, unknown>;
        return Number(row.count);
    }

    getSegments(start: number, count: number, filter?: SegmentFilter): string[] {
        let filterText: string | undefined = filter?.filterText;
        let filterLanguage: string | undefined = filter?.filterLanguage;
        let caseSensitiveFilter: boolean = filter?.caseSensitiveFilter ?? false;
        let regExp: boolean = filter?.regExp ?? false;
        let filterUntranslated: boolean = filter?.filterUntranslated ?? false;
        let filterSrcLanguage: string | undefined = filter?.filterSrcLanguage;
        let sortLanguage: string | undefined = filter?.sortLanguage;
        let ascending: boolean = filter?.ascending ?? true;
        let caseSensitiveSort: boolean = filter?.caseSensitiveSort ?? false;

        let sortOption: string = 'position';
        let sortParams: (string | number)[] = [];
        if (sortLanguage) {
            let sortColumn: string = TmxSchema.columnPrefix(sortLanguage) + '_pure';
            if (!caseSensitiveSort) {
                sortColumn = 'LOCALE_LOWER(' + sortColumn + ', ?)';
                sortParams = [sortLanguage];
            }
            sortOption = sortColumn + ' ' + (ascending ? 'ASC' : 'DESC') + ', position';
        }

        let where: string = '';
        let whereParams: (string | number)[] = [];
        if (filterText) {
            let prefix: string = TmxSchema.columnPrefix(filterLanguage as string);
            if (regExp) {
                where = ' WHERE TEXT_MATCHES(tuv.' + prefix + '_pure, ?, ?)';
                whereParams = [filterText, caseSensitiveFilter ? 1 : 0];
            } else {
                where = ' WHERE TEXT_CONTAINS(tuv.' + prefix + '_pure, ?, ?, ?)';
                whereParams = [filterText, caseSensitiveFilter ? 1 : 0, filterLanguage as string];
            }
        }

        let wide: boolean = filterUntranslated;
        let limit: string = wide ? ' LIMIT -1 OFFSET ?' : ' LIMIT ? OFFSET ?';
        let sql: string = 'SELECT tu.id, tu.position FROM tu JOIN tuv ON tu.id = tuv.id' + where + ' ORDER BY ' + sortOption + limit;
        let statement: StatementSync = this.database.prepare(sql);
        let params: (string | number)[] = whereParams.concat(sortParams).concat(wide ? [start] : [count, start]);
        let rows: unknown[] = statement.all(...params);

        let result: string[] = [];
        let processed: number = 0;
        for (let row of rows as Record<string, unknown>[]) {
            let id: string = String(row.id);

            if (filterUntranslated) {
                let translated: boolean = false;
                for (let lang of this.languages) {
                    if (filterSrcLanguage && lang === filterSrcLanguage) {
                        continue;
                    }
                    if (this.getPureText(id, lang) !== '') {
                        translated = true;
                        break;
                    }
                }
                if (translated) {
                    continue;
                }
            }

            result.push(this.buildRow(id, Number(row.position) + 1, filterText, filterLanguage, caseSensitiveFilter, regExp));
            processed++;
            if (processed >= count) {
                break;
            }
        }
        return result;
    }

    private buildRow(id: string, position: number, filterText: string | undefined, filterLanguage: string | undefined,
        caseSensitiveFilter: boolean, regExp: boolean): string {
        let html: string = '<tr id="' + id + '" data-position="' + (position - 1) + '"><td class=\'fixed\'><input type=\'checkbox\' class=\'rowCheck\'></td><td class=\'fixed\'>' + position + '</td>';
        for (let lang of this.languages) {
            let seg: XMLElement | undefined = this.getTuv(id, lang)?.getChild('seg');
            let text: string = TmxUtils.pureText(seg, true, filterText, caseSensitiveFilter, regExp, filterLanguage);
            let dir: string = LanguageUtils.isBiDi(lang) ? ' dir=\'rtl\'' : '';
            html += '<td class="lang" lang="' + lang + '"' + dir + '>' + text + '</td>';
        }
        html += '</tr>';
        return html;
    }

    private getPureText(id: string, lang: string): string {
        let stmt: StatementSync | undefined = this.selectPureByLang.get(lang);
        if (!stmt) {
            return '';
        }
        let row: Record<string, unknown> | undefined = stmt.get(id) as Record<string, unknown> | undefined;
        return row && typeof row.value === 'string' ? row.value : '';
    }

    searchText(text: string, startPosition: number, startLangIndex: number, caseSensitive: boolean, useRegex: boolean): { id: string, position: number, lang: string } | null {
        if (this.languages.length === 0) {
            return null;
        }
        let pattern: string = useRegex ? text : this.escapeRegExp(text);
        let caseArg: number = caseSensitive ? 1 : 0;
        let branches: string[] = [];
        let params: (string | number)[] = [];
        for (let i: number = 0; i < this.languages.length; i++) {
            let prefix: string = TmxSchema.columnPrefix(this.languages[i]);
            branches.push('SELECT tu.id AS id, tu.position AS position, ' + i + ' AS lang_index FROM tu JOIN tuv ON tu.id = tuv.id WHERE TEXT_MATCHES(tuv.' + prefix + '_pure, ?, ?)');
            params.push(pattern, caseArg);
        }
        let sql: string = 'WITH matches AS (' + branches.join(' UNION ALL ') + ') '
            + 'SELECT id, position, lang_index FROM matches '
            + 'ORDER BY '
            + '  CASE WHEN (position > ? OR (position = ? AND lang_index >= ?)) THEN 0 ELSE 1 END, '
            + '  position, lang_index '
            + 'LIMIT 1';
        let allParams: (string | number)[] = [...params, startPosition, startPosition, startLangIndex];
        let row: Record<string, unknown> | undefined = this.database.prepare(sql).get(...allParams) as Record<string, unknown> | undefined;
        if (!row) {
            return null;
        }
        return { id: String(row.id), position: Number(row.position), lang: this.languages[Number(row.lang_index)] };
    }

    replaceAll(searchText: string, replaceText: string, caseSensitive: boolean, useRegex: boolean): number {
        let pattern: string = useRegex ? searchText : this.escapeRegExp(searchText);
        let caseArg: number = caseSensitive ? 1 : 0;
        let regex: RegExp = new RegExp(pattern, (caseSensitive ? '' : 'i') + 'g');
        let total: number = 0;
        for (let lang of this.languages) {
            let prefix: string = TmxSchema.columnPrefix(lang);
            let rows: unknown[] = this.database.prepare('SELECT id FROM tuv WHERE TEXT_MATCHES(' + prefix + '_pure, ?, ?)').all(pattern, caseArg);
            for (let row of rows as Record<string, unknown>[]) {
                let id: string = String(row.id);
                let tuv: XMLElement | undefined = this.getTuv(id, lang);
                if (!tuv) {
                    continue;
                }
                let seg: XMLElement | undefined = tuv.getChild('seg');
                if (!seg) {
                    continue;
                }
                let matchesBefore: number = (TmxUtils.textOnly(seg).match(regex) || []).length;
                if (matchesBefore === 0) {
                    continue;
                }
                this.replaceInSeg(seg, regex, replaceText);
                this.updateTuv(id, lang, tuv);
                total += matchesBefore;
            }
        }
        if (total > 0) {
            this.saved = false;
        }
        return total;
    }

    private replaceInSeg(seg: XMLElement, regex: RegExp, replacement: string): void {
        for (let node of seg.getContent()) {
            if (node instanceof TextNode) {
                node.setValue(node.getValue().replace(regex, replacement));
            } else if (node instanceof XMLElement) {
                let name: string = node.getName();
                if (name === 'sub' || name === 'hi') {
                    this.replaceInSeg(node, regex, replacement);
                }
            }
        }
    }

    private escapeRegExp(text: string): string {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    isModified(): boolean {
        return !this.saved;
    }

    close(): void {
        this.database.close();
    }

    static open(sourceFile: string, databasePath: string, workerPath: string, catalogFile: string,
        onProgress: (count: number) => void, setChangeId: boolean = false): Promise<TMXModel> {
        return new Promise((resolve, reject) => {
            let worker: Worker = new Worker(workerPath, {
                workerData: { sourceFile, databasePath, catalogFile }
            });
            worker.on('message', (msg: { type: string, count?: number, header?: string, languages?: string[], message?: string }) => {
                if (msg.type === 'progress' && msg.count !== undefined) {
                    onProgress(msg.count);
                } else if (msg.type === 'done' && msg.header !== undefined && msg.languages !== undefined) {
                    let header: XMLElement = TmxUtils.parseElement(msg.header);
                    resolve(new TMXModel(databasePath, header, msg.languages, setChangeId));
                } else if (msg.type === 'error') {
                    reject(new Error(msg.message ?? 'Unknown import error'));
                }
            });
            worker.on('error', reject);
        });
    }
}
