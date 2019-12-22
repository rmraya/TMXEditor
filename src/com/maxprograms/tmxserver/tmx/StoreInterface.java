/*****************************************************************************
Copyright (c) 2018-2019 - Maxprograms,  http://www.maxprograms.com/

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to compile, 
modify and use the Software without restrictions in the computer where the 
Software has been compiled.

Redistribution of this Software in any form (source code or executable 
binaries) requires prior written permission from Maxprograms. 

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
import java.io.IOException;
import java.util.List;
import java.util.Set;

import javax.xml.parsers.ParserConfigurationException;

import org.xml.sax.SAXException;

import com.maxprograms.tmxserver.models.Language;
import com.maxprograms.tmxserver.models.TUnit;
import com.maxprograms.xml.Element;

public interface StoreInterface {

	void storeTU(Element tu) throws IOException;

	void storeHeader(Element header);

	Element getHeader();

	Set<String> getLanguages();

	List<TUnit> getUnits(long start, int count, String filterText, Language filterLanguage, boolean caseSensitiveFilter,
			boolean filterUntranslated, boolean regExp, Language filterSrcLanguage, Language sortLanguage,
			boolean ascending) throws IOException;

	void close() throws IOException;

	long getCount();

	long getDiscarded();

	String saveData(String id, String lang, String value) throws IOException;

	void writeFile(File out) throws IOException;

	int getSaved();

	void commit() throws IOException;

	Element getTu(String id);

	void delete(List<TUnit> selected);

	void replaceText(String search, String replace, Language language, boolean regExp);

	long getProcessed();

	void insertUnit(String id);

	long removeUntranslated(Language lang) throws IOException;

	void addLanguage(Language lang) throws IOException;

	void removeLanguage(Language lang) throws IOException;

	void removeAlltags();

	void changeLanguage(Language oldLanguage, Language newLanguage) throws IOException;

	void removeDuplicates();

	void removeSpaces() throws SAXException, IOException, ParserConfigurationException;

	void consolidateUnits(Language lang) throws IOException;

	void setTuAttributes(String id, List<String[]> attributes);

	void setTuvAttributes(String id, String lang, List<String[]> attributes);

	void setTuProperties(String id, List<String[]> properties);

	void setTuvProperties(String id, String lang, List<String[]> dataList);

	void setTuNotes(String id, List<String> notes);

	void setTuvNotes(String id, String lang, List<String> notes);

	void exportDelimited(String file) throws IOException;

	long getExported();

	Element getTuv(String id, String lang);

	void setIndentation(int indentation);

}
