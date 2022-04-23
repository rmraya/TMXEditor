/*******************************************************************************
 * Copyright (c) 2018-2022 Maxprograms.
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

import java.io.Serializable;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.json.JSONObject;

public class TUnit implements Serializable, Comparable<TUnit> {

	private static final long serialVersionUID = -9009997310750239732L;
	private long count;
	private String id;
	private Map<String, String> segs;

	public TUnit(long count, String id, Map<String, String> segs) {
		this.count = count;
		this.id = id;
		this.segs = segs;
	}

	public JSONObject toJSON() {
		JSONObject json = new JSONObject();
		json.put("count", count);
		json.put("id", id);

		JSONObject map = new JSONObject();
		Set<String> keyset = segs.keySet();
		Iterator<String> it = keyset.iterator();
		while (it.hasNext()) {
			String lang = it.next();
			map.put(lang, segs.get(lang));
		}
		json.put("segs", map);
		return json;
	}

	public TUnit(JSONObject json) {
		this.id = json.getString("id");
		this.count = json.getLong("count");
		this.segs = new HashMap<>();

		JSONObject map = json.getJSONObject("segs");
		Iterator<String> keys = map.keys();
		while (keys.hasNext()) {
			String lang = keys.next();
			segs.put(lang, map.getString(lang));
		}
	}

	public String getId() {
		return id;
	}

	public long getCount() {
		return count;
	}

	@Override
	public int compareTo(TUnit o) {
		return id.compareTo(o.getId());
	}

	public String getString(String lang) {
		if (segs == null) {
			return "";
		}
		if (segs.containsKey(lang)) {
			return segs.get(lang);
		}
		return "";
	}

	public void setString(String lang, String string) {
		segs.put(lang, string);
	}

	@Override
	public boolean equals(Object obj) {
		if (!(obj instanceof TUnit)) {
			return false;
		}
		TUnit u = (TUnit) obj;
		return id.equals(u.getId()) && count == u.getCount() && segs.equals(u.segs);
	}

	@Override
	public int hashCode() {
		return 13 * id.hashCode();
	}

	public String toHTML(List<Language> fileLanguages) {
		StringBuilder html = new StringBuilder();
		html.append("<tr id=\"");
		html.append(id);
		html.append("\"><td class='fixed'><input type='checkbox' class='rowCheck'></td><td class='fixed'>");
		html.append(count);
		html.append("</td>");
		Iterator<Language> it = fileLanguages.iterator();
		while (it.hasNext()) {
			Language lang = it.next();
			html.append("<td class=\"lang\" lang=\"");
			html.append(lang.getCode());
			html.append("\"");
			if (lang.isBidi()) {
				html.append(" dir='rtl'");
			}
			html.append('>');
			html.append(segs.get(lang.getCode()));
			html.append("</td>");
		}
		html.append("</tr>");
		return html.toString();
	}

}
