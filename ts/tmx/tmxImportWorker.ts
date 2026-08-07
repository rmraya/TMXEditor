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

import { parentPort, workerData } from 'node:worker_threads';
import { DatabaseSync, StatementSync } from 'node:sqlite';
import { Catalog, SAXParser, XMLAttribute, XMLElement } from 'typesxml';
import { TmxLanguagesHandler } from './tmxLanguagesHandler.js';
import { TmxUnitHandler } from './tmxUnitHandler.js';
import { TmxSchema } from './tmxSchema.js';
import { TmxUtils } from './tmxUtils.js';

interface WorkerData {
    sourceFile: string;
    databasePath: string;
    catalogFile: string;
}

interface ImportResult {
    count: number;
    header: string;
}

export class TmxImportWorker {

    private static readonly PROGRESS_INTERVAL: number = 500;

    static harvestLanguages(sourceFile: string, catalogFile: string): string[] {
        let handler: TmxLanguagesHandler = new TmxLanguagesHandler();
        let parser: SAXParser = new SAXParser();
        parser.setValidating(false);
        parser.setCatalog(new Catalog(catalogFile));
        parser.setContentHandler(handler);
        parser.parseFile(sourceFile);
        return Array.from(handler.languages).sort();
    }

    static importUnits(sourceFile: string, catalogFile: string, database: DatabaseSync, languages: string[]): ImportResult {
        let insertTU: StatementSync = database.prepare('INSERT INTO tu (id, tu, position) VALUES (?, ?, ?)');
        let insertTUV: Map<string, StatementSync> = new Map();
        let updateTUV: Map<string, StatementSync> = new Map();
        for (let lang of languages) {
            let prefix: string = TmxSchema.columnPrefix(lang);
            insertTUV.set(lang, database.prepare(`INSERT INTO tuv (id, ${prefix}_pure, ${prefix}_tuv) VALUES (?, ?, ?)`));
            updateTUV.set(lang, database.prepare(`UPDATE tuv SET ${prefix}_pure=?, ${prefix}_tuv=? WHERE id=?`));
        }

        let headerText: string = '';
        let time: number = Date.now();
        let position: number = 0;
        let count: number = 0;

        let handler: TmxUnitHandler = new TmxUnitHandler(
            (header: XMLElement) => {
                headerText = header.toString();
            },
            (tu: XMLElement) => {
                let id: string = '' + time++;
                let tuvs: XMLElement[] = tu.getChildren().filter((child: XMLElement) => child.getName() === 'tuv');
                let stored: number = 0;
                for (let tuv of tuvs) {
                    let langAttr: XMLAttribute | undefined = tuv.getAttribute('xml:lang') ?? tuv.getAttribute('lang');
                    let lang: string = langAttr ? langAttr.getValue() : '';
                    if (lang === '' || !insertTUV.has(lang)) {
                        continue;
                    }
                    let pure: string = TmxUtils.textOnly(tuv.getChild('seg'));
                    let text: string = tuv.toString();
                    if (stored === 0) {
                        insertTUV.get(lang)!.run(id, pure, text);
                    } else {
                        updateTUV.get(lang)!.run(pure, text, id);
                    }
                    stored++;
                }
                if (stored > 0) {
                    for (let tuv of tuvs) {
                        tu.removeChild(tuv);
                    }
                    insertTU.run(id, tu.toString(), position++);
                    count++;
                    if (count % TmxImportWorker.PROGRESS_INTERVAL === 0) {
                        parentPort!.postMessage({ type: 'progress', count });
                    }
                }
            }
        );

        let parser: SAXParser = new SAXParser();
        parser.setValidating(false);
        parser.setCatalog(new Catalog(catalogFile));
        parser.setContentHandler(handler);
        database.exec('BEGIN');
        parser.parseFile(sourceFile);
        database.exec('COMMIT');

        return { count, header: headerText };
    }

    static run(): void {
        const data: WorkerData = workerData as WorkerData;
        try {
            let languages: string[] = TmxImportWorker.harvestLanguages(data.sourceFile, data.catalogFile);
            let database: DatabaseSync = new DatabaseSync(data.databasePath, { enableForeignKeyConstraints: true });
            TmxSchema.createSchema(database, languages);
            let result: ImportResult = TmxImportWorker.importUnits(data.sourceFile, data.catalogFile, database, languages);
            database.close();
            parentPort!.postMessage({ type: 'done', count: result.count, header: result.header, languages });
        } catch (error: unknown) {
            parentPort!.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
        }
    }
}

TmxImportWorker.run();
