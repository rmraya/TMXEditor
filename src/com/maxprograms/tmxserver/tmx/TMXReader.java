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

import java.io.File;
import java.io.IOException;

import javax.xml.parsers.ParserConfigurationException;

import org.xml.sax.SAXException;

import com.maxprograms.xml.CustomErrorHandler;
import com.maxprograms.xml.SAXBuilder;

public class TMXReader {

	private TMXContentHandler handler;
	private StoreInterface store;
	private SAXBuilder builder;

	public TMXReader(StoreInterface store) {
		this.store = store;

		builder = new SAXBuilder();
		builder.setEntityResolver(new TMXResolver());
		handler = new TMXContentHandler(store);
		builder.setContentHandler(handler);
		builder.setErrorHandler(new CustomErrorHandler());
	}

	public void parse(File file) throws SAXException, IOException, ParserConfigurationException {
		TmxUtils.resetTags();
		builder.build(file);
		store.commit();
	}

}
