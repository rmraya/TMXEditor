/*******************************************************************************
 * Copyright (c) 2023 Maxprograms.
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

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.xml.sax.Attributes;
import org.xml.sax.ContentHandler;
import org.xml.sax.Locator;
import org.xml.sax.SAXException;
import org.xml.sax.ext.LexicalHandler;

public class TMXCopyHandler implements ContentHandler, LexicalHandler {

	private FileOutputStream out;
	private boolean inCDATA;

	public TMXCopyHandler(FileOutputStream out) {
		this.out = out;
	}

	private void writeString(String string) throws IOException {
		out.write(string.getBytes(StandardCharsets.UTF_8));
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
		inCDATA = true;
	}

	@Override
	public void endCDATA() throws SAXException {
		inCDATA = false;
	}

	@Override
	public void comment(char[] ch, int start, int length) throws SAXException {
		// do nothing
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
		try {
			writeString("<" + qName);
			for (int i = 0; i < atts.getLength(); i++) {
				writeString(" " + atts.getQName(i) + "=\"" + cleanString(atts.getValue(i)) + "\"");
			}
			writeString(">");
		} catch (IOException e) {
			throw new SAXException(e.getMessage());
		}

	}

	@Override
	public void endElement(String uri, String localName, String qName) throws SAXException {
		try {
			writeString("</" + qName + ">");
		} catch (IOException e) {
			throw new SAXException(e.getMessage());
		}
	}

	@Override
	public void characters(char[] ch, int start, int length) throws SAXException {
		if (!inCDATA) {
			try {
				writeString(cleanString(new String(ch, start, length)));
			} catch (IOException e) {
				throw new SAXException(e.getMessage());
			}
		}
	}

	private static String cleanString(String string) {
		String result = string.replace("&", "&amp;");
		result = result.replace("<", "&lt;");
		result = result.replace(">", "&gt;");
		return result.replaceAll("\"", "&quot;");
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

}
