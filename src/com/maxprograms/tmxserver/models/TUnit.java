/*****************************************************************************
Copyright (c) 2018-2020 - Maxprograms,  http://www.maxprograms.com/

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
package com.maxprograms.tmxserver.models;

import java.io.Serializable;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

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
		json.put("segs", segs);
		return json;
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
