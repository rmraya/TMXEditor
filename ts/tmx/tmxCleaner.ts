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

import { closeSync, openSync, readSync, renameSync, writeSync } from 'node:fs';
import { FileReader, XMLUtils } from 'typesxml';

const CHUNK_SIZE: number = 65536;

export class TmxCleaner {

    clean(file: string): void {
        let encoding: BufferEncoding = this.getEncoding(file);
        let tmpFile: string = file + '.tmp';
        let inFd: number = openSync(file, 'r');
        let outFd: number = openSync(tmpFile, 'w');
        let chunk: Buffer = Buffer.alloc(CHUNK_SIZE);
        let firstChunk: boolean = true;
        try {
            let bytesRead: number;
            while ((bytesRead = readSync(inFd, chunk, 0, CHUNK_SIZE, null)) > 0) {
                let text: string = chunk.subarray(0, bytesRead).toString(encoding);
                if (firstChunk) {
                    if (text.charCodeAt(0) === 0xFEFF) {
                        writeSync(outFd, Buffer.from('\uFEFF', encoding));
                        text = text.substring(1);
                    }
                    firstChunk = false;
                }
                text = this.checkEntities(text);
                text = XMLUtils.validXml10Chars(text);
                writeSync(outFd, Buffer.from(text, encoding));
            }
        } finally {
            closeSync(inFd);
            closeSync(outFd);
        }
        let backup: string = this.backupName(file);
        renameSync(file, backup);
        renameSync(tmpFile, file);
    }

    private getEncoding(file: string): BufferEncoding {
        let encoding: BufferEncoding = FileReader.detectEncoding(file);
        if (encoding !== 'utf8') {
            return encoding;
        }
        let fd: number = openSync(file, 'r');
        let buffer: Buffer = Buffer.alloc(200);
        let bytesRead: number = readSync(fd, buffer, 0, 200, 0);
        closeSync(fd);
        let header: string = buffer.subarray(0, bytesRead).toString('latin1');
        let match: RegExpMatchArray | null = header.match(/encoding\s*=\s*["']([^"']+)["']/i);
        if (match) {
            let declared: string = match[1].toLowerCase();
            if (declared === 'utf-16le') {
                return 'utf16le';
            }
            if (declared === 'iso-8859-1' || declared === 'iso-8859-2' || declared === 'windows-1252') {
                return 'latin1';
            }
            if (declared === 'us-ascii') {
                return 'ascii';
            }
        }
        return 'utf8';
    }

    private checkEntities(text: string): string {
        return text.replace(/&#(x[0-9A-Fa-f]+|[0-9]+);/g, (_match: string, code: string) => {
            let codePoint: number = code.charAt(0) === 'x' ? parseInt(code.substring(1), 16) : parseInt(code, 10);
            return String.fromCodePoint(codePoint);
        });
    }

    private backupName(file: string): string {
        let dot: number = file.lastIndexOf('.');
        if (dot !== -1 && dot < file.length - 1) {
            return file.substring(0, dot) + '.~' + file.substring(dot + 1);
        }
        return file + '.bak';
    }
}
