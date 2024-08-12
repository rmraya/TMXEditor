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

package com.maxprograms.tmxserver.tmx;

import java.io.IOException;
import java.util.HashSet;
import java.util.Set;

import org.xml.sax.Attributes;
import org.xml.sax.Locator;
import org.xml.sax.SAXException;

import com.maxprograms.languages.LanguageUtils;
import com.maxprograms.xml.Catalog;
import com.maxprograms.xml.Document;
import com.maxprograms.xml.IContentHandler;

public class LanguageHandler implements IContentHandler {

    Set<String> languages;

    public LanguageHandler() {
        languages = new HashSet<>();
    }

    @Override
    public void setDocumentLocator(Locator locator) {
        // do nothing
    }

    @Override
    public void startDocument() throws SAXException {
        // do nothing
    }

    @Override
    public void endDocument() throws SAXException {
        // do nothing
    }

    @Override
    public void startPrefixMapping(String prefix, String uri) throws SAXException {
        // do nothing
    }

    @Override
    public void endPrefixMapping(String prefix) throws SAXException {
        // do nothing
    }

    @Override
    public void startElement(String uri, String localName, String qName, Attributes atts) throws SAXException {
        if ("tuv".equals(localName)) {
            String lang = atts.getValue("xml:lang");
            if (lang == null) {
                lang = atts.getValue("lang");
            }
            if (lang != null) {
                languages.add(lang);
            }
        }
    }

    @Override
    public void endElement(String uri, String localName, String qName) throws SAXException {
        // do nothing
    }

    @Override
    public void characters(char[] ch, int start, int length) throws SAXException {
        // do nothing
    }

    @Override
    public void ignorableWhitespace(char[] ch, int start, int length) throws SAXException {
        // do nothing
    }

    @Override
    public void processingInstruction(String target, String data) throws SAXException {
        // do nothing
    }

    @Override
    public void skippedEntity(String name) throws SAXException {
        // do nothing
    }

    @Override
    public void startDTD(String name, String publicId, String systemId) throws SAXException {
        // do nothing
    }

    @Override
    public void endDTD() throws SAXException {
        // do nothing
    }

    @Override
    public void startEntity(String name) throws SAXException {
        // do nothing
    }

    @Override
    public void endEntity(String name) throws SAXException {
        // do nothing
    }

    @Override
    public void startCDATA() throws SAXException {
        // do nothing
    }

    @Override
    public void endCDATA() throws SAXException {
        // do nothing
    }

    @Override
    public void comment(char[] ch, int start, int length) throws SAXException {
        // do nothing
    }

    @Override
    public Document getDocument() {
        return null;
    }

    @Override
    public void setCatalog(Catalog arg0) {
        // do nothing
    }

    public Set<String> getLanguages() throws IOException {
        Set<String> result = new HashSet<>();
        Set<String> normalized = new HashSet<>();
        for (String lang : languages) {
            String normal = LanguageUtils.normalizeCode(lang.replace('_', '-'));
            if (!normalized.contains(normal)) {
                normalized.add(normal);
                result.add(lang);
            }
        }
        return result;
    }

}
