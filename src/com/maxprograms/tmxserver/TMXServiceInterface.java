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
import com.maxprograms.tmxserver.models.Result;
import com.maxprograms.tmxserver.models.TUnit;

import org.json.JSONObject;

public interface TMXServiceInterface {
	JSONObject openFile(String fileName);

	Result<TUnit> getData(int start, int count, String filterText, Language filterLanguage, boolean caseSensitiveFilter,
			boolean filterUntranslated, boolean regExp, Language filterSrcLanguage, Language sortlanguage,
			boolean ascending);

	Result<Language> getLanguages();

	JSONObject getProcessingProgress();

	JSONObject getCount();

	JSONObject closeFile();

	JSONObject saveData(String id, String lang, String value);

	JSONObject saveFile(String file);

	JSONObject getFileProperties();

	String[] getTuData(String id);

	JSONObject delete(List<String> selected);

	JSONObject replaceText(String search, String replace, Language language, boolean regExp);

	JSONObject insertUnit();

	Result<Language> getAllLanguages();

	JSONObject removeUntranslated(Language lang);

	JSONObject addLanguage(Language lang);

	JSONObject removeLanguage(Language lang);

	JSONObject removeTags();

	JSONObject changeLanguage(Language oldLanguage, Language language);

	JSONObject createFile(Language srcLang, Language tgtLang);

	JSONObject removeDuplicates();

	JSONObject removeSpaces();

	JSONObject consolidateUnits(Language lang);

	String[] setAttributes(String currentId, String lang, List<String[]> attributes);

	JSONObject getLoadingProgress();

	JSONObject getSavingProgress();

	String[] checkFiles();

	JSONObject splitFile(String file, int parts);

	JSONObject getSplitProgress();

	JSONObject mergeFiles(String merged, List<String> files);

	JSONObject getMergeProgress();

	String[] setProperties(String id, String lang, List<String[]> dataList);

	String[] setNotes(String id, String lang, List<String> notes);

	JSONObject cleanCharacters(String file);

	JSONObject cleaningProgress();

	JSONObject setSrcLanguage(Language lang);

	JSONObject getSrcLanguage();

	JSONObject exportDelimited(String file);

	JSONObject exportProgress();

	String[] getTuvData(String id, String lang);

	JSONObject validateFile(String file);

	JSONObject validatingProgress();

	Result<String> getCharsets();

	String[] previewCsv(String csvFile, List<String> languages, String charSet, String columsSeparator,
			String textDelimiter);

	String[] convertCsv(String csvFile, String tmxFile, List<String> languages, String charSet, String columsSeparator,
			String textDelimiter);

	JSONObject getIndentation();

	JSONObject saveIndentation(int value);
}
