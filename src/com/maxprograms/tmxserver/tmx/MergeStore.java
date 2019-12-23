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
package com.maxprograms.tmxserver.tmx;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;

import com.maxprograms.tmxserver.models.Language;
import com.maxprograms.tmxserver.models.TUnit;
import com.maxprograms.tmxserver.utils.TextUtils;
import com.maxprograms.xml.Element;
import com.maxprograms.xml.Indenter;

public class MergeStore implements StoreInterface {

	private FileOutputStream out;
	private long tuCount;
	private int indentation;

	public MergeStore(FileOutputStream out) {
		this.out = out;
	}

	@Override
	public void storeTU(Element tu) throws IOException {
		Indenter.indent(tu, 3, indentation);
		writeString(TextUtils.padding(2, indentation) + tu.toString() + "\n");
		tuCount++;
	}

	private void writeString(String string) throws IOException {
		out.write(string.getBytes(StandardCharsets.UTF_8));
	}

	@Override
	public void storeHeader(Element header) {
		// do nothing
	}

	@Override
	public Element getHeader() {
		return null;
	}

	@Override
	public Set<String> getLanguages() {
		return null;
	}

	@Override
	public List<TUnit> getUnits(long start, int count, String filterText, Language filterLanguage,
			boolean caseSensitiveFilter, boolean filterUntranslated, boolean regExp, Language filterSrcLanguage,
			Language sortLanguage, boolean ascending) {
		return null;
	}

	@Override
	public void close() {
		// do nothing
	}

	@Override
	public long getCount() {
		return tuCount;
	}

	@Override
	public long getDiscarded() {
		return 0;
	}

	@Override
	public String saveData(String id, String lang, String value) {
		return null;
	}

	@Override
	public void writeFile(File file) {
		// do nothing
	}

	@Override
	public int getSaved() {
		return 0;
	}

	@Override
	public void commit() {
		// do nothing
	}

	@Override
	public Element getTu(String id) {
		return null;
	}

	@Override
	public void delete(List<TUnit> selected) {
		// do nothing
	}

	@Override
	public void replaceText(String search, String replace, Language language, boolean regExp) {
		// do nothing
	}

	@Override
	public long getProcessed() {
		return 0;
	}

	@Override
	public void insertUnit(String id) {
		// do nothing
	}

	@Override
	public long removeUntranslated(Language lang) {
		return 0;
	}

	@Override
	public void addLanguage(Language lang) {
		// do nothing
	}

	@Override
	public void removeLanguage(Language lang) {
		// do nothing
	}

	@Override
	public void removeAlltags() {
		// do nothing
	}

	@Override
	public void changeLanguage(Language oldLanguage, Language newLanguage) {
		// do nothing
	}

	@Override
	public void removeDuplicates() {
		// do nothing
	}

	@Override
	public void removeSpaces() {
		// do nothing
	}

	@Override
	public void consolidateUnits(Language lang) {
		// do nothing
	}

	@Override
	public void setTuAttributes(String id, List<String[]> attributes) {
		// do nothing
	}

	@Override
	public void setTuProperties(String id, List<String[]> properties) {
		// do nothing
	}

	@Override
	public void setTuNotes(String id, List<String> notes) {
		// do nothing
	}

	@Override
	public void exportDelimited(String file) {
		// do nothing
	}

	@Override
	public long getExported() {
		return 0l;
	}

	@Override
	public Element getTuv(String id, String lang) {
		return null;
	}

	@Override
	public void setTuvAttributes(String id, String lang, List<String[]> attributes) {
		// do nothing
	}

	@Override
	public void setTuvProperties(String id, String lang, List<String[]> dataList) {
		// do nothing
	}

	@Override
	public void setTuvNotes(String id, String lang, List<String> notes) {
		// do nothing
	}

	@Override
	public void setIndentation(int indentation) {
		this.indentation = indentation;
	}
}
