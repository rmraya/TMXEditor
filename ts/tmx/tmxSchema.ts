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

import { DatabaseSync } from 'node:sqlite';

export class TmxSchema {

    static columnPrefix(lang: string): string {
        return lang.toLowerCase().replace(/-/g, '_');
    }

    static createSchema(database: DatabaseSync, languages: string[]): void {
        database.exec('PRAGMA journal_mode = WAL');
        database.exec('PRAGMA synchronous = NORMAL');

        database.exec(`CREATE TABLE IF NOT EXISTS tu (
            id TEXT NOT NULL,
            tu TEXT NOT NULL,
            position INTEGER NOT NULL,
            PRIMARY KEY(id)
        );`);

        database.exec('CREATE INDEX IF NOT EXISTS idx_tu_position ON tu(position);');

        let columns: string = languages.map((lang: string) => {
            let prefix: string = TmxSchema.columnPrefix(lang);
            return `${prefix}_pure TEXT, ${prefix}_tuv TEXT`;
        }).join(', ');
        database.exec(`CREATE TABLE IF NOT EXISTS tuv (id TEXT NOT NULL, ${columns}, PRIMARY KEY(id));`);
    }
}
