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
import java.util.List;
import java.util.Set;

import javax.xml.parsers.ParserConfigurationException;

import org.xml.sax.SAXException;

import com.maxprograms.languages.Language;
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

	String saveData(String id, String lang, String value)
			throws IOException,  SAXException, ParserConfigurationException;

	void writeFile(File out) throws IOException,  SAXException, ParserConfigurationException;

	int getSaved();

	void commit() throws IOException;

	Element getTu(String id) throws  IOException;

	void delete(List<String> selected);

	void replaceText(String search, String replace, Language language, boolean regExp)
			throws  SAXException, IOException, ParserConfigurationException;

	long getProcessed();

	void insertUnit(String id) throws  IOException;

	long removeUntranslated(Language lang) throws IOException;

	void removeSameAsSource(Language lang) throws IOException,  SAXException, ParserConfigurationException;

	void addLanguage(Language lang) throws IOException;

	void removeLanguage(Language lang) throws IOException;

	void removeTags() throws  SAXException, IOException, ParserConfigurationException;

	void changeLanguage(Language oldLanguage, Language newLanguage)
			throws IOException,  SAXException, ParserConfigurationException;

	void removeDuplicates() throws  SAXException, IOException, ParserConfigurationException;

	void removeSpaces() throws SAXException, IOException, ParserConfigurationException;

	void consolidateUnits(Language lang) throws IOException,  SAXException, ParserConfigurationException;

	void setTuAttributes(String id, List<String[]> attributes)
			throws SAXException, IOException, ParserConfigurationException;

	void setTuvAttributes(String id, String lang, List<String[]> attributes)
			throws  SAXException, IOException, ParserConfigurationException;

	void setTuProperties(String id, List<String[]> properties)
			throws  SAXException, IOException, ParserConfigurationException;

	void setTuvProperties(String id, String lang, List<String[]> dataList)
			throws  SAXException, IOException, ParserConfigurationException;

	void setTuNotes(String id, List<String> notes)
			throws  SAXException, IOException, ParserConfigurationException;

	void setTuvNotes(String id, String lang, List<String> notes)
			throws  SAXException, IOException, ParserConfigurationException;

	void exportDelimited(String file) throws IOException,  SAXException, ParserConfigurationException;

	long getExported();

	Element getTuv(String id, String lang) throws  SAXException, IOException, ParserConfigurationException;

	void setIndentation(int indentation);

	void exportExcel(String file) throws IOException, SAXException, ParserConfigurationException;

}
