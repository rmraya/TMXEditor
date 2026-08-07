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

import { readFileSync } from 'node:fs';

export type CsvEncoding = 'utf8' | 'utf16le' | 'utf16be' | 'latin1';

const CANDIDATE_SEPARATORS: string[] = [',', ';', '\t', '|', ':'];

function decodeBuffer(buffer: Buffer, encoding: CsvEncoding): string {
    let text: string;
    if (encoding === 'utf16be') {
        let swapped: Buffer = Buffer.from(buffer);
        if (swapped.length % 2 === 0) {
            swapped.swap16();
        }
        text = swapped.toString('utf16le');
    } else {
        text = buffer.toString(encoding);
    }
    if (text.charAt(0) === '\uFEFF') {
        text = text.substring(1);
    }
    return text;
}

export class CsvReader {

    readRows(filePath: string, encoding: CsvEncoding, columnSeparator: string, textDelimiter: string): string[][] {
        let text: string = decodeBuffer(readFileSync(filePath), encoding);
        let separator: string = columnSeparator.charAt(0);
        let quote: string = textDelimiter.charAt(0);
        return this.parse(text, separator, quote);
    }

    private parse(text: string, separator: string, quote: string): string[][] {
        let rows: string[][] = [];
        let row: string[] = [];
        let field: string = '';
        let inQuotes: boolean = false;
        let length: number = text.length;
        let i: number = 0;

        while (i < length) {
            let char: string = text.charAt(i);
            if (inQuotes) {
                if (quote && char === quote) {
                    if (text.charAt(i + 1) === quote) {
                        field += quote;
                        i += 2;
                        continue;
                    }
                    inQuotes = false;
                    i++;
                    continue;
                }
                field += char;
                i++;
                continue;
            }
            if (quote && char === quote && field === '') {
                inQuotes = true;
                i++;
                continue;
            }
            if (char === separator) {
                row.push(field);
                field = '';
                i++;
                continue;
            }
            if (char === '\r' || char === '\n') {
                if (char === '\r' && text.charAt(i + 1) === '\n') {
                    i++;
                }
                row.push(field);
                rows.push(row);
                row = [];
                field = '';
                i++;
                continue;
            }
            field += char;
            i++;
        }
        if (field !== '' || row.length > 0) {
            row.push(field);
            rows.push(row);
        }
        return rows;
    }
}

export function columnsConsistent(rows: string[][]): boolean {
    if (rows.length === 0) {
        return false;
    }
    let expected: number = rows[0].length;
    for (let row of rows) {
        if (row.length === 1 && row[0] === '') {
            continue;
        }
        if (row.length !== expected) {
            return false;
        }
    }
    return true;
}

export function detectEncoding(filePath: string): CsvEncoding {
    let buffer: Buffer = readFileSync(filePath);
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        return 'utf8';
    }
    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
        return 'utf16le';
    }
    if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
        return 'utf16be';
    }
    return 'utf8';
}

export function detectDelimiter(text: string): { separator: string, quote: string } {
    let sampleLines: string[] = text.split(/\r\n|\r|\n/).filter((line: string) => line.length > 0).slice(0, 10);
    let bestSeparator: string = ',';
    let bestScore: number = -1;
    for (let candidate of CANDIDATE_SEPARATORS) {
        let counts: number[] = sampleLines.map((line: string) => line.split(candidate).length - 1);
        if (counts.length === 0 || counts[0] === 0) {
            continue;
        }
        let consistent: boolean = counts.every((count: number) => count === counts[0]);
        let score: number = consistent ? counts[0] * 100 : counts[0];
        if (score > bestScore) {
            bestScore = score;
            bestSeparator = candidate;
        }
    }
    let firstLine: string = sampleLines[0] || '';
    let firstField: string = firstLine.split(bestSeparator)[0] || '';
    let quote: string = firstField.trim().startsWith('"') ? '"' : '';
    return { separator: bestSeparator, quote: quote };
}

export function detectCsvSettings(filePath: string): { encoding: CsvEncoding, separator: string, quote: string } {
    let encoding: CsvEncoding = detectEncoding(filePath);
    let text: string = decodeBuffer(readFileSync(filePath), encoding);
    let delimiter: { separator: string, quote: string } = detectDelimiter(text);
    return { encoding: encoding, separator: delimiter.separator, quote: delimiter.quote };
}
