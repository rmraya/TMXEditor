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
package com.maxprograms.tmxserver;

import java.util.List;

import com.maxprograms.tmxserver.models.Language;

import org.json.JSONObject;

public interface TMXServiceInterface {
	JSONObject openFile(String fileName);

	JSONObject getData(int start, int count, String filterText, Language filterLanguage, boolean caseSensitiveFilter,
			boolean filterUntranslated, boolean regExp, Language filterSrcLanguage, Language sortlanguage,
			boolean ascending);

	JSONObject getLanguages();

	JSONObject getProcessingProgress();

	JSONObject getCount();

	JSONObject closeFile();

	JSONObject saveData(String id, String lang, String value);

	JSONObject saveFile(String file);

	JSONObject getFileProperties();

	JSONObject getTuData(String id);

	JSONObject delete(List<String> selected);

	JSONObject replaceText(String search, String replace, Language language, boolean regExp);

	JSONObject insertUnit();

	JSONObject getAllLanguages();

	JSONObject removeUntranslated(Language lang);

	JSONObject addLanguage(Language lang);

	JSONObject removeLanguage(Language lang);

	JSONObject removeTags();

	JSONObject changeLanguage(Language oldLanguage, Language language);

	JSONObject createFile(Language srcLang, Language tgtLang);

	JSONObject removeDuplicates();

	JSONObject removeSpaces();

	JSONObject consolidateUnits(Language lang);

	JSONObject setAttributes(String currentId, String lang, List<String[]> attributes);

	JSONObject getLoadingProgress();

	JSONObject getSavingProgress();

	JSONObject splitFile(String file, int parts);

	JSONObject getSplitProgress();

	JSONObject mergeFiles(String merged, List<String> files);

	JSONObject getMergeProgress();

	JSONObject setProperties(String id, String lang, List<String[]> dataList);

	String[] setNotes(String id, String lang, List<String> notes);

	JSONObject cleanCharacters(String file);

	JSONObject cleaningProgress();

	JSONObject setSrcLanguage(Language lang);

	JSONObject getSrcLanguage();

	JSONObject exportDelimited(String file);

	JSONObject exportProgress();

	JSONObject getTuvData(String id, String lang);

	JSONObject validateFile(String file);

	JSONObject validatingProgress();

	JSONObject getCharsets();

	JSONObject previewCsv(String csvFile, List<String> languages, String charSet, String columsSeparator,
			String textDelimiter, boolean fixQuotes, boolean optionalDelims);

	JSONObject convertCsv(String csvFile, String tmxFile, List<String> languages, String charSet,
			String columsSeparator, String textDelimiter, boolean fixQuotes, boolean optionalDelims);

	JSONObject getIndentation();

	JSONObject saveIndentation(int value);
}
