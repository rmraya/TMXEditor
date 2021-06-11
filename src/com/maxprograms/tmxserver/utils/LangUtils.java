/*******************************************************************************
 * Copyright (c) 2018-2021 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

package com.maxprograms.tmxserver.utils;

import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import javax.xml.parsers.ParserConfigurationException;

import com.maxprograms.languages.RegistryParser;
import com.maxprograms.tmxserver.models.Language;
import com.maxprograms.xml.Document;
import com.maxprograms.xml.Element;
import com.maxprograms.xml.SAXBuilder;

import org.xml.sax.SAXException;

public class LangUtils {

	private static List<Language> languages;
	private static RegistryParser registry;

	private LangUtils() {
		// empty for security
	}

	public static List<Language> getAllLanguages() throws SAXException, IOException, ParserConfigurationException {
		if (languages == null) {
			languages = new ArrayList<>();
			URL url = LangUtils.class.getResource("lang_list.xml");
			SAXBuilder builder = new SAXBuilder();
			Document doc = builder.build(url);
			Element root = doc.getRootElement();
			List<Element> list = root.getChildren();
			Iterator<Element> it = list.iterator();
			while (it.hasNext()) {
				Element child = it.next();
				Language lang = new Language(child.getAttributeValue("code"), child.getText());
				languages.add(lang);
			}
		}
		return languages;
	}

	public static Language getLanguage(String code) throws IOException {
		if (registry == null) {
			registry = new RegistryParser();
		}
		String description = registry.getTagDescription(code);
		if (!description.isEmpty()) {
			return new Language(code, description);
		}
		return null;
	}
}
