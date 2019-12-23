/*****************************************************************************
Copyright (c) 2018-2019 - Maxprograms,  http://www.maxprograms.com/

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
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

public class TuProperties implements Serializable {

	private static final long serialVersionUID = -7299155920267575033L;
	private List<String[]> attributes;
	private List<String[]> properties;
	private List<String> notes;

	public TuProperties(List<String[]> attributes, List<String[]> properties, List<String> notes) {
		this.attributes = attributes;
		this.properties = properties;
		this.notes = notes;
	}

	public List<String[]> getAttributes() {
		return attributes;
	}

	public List<String[]> getProperties() {
		return properties;
	}

	public List<String> getNotes() {
		return notes;
	}

	public JSONObject toJSON() {
		JSONObject json = new JSONObject();
		JSONArray propertiesArray = new JSONArray();
		for (int i = 0; i < properties.size(); i++) {
			propertiesArray.put(properties.get(i));
		}
		json.put("properties", propertiesArray);
		JSONArray attributesArray = new JSONArray();
		for (int i = 0; i < attributes.size(); i++) {
			attributesArray.put(attributes.get(i));
		}
		json.put("attributes", attributesArray);
		JSONArray notesArray = new JSONArray();
		json.put("notes", notesArray);
		for (int i = 0; i < notes.size(); i++) {
			notesArray.put(notes.get(i));
		}
		return json;
	}

}
