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

package com.maxprograms.tmxserver.utils;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

import javax.xml.parsers.ParserConfigurationException;

import org.xml.sax.SAXException;

import com.maxprograms.languages.LanguageUtils;
import com.maxprograms.languages.RegistryParser;
import com.maxprograms.tmxserver.models.Language;

public class LangUtils {

	private static List<Language> languages;
	private static RegistryParser registry;

	private LangUtils() {
		// empty for security
	}

	public static List<Language> getAllLanguages() throws SAXException, IOException, ParserConfigurationException {
		if (languages == null) {
			List<com.maxprograms.languages.Language> langs = LanguageUtils.getAllLanguages();
			languages = new ArrayList<>();
			Iterator<com.maxprograms.languages.Language> it = langs.iterator();
			while (it.hasNext()) {
				com.maxprograms.languages.Language child = it.next();
				Language lang = new Language(child.getCode(), child.getDescription());
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
