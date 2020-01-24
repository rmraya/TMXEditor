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

import com.maxprograms.tmxserver.models.FileProperties;
import com.maxprograms.tmxserver.models.Language;
import com.maxprograms.tmxserver.models.Result;
import com.maxprograms.tmxserver.models.TUnit;

import org.json.JSONObject;

public interface TMXServiceInterface {
	String[] openFile(String fileName);

	Result<TUnit> getData(int start, int count, String filterText, Language filterLanguage, boolean caseSensitiveFilter,
			boolean filterUntranslated, boolean regExp, Language filterSrcLanguage, Language sortlanguage,
			boolean ascending);

	Result<Language> getLanguages();

	String[] getProcessingProgress();

	String[] getCount();

	String[] closeFile();

	String[] checkUpdates();

	String[] saveData(String id, String lang, String value);

	String[] saveFile(String file);

	Result<FileProperties> getFileProperties();

	String[] isRegistered();

	Result<Boolean> registerLicense(String upperCase);

	String[] requestTrial(String firstName, String lastName, String company, String email);

	String[] getTuData(String id);

	String[] sendFeedback(String feedback);

	String[] delete(List<TUnit> selected);

	String[] replaceText(String search, String replace, Language language, boolean regExp);

	String[] insertUnit();

	Result<Language> getAllLanguages();

	String[] removeUntranslated(Language lang);

	String[] addLanguage(Language lang);

	String[] removeLanguage(Language lang);

	String[] removeAlltags();

	String[] changeLanguage(Language oldLanguage, Language language);

	String[] createFile(Language srcLang, Language tgtLang);

	String[] disableLicense();

	String[] removeDuplicates();

	String[] removeSpaces();

	String[] consolidateUnits(Language lang);

	String[] getLicenseData();

	String[] setAttributes(String currentId, String lang, List<String[]> attributes);

	JSONObject getLoadingProgress();

	String[] getSavingProgress();

	String[] checkFiles();

	String[] splitFile(String file, int parts);

	String[] getSplitProgress();

	String[] mergeFiles(String merged, List<String> files);

	String[] getMergeProgress();

	String[] setProperties(String id, String lang, List<String[]> dataList);

	String[] setNotes(String id, String lang, List<String> notes);

	String[] cleanCharacters(String file);

	String[] cleaningProgress();

	String[] setSrcLanguage(Language lang);

	Result<Language> getSrcLanguage();

	String[] exportDelimited(String file);

	String[] exportProgress();

	String[] getTuvData(String id, String lang);

	String[] validateFile(String file);

	String[] validatingProgress();

	Result<String> getCharsets();

	String[] previewCsv(String csvFile, List<String> languages, String charSet, String columsSeparator,
			String textDelimiter);

	String[] convertCsv(String csvFile, String tmxFile, List<String> languages, String charSet, String columsSeparator,
			String textDelimiter);

	String[] getIndentation();

	String[] saveIndentation(int value);
}
