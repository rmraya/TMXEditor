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

package com.maxprograms.tmxserver.models;

import java.io.IOException;
import java.io.Serializable;

import javax.xml.parsers.ParserConfigurationException;

import org.json.JSONObject;
import org.xml.sax.SAXException;

import com.maxprograms.languages.LanguageUtils;

public class Language implements Serializable, Comparable<Language> {

	private static final long serialVersionUID = -1036298903446869592L;

	private String code;
	private String name;

	public Language(String code, String name) {
		this.code = code;
		this.name = name;
	}

	public Language(JSONObject json) {
		this.code = json.getString("code");
		this.name = json.getString("name");
	}

	public String getCode() {
		return code;
	}

	public String getName() {
		return name;
	}

	public String getDisplayName() {
		if (!code.isEmpty()) {
			return code + " - " + name;
		}
		return name;
	}

	public boolean isBidi() throws SAXException, IOException, ParserConfigurationException {
		return LanguageUtils.isBiDi(code);
	}

	public boolean isCJK() {
		return LanguageUtils.isCJK(code);
	}

	@Override
	public int compareTo(Language o) {
		return name.compareTo(o.name);
	}

	@Override
	public String toString() {
		return getDisplayName();
	}

	@Override
	public boolean equals(Object obj) {
		if (obj instanceof Language lang) {
			return code.equals(lang.getCode()) && name.equals(lang.getName());
		}
		return false;
	}

	@Override
	public int hashCode() {
		return code.hashCode();
	}

	public JSONObject toJSON() {
		JSONObject json = new JSONObject();
		json.put("code", code);
		json.put("name", name);
		return json;
	}
}
