/*******************************************************************************
 * Copyright (c) 2005-2026 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

import { Catalog, DTDParser, Grammar, SAXParser } from "typesxml";
import { CustomError, VersionHandler } from "./versionHandler.js";
import { I18n } from "../i18n.js";
import { ValidatingHandler } from "./validatingHandler.js";

export class Validator {

    catalog: Catalog;
    parser: SAXParser;
    i18n: I18n;

    constructor(catalogfile: string, i18n: I18n) {
        this.catalog = new Catalog(catalogfile);
        this.parser = new SAXParser();
        this.parser.setValidating(false);
        this.parser.setCatalog(this.catalog);
        this.i18n = i18n;
    }

    validateFile(filename: string): void {
        let versionHandler: VersionHandler = new VersionHandler(this.i18n);
        try {
            this.parser.setContentHandler(versionHandler);
            this.parser.parseFile(filename);
        } catch (error) {
            if (error instanceof CustomError) {
                let validVersions: string[] = ['1.1', '1.2', '1.3', '1.4'];
                let version: string = versionHandler.getVersion();
                if (version === '') {
                    throw new Error(this.i18n.getString('tmxvalidator', 'noversion'));
                }
                if (!validVersions.includes(version)) {
                    let message: string = this.i18n.format(this.i18n.getString('tmxvalidator', 'invalidversion'), [version]);
                    throw new Error(message);
                }
            } else {
                throw error;
            }
        }
        let systemId: string = 'tmx14.dtd';
        let version: string = versionHandler.getVersion();
        if (version === '1.3') {
            systemId = 'tmx13.dtd';
        } else if (version === '1.2') {
            systemId = 'tmx12.dtd';
        } else if (version === '1.1') {
            systemId = 'tmx11.dtd';
        }
        let url: string | undefined = this.catalog.resolveEntity('', systemId);
        if (!url) {
            throw new Error(this.i18n.format(this.i18n.getString('validatinghandler', 'dtdnotresolved'), ['', systemId]));
        }
        let dtdParser: DTDParser = new DTDParser();
        let grammar: Grammar = dtdParser.parseDTD(url);
        let validatingHandler: ValidatingHandler = new ValidatingHandler(this.i18n);
        validatingHandler.setGrammar(grammar);
        this.parser.setContentHandler(validatingHandler);
        this.parser.parseFile(filename);
    }
}