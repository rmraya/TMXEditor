/*****************************************************************************
Copyright (c) 2018-2021 - Maxprograms,  http://www.maxprograms.com/

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to compile, 
modify and use the Software in its executable form without restrictions.

Redistribution of this Software or parts of it in any form (source code or 
executable binaries) requires prior written permission from Maxprograms.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*****************************************************************************/
package com.maxprograms.tmxserver.tmx;

import java.util.ArrayDeque;
import java.util.Deque;

import com.maxprograms.xml.Document;
import com.maxprograms.xml.Element;
import com.maxprograms.xml.IContentHandler;

import org.xml.sax.Attributes;
import org.xml.sax.Locator;
import org.xml.sax.SAXException;

class TMXContentHandler implements IContentHandler {

	private Element current;
	Deque<Element> stack;
	private boolean inCDATA = false;
	private StoreInterface db;
	private int count;

	public TMXContentHandler(StoreInterface db) {
		this.db = db;
		count = 0;
		stack = new ArrayDeque<>();
	}

	@Override
	public void characters(char[] ch, int start, int length) throws SAXException {
		if (!inCDATA && current != null) {
			current.addContent(new String(ch, start, length));
		}
	}

	@Override
	public void endDocument() throws SAXException {
		stack.clear();
	}

	@Override
	public void endElement(String uri, String localName, String qName) throws SAXException {
		if (localName.equals("tu")) {
			try {
				db.storeTU(current);
				count++;
				if (count % 10000 == 0) {
					db.commit();
				}
			} catch (Exception e) {
				// ignored element
			}
			current = null;
			stack.clear();
		} else {
			if (localName.equals("header")) {
				db.storeHeader(current);
			}
			if (!stack.isEmpty()) {
				current = stack.pop();
			}
		}
	}

	@Override
	public void endPrefixMapping(String prefix) throws SAXException {
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
	public void setDocumentLocator(Locator locator) {
		// do nothing
	}

	@Override
	public void skippedEntity(String name) throws SAXException {
		// do nothing, the entity resolver must support this
	}

	@Override
	public void startDocument() throws SAXException {
		// do nothing
	}

	@Override
	public void startElement(String uri, String localName, String qName, Attributes atts) throws SAXException {
		if (current == null) {
			current = new Element(qName);
			stack.push(current);
		} else {
			Element child = new Element(qName);
			if (!qName.equals("ut")) { 
				current.addContent(child);
			}
			stack.push(current);
			current = child;
		}
		for (int i = 0; i < atts.getLength(); i++) {
			current.setAttribute(atts.getQName(i), atts.getValue(i));
		}
	}

	@Override
	public void startPrefixMapping(String prefix, String uri) throws SAXException {
		// do nothing
	}

	@Override
	public void comment(char[] ch, int start, int length) throws SAXException {
		// do nothing
	}

	@Override
	public void endCDATA() throws SAXException {
		inCDATA = false;
	}

	@Override
	public void endDTD() throws SAXException {
		// do nothing
	}

	@Override
	public void endEntity(String arg0) throws SAXException {
		// do nothing, let the EntityResolver handle this
	}

	@Override
	public void startCDATA() throws SAXException {
		inCDATA = true;
	}

	@Override
	public void startDTD(String name, String publicId1, String systemId1) throws SAXException {
		// do nothing
	}

	@Override
	public void startEntity(String arg0) throws SAXException {
		// do nothing, let the EntityResolver handle this
	}

	@Override
	public Document getDocument() {
		return null;
	}

}
