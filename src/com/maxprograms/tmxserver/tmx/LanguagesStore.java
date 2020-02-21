package com.maxprograms.tmxserver.tmx;

import java.io.File;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import com.maxprograms.tmxserver.models.Language;
import com.maxprograms.tmxserver.models.TUnit;
import com.maxprograms.xml.Element;

public class LanguagesStore implements StoreInterface {

	private Set<String> langSet;

	@Override
	public void storeTU(Element tu) {
		if (langSet == null) {
			langSet = new TreeSet<>();
		}
		List<Element> tuvs = tu.getChildren("tuv");
		Iterator<Element> it = tuvs.iterator();
		while (it.hasNext()) {
			Element tuv = it.next();
			String lang = tuv.getAttributeValue("xml:lang");
			if (lang.isEmpty()) {
				lang = tuv.getAttributeValue("lang");
			}
			if (!lang.isEmpty()) {
				langSet.add(lang);
			}
		}
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
		return langSet;
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
		return 0;
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
	public void writeFile(File out) {
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
	public void delete(List<String> selected) {
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
	public void removeTags() {
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
	public void setTuvAttributes(String id, String lang, List<String[]> attributes) {
		// do nothing
	}

	@Override
	public void setTuProperties(String id, List<String[]> properties) {
		// do nothing
	}

	@Override
	public void setTuvProperties(String id, String lang, List<String[]> dataList) {
		// do nothing
	}

	@Override
	public void setTuNotes(String id, List<String> notes) {
		// do nothing
	}

	@Override
	public void setTuvNotes(String id, String lang, List<String> notes) {
		// do nothing
	}

	@Override
	public void exportDelimited(String file) {
		// do nothing
	}

	@Override
	public long getExported() {
		return 0;
	}

	@Override
	public Element getTuv(String id, String lang) {
		return null;
	}

	@Override
	public void setIndentation(int indentation) {
		// do nothing
	}

}
