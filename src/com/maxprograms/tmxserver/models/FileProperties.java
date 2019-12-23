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

public class FileProperties implements Serializable {

	private static final long serialVersionUID = -3128523067275674684L;

	private String fileName;
	private String creationtool;
	private String creationtoolversion;
	private String segtype;
	private String oTmf;
	private String adminlang;
	private String srclang;
	private String datatype;
	private List<String[]> properties;
	private List<String> notes;

	public FileProperties(String fileName, String creationtool, String creationtoolversion, String segtype, String oTmf,
			String adminlang, String srclang, String datatype, List<String[]> properties, List<String> notes) {
		this.fileName = fileName;
		this.creationtool = creationtool;
		this.creationtoolversion = creationtoolversion;
		this.segtype = segtype;
		this.oTmf = oTmf;
		this.adminlang = adminlang;
		this.srclang = srclang;
		this.datatype = datatype;
		this.properties = properties;
		this.notes = notes;
	}

	public String getFileName() {
		return fileName;
	}

	public void setFileName(String fileName) {
		this.fileName = fileName;
	}

	public String getCreationtool() {
		return creationtool;
	}

	public void setCreationtool(String creationtool) {
		this.creationtool = creationtool;
	}

	public String getCreationtoolversion() {
		return creationtoolversion;
	}

	public void setCreationtoolversion(String creationtoolversion) {
		this.creationtoolversion = creationtoolversion;
	}

	public String getSegtype() {
		return segtype;
	}

	public void setSegtype(String segtype) {
		this.segtype = segtype;
	}

	public String getOTmf() {
		return oTmf;
	}

	public void setOTmf(String oTmf) {
		this.oTmf = oTmf;
	}

	public String getAdminlang() {
		return adminlang;
	}

	public void setAdminlang(String adminlang) {
		this.adminlang = adminlang;
	}

	public String getSrclang() {
		return srclang;
	}

	public void setSrclang(String srclang) {
		this.srclang = srclang;
	}

	public String getDatatype() {
		return datatype;
	}

	public void setDatatype(String datatype) {
		this.datatype = datatype;
	}

	public List<String[]> getProperties() {
		return properties;
	}

	public void setProperties(List<String[]> properties) {
		this.properties = properties;
	}

	public List<String> getNotes() {
		return notes;
	}

	public void setNotes(List<String> notes) {
		this.notes = notes;
	}

}
