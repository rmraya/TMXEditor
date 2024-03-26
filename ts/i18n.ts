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

import { readFileSync } from "fs";

export class I18n {

    private resources: any;

    constructor(resourcesFile: string) {
        let data: Buffer = readFileSync(resourcesFile);
        this.resources = JSON.parse(data.toString());
    }

    getString(group: string, key: string): string {
        let fileStrings: any = this.resources[group];
        if (fileStrings) {
            let value: string = fileStrings[key];
            if (value) {
                return value;
            }
        }
        return '!' + key + '!';
    }

    format(text: string, params: string[]): string {
        for (let i: number = 0; i < params.length; i++) {
            text = text.replace('{' + i + '}', params[i]);
        }
        return text;
    }
}