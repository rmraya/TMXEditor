/*******************************************************************************
 * Copyright (c) 2018-2025 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

package com.maxprograms.tmxserver;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.sql.SQLException;
import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.xml.parsers.ParserConfigurationException;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.xml.sax.SAXException;

import com.maxprograms.languages.Language;
import com.maxprograms.languages.LanguageUtils;
import com.maxprograms.tmxserver.excel.ExcelReader;
import com.maxprograms.tmxserver.excel.Sheet;
import com.maxprograms.tmxserver.models.TUnit;
import com.maxprograms.tmxserver.tmx.CountStore;
import com.maxprograms.tmxserver.tmx.LanguageHandler;
import com.maxprograms.tmxserver.tmx.MergeStore;
import com.maxprograms.tmxserver.tmx.SplitStore;
import com.maxprograms.tmxserver.tmx.SqlStore;
import com.maxprograms.tmxserver.tmx.StoreInterface;
import com.maxprograms.tmxserver.tmx.TMXCleaner;
import com.maxprograms.tmxserver.tmx.TMXConverter;
import com.maxprograms.tmxserver.tmx.TMXReader;
import com.maxprograms.tmxserver.tmx.TMXResolver;
import com.maxprograms.tmxserver.tmx.TmxUtils;
import com.maxprograms.tmxserver.utils.TextUtils;
import com.maxprograms.tmxvalidation.TMXValidator;
import com.maxprograms.xml.Attribute;
import com.maxprograms.xml.CustomErrorHandler;
import com.maxprograms.xml.Document;
import com.maxprograms.xml.Element;
import com.maxprograms.xml.Indenter;
import com.maxprograms.xml.SAXBuilder;
import com.maxprograms.xml.XMLOutputter;

public class TMXService {

	private Logger logger = Logger.getLogger(TMXService.class.getName());

	protected StoreInterface store;
	protected File currentFile;

	protected boolean parsing;
	protected String parsingError;

	protected boolean processing;
	protected String processingError;

	protected boolean saving;
	protected String savingError;

	protected boolean splitting;
	protected String splitError;

	protected boolean merging;
	protected String mergeError;

	protected boolean cleaning;
	protected String cleaningError;

	protected boolean exporting;
	protected String exportingError;

	protected boolean validating;
	protected String validatingError;

	protected CountStore countStore;
	protected SplitStore splitStore;
	protected MergeStore mergeStore;

	public boolean isOpen() {
		return store != null;
	}

	protected static File getPreferencesFolder() {
		String os = System.getProperty("os.name").toLowerCase();
		if (os.startsWith("mac")) {
			return new File(System.getProperty("user.home") + "/Library/Application Support/TMXEditor/");
		}
		if (os.startsWith("windows")) {
			return new File(System.getenv("AppData") + "\\TMXEditor\\");
		}
		return new File(System.getProperty("user.home") + "/.config/TMXEditor/");
	}

	private static void removeFile(File f) throws IOException {
		if (f.isDirectory()) {
			File[] list = f.listFiles();
			for (int i = 0; i < list.length; i++) {
				removeFile(list[i]);
			}
		}
		Files.delete(f.toPath());
	}

	public JSONObject openFile(String fileName) {
		JSONObject result = new JSONObject();
		try {
			parsing = true;
			File home = getPreferencesFolder();
			if (!home.exists()) {
				Files.createDirectory(home.toPath());
			}
			File tmp = new File(home, "tmp");
			if (tmp.exists()) {
				removeFile(tmp);
			}
			Files.createDirectory(tmp.toPath());
			if (store != null) {
				store.close();
				store = null;
			}
			currentFile = new File(fileName);
			Set<String> languages = getLanguages(fileName);
			if (languages.isEmpty()) {
				result.put(Constants.STATUS, Constants.ERROR);
				result.put(Constants.REASON, Messages.getString("TMXService.15"));
				return result;
			}
			store = new SqlStore(languages);
			parsingError = "";
			Thread.ofVirtual().start(() -> {
				try {
					TMXReader reader = new TMXReader(store);
					reader.parse(currentFile);
					store.commit();
				} catch (Exception e) {
					logger.log(Level.SEVERE, e.getMessage(), e);
					parsingError = e.getMessage();
					try {
						store.close();
					} catch (Exception e1) {
						// do nothing
					}
					store = null;
				}
				parsing = false;
			});
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception ex) {
			logger.log(Level.SEVERE, ex.getMessage(), ex);
			parsing = false;
			parsingError = ex.getMessage();
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, ex.getMessage());
		}
		return result;
	}

	private Set<String> getLanguages(String fileName) throws SAXException, IOException, ParserConfigurationException {
		SAXBuilder builder = new SAXBuilder();
		builder.setEntityResolver(new TMXResolver());
		LanguageHandler handler = new LanguageHandler();
		builder.setContentHandler(handler);
		builder.setErrorHandler(new CustomErrorHandler());
		builder.build(fileName);
		return handler.getLanguages();
	}

	public JSONObject getData(int start, int count, String filterText, Language filterLanguage,
			boolean caseSensitiveFilter, boolean filterUntranslated, boolean regExp, Language filterSrcLanguage,
			Language sortLanguage, boolean ascending) {
		processing = true;
		processingError = "";
		JSONObject result = new JSONObject();
		try {
			List<TUnit> data = store.getUnits(start, count, filterText, filterLanguage, caseSensitiveFilter,
					filterUntranslated, regExp, filterSrcLanguage, sortLanguage, ascending);
			JSONArray array = new JSONArray();
			Iterator<TUnit> it = data.iterator();
			while (it.hasNext()) {
				array.put(it.next().toJSON());
			}
			result.put("units", array);
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			processingError = e.getMessage();
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		processing = false;
		return result;
	}

	public JSONObject getLanguages() throws JSONException, IOException, SAXException, ParserConfigurationException {
		JSONObject result = new JSONObject();
		if (parsing) {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Messages.getString("TMXService.0"));
			return result;
		}
		if (store == null) {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Constants.NULLSTORE);
			return result;
		}
		Set<String> codes = store.getLanguages();
		if (codes == null || codes.isEmpty()) {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Messages.getString("TMXService.11"));
			return result;
		}
		Iterator<String> it = codes.iterator();
		JSONArray data = new JSONArray();

		while (it.hasNext()) {
			String code = it.next();
			JSONObject json = new JSONObject();
			json.put("code", code);
			String description = LanguageUtils.getLanguage(code).getDescription();
			if (description.isEmpty()) {
				// try guessing the language
				code = code.replace("_", "-");
				if (code.indexOf("-") != -1) {
					String[] parts = code.split("-");
					Language language = LanguageUtils.getLanguage(parts[0]);
					if (!language.getDescription().isEmpty()) {
						MessageFormat mf = new MessageFormat(Messages.getString("TMXService.13"));
						description = mf.format(new String[] { language.getDescription() });
					} else {
						description = Messages.getString("TMXService.14");
					}
				} else {
					description = Messages.getString("TMXService.14");
				}
			}
			json.put("name", description);
			data.put(json);
		}
		result.put("languages", data);
		result.put(Constants.STATUS, Constants.SUCCESS);
		return result;
	}

	public JSONObject getProcessingProgress() {
		JSONObject result = new JSONObject();
		if (store != null) {
			if (processing) {
				result.put(Constants.STATUS, Constants.PROCESSING);
			} else {
				if (processingError.isEmpty()) {
					result.put(Constants.STATUS, Constants.COMPLETED);
				} else {
					result.put(Constants.STATUS, Constants.ERROR);
					result.put(Constants.REASON, processingError);
				}
			}
			result.put("count", store.getProcessed());
		} else {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Constants.NULLSTORE);
		}
		return result;
	}

	public JSONObject getCount() throws JSONException, SQLException {
		JSONObject result = new JSONObject();
		if (store != null) {
			result.put("count", store.getCount());
			result.put(Constants.STATUS, Constants.SUCCESS);
		} else {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Constants.NULLSTORE);
		}
		return result;
	}

	public JSONObject closeFile() {
		if (store != null) {
			try {
				store.close();
				store = null;
				currentFile = null;
				new Thread() {

					@Override
					public void run() {
						System.gc();
					}
				}.start();
				JSONObject result = new JSONObject();
				result.put(Constants.STATUS, Constants.SUCCESS);
				return result;
			} catch (Exception e) {
				logger.log(Level.SEVERE, e.getMessage(), e);
				JSONObject result = new JSONObject();
				result.put(Constants.STATUS, Constants.ERROR);
				result.put(Constants.REASON, e.getMessage());
				return result;
			}
		}
		JSONObject result = new JSONObject();
		result.put(Constants.STATUS, Constants.ERROR);
		result.put(Constants.REASON, Messages.getString("TMXService.2"));
		return result;
	}

	public JSONObject saveData(String id, String lang, String value) {
		JSONObject result = new JSONObject();
		try {
			value = TmxUtils.replaceTags(value);
			String updated = store.saveData(id, lang, value);
			result.put(Constants.STATUS, Constants.SUCCESS);
			result.put("data", updated);
			result.put("id", id);
			result.put("lang", lang);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject saveFile(String file) {
		saving = true;
		currentFile = new File(file);
		savingError = "";
		try {
			Thread.ofVirtual().start(() -> {
				try {
					JSONObject json = getPreferences();
					store.setIndentation(json.getInt("indentation"));
					store.writeFile(currentFile);
				} catch (Exception ex) {
					logger.log(Level.SEVERE, ex.getMessage(), ex);
					savingError = ex.getMessage();
				}
				saving = false;
			});
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Constants.SUCCESS);
			return result;
		} catch (Exception ex) {
			logger.log(Level.SEVERE, ex.getMessage(), ex);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, ex.getMessage());
			return result;
		}
	}

	public JSONObject getFileProperties() {
		JSONObject result = new JSONObject();
		if (currentFile != null) {
			Element header = store.getHeader();

			result.put("file", currentFile.getAbsolutePath());

			JSONArray properties = new JSONArray();
			result.put("properties", properties);
			List<Element> propsList = header.getChildren("prop");
			Iterator<Element> propsIt = propsList.iterator();
			while (propsIt.hasNext()) {
				Element prop = propsIt.next();
				JSONArray array = new JSONArray();
				array.put(prop.getAttributeValue("type"));
				array.put(prop.getText());
				properties.put(array);
			}

			JSONArray notes = new JSONArray();
			result.put("notes", notes);
			List<Element> notesList = header.getChildren("note");
			Iterator<Element> notesIt = notesList.iterator();
			while (notesIt.hasNext()) {
				Element note = notesIt.next();
				notes.put(note.getText());
			}

			JSONObject attributes = new JSONObject();
			result.put("attributes", attributes);
			attributes.put("creationid", header.getAttributeValue("creationid"));
			attributes.put("creationdate", header.getAttributeValue("creationdate"));
			attributes.put("creationtool", header.getAttributeValue("creationtool"));
			attributes.put("creationtoolversion", header.getAttributeValue("creationtoolversion"));
			attributes.put("segtype", header.getAttributeValue("segtype"));
			attributes.put("o_tmf", header.getAttributeValue("o-tmf"));
			attributes.put("adminlang", header.getAttributeValue("adminlang"));
			attributes.put("srclang", header.getAttributeValue("srclang"));
			attributes.put("datatype", header.getAttributeValue("datatype"));
			attributes.put("changedate", header.getAttributeValue("changedate"));
			attributes.put("changeid", header.getAttributeValue("changeid"));
			attributes.put("o_encoding", header.getAttributeValue("o-encoding"));

			result.put(Constants.STATUS, Constants.SUCCESS);
		} else {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, "No file open");
		}
		return result;
	}

	public JSONObject getTuData(String id) {
		JSONObject result = new JSONObject();
		if (id == null) {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, "null id");
			return result;
		}
		try {
			Element tu = store.getTu(id);
			if (tu != null) {
				List<String[]> atts = new ArrayList<>();
				List<Attribute> aList = tu.getAttributes();
				Iterator<Attribute> at = aList.iterator();
				while (at.hasNext()) {
					Attribute a = at.next();
					atts.add(new String[] { a.getName(), a.getValue() });
				}
				Collections.sort(atts, (o1, o2) -> o1[0].compareTo(o2[0]));

				List<String[]> props = new ArrayList<>();
				List<Element> pList = tu.getChildren("prop");
				Iterator<Element> pt = pList.iterator();
				while (pt.hasNext()) {
					Element prop = pt.next();
					props.add(new String[] { prop.getAttributeValue("type"), prop.getText() });
				}
				Collections.sort(props, (o1, o2) -> o1[0].compareTo(o2[0]));

				List<String> notes = new ArrayList<>();
				List<Element> nList = tu.getChildren("note");
				Iterator<Element> nt = nList.iterator();
				while (nt.hasNext()) {
					notes.add(nt.next().getText());
				}

				JSONArray propertiesArray = new JSONArray();
				for (int i = 0; i < props.size(); i++) {
					propertiesArray.put(props.get(i));
				}
				result.put("properties", propertiesArray);
				JSONArray attributesArray = new JSONArray();
				for (int i = 0; i < atts.size(); i++) {
					attributesArray.put(atts.get(i));
				}
				result.put("attributes", attributesArray);
				JSONArray notesArray = new JSONArray();
				result.put("notes", notesArray);
				for (int i = 0; i < notes.size(); i++) {
					notesArray.put(notes.get(i));
				}
				result.put(Constants.STATUS, Constants.SUCCESS);
			} else {
				result.put(Constants.STATUS, Constants.ERROR);
				result.put(Constants.REASON, "null tu");
			}
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject delete(List<String> selected) {
		JSONObject result = new JSONObject();
		try {
			store.delete(selected);
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception ex) {
			logger.log(Level.SEVERE, ex.getMessage(), ex);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, ex.getMessage());
		}
		return result;
	}

	public JSONObject replaceText(String search, String replace, Language language, boolean regExp) {
		JSONObject result = new JSONObject();
		processing = true;
		processingError = "";
		try {
			Thread.ofVirtual().start(() -> {
				try {
					store.replaceText(search, replace, language, regExp);
				} catch (Exception e) {
					logger.log(Level.SEVERE, e.getMessage(), e);
					processingError = e.getMessage();
				}
				processing = false;
			});
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception ex) {
			processing = false;
			logger.log(Level.SEVERE, ex.getMessage(), ex);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, ex.getMessage());
		}
		return result;
	}

	public JSONObject insertUnit() {
		JSONObject result = new JSONObject();
		try {
			String id = "tmx" + System.currentTimeMillis();
			store.insertUnit(id);
			result.put(Constants.STATUS, Constants.SUCCESS);
			result.put("id", id);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject getAllLanguages() {
		JSONObject result = new JSONObject();
		try {
			JSONArray array = new JSONArray();
			List<Language> langs = LanguageUtils.getAllLanguages();
			Iterator<Language> it = langs.iterator();
			while (it.hasNext()) {
				Language lang = it.next();
				JSONObject json = new JSONObject();
				json.put("code", lang.getCode());
				json.put("name", lang.getDescription());
				array.put(json);
			}
			result.put("languages", array);
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (SAXException | IOException | ParserConfigurationException e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject removeUntranslated(Language lang) {
		JSONObject result = new JSONObject();
		processing = true;
		processingError = "";
		try {
			Thread.ofVirtual().start(() -> {
				try {
					store.removeUntranslated(lang);
				} catch (Exception e) {
					logger.log(Level.SEVERE, e.getMessage(), e);
					processingError = e.getMessage();
				}
				processing = false;
			});
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			processing = false;
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject removeSameAsSource(Language lang) {
		JSONObject result = new JSONObject();
		processing = true;
		processingError = "";
		try {
			Thread.ofVirtual().start(() -> {
				try {
					store.removeSameAsSource(lang);
				} catch (Exception e) {
					logger.log(Level.SEVERE, e.getMessage(), e);
					processingError = e.getMessage();
				}
				processing = false;
			});
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			processing = false;
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject addLanguage(Language lang) {
		JSONObject result = new JSONObject();
		try {
			store.addLanguage(lang);
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject removeLanguage(Language lang) {
		JSONObject result = new JSONObject();
		try {
			store.removeLanguage(lang);
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject removeTags() {
		JSONObject result = new JSONObject();
		processing = true;
		processingError = "";
		try {
			Thread.ofVirtual().start(() -> {
				try {
					store.removeTags();
				} catch (Exception e) {
					logger.log(Level.SEVERE, e.getMessage(), e);
					processingError = e.getMessage();
				}
				processing = false;
			});
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			processing = false;
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject changeLanguage(Language oldLanguage, Language newLanguage) {
		JSONObject result = new JSONObject();
		processing = true;
		processingError = "";
		try {
			Thread.ofVirtual().start(() -> {
				try {
					store.changeLanguage(oldLanguage, newLanguage);
				} catch (Exception e) {
					logger.log(Level.SEVERE, e.getMessage(), e);
					processingError = e.getMessage();
				}
				processing = false;
			});
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject createFile(Language srcLang, Language tgtLang) {
		JSONObject result = new JSONObject();
		try {
			Document doc = new Document(null, "tmx", null, null);
			Element tmx = doc.getRootElement();
			tmx.setAttribute("version", "1.4");
			Element header = new Element("header");
			header.setAttribute("creationid", System.getProperty("user.name"));
			header.setAttribute("creationdate", TmxUtils.tmxDate());
			header.setAttribute("creationtool", Constants.APPNAME);
			header.setAttribute("creationtoolversion", Constants.VERSION);
			header.setAttribute("datatype", "xml");
			header.setAttribute("segtype", "block");
			header.setAttribute("adminlang", "en");
			header.setAttribute("o-tmf", "unknown");
			header.setAttribute("srclang", srcLang.getCode());
			tmx.addContent(header);
			Element body = new Element("body");
			tmx.addContent(body);
			Element tu = new Element("tu");
			tu.setAttribute("creationid", System.getProperty("user.name"));
			tu.setAttribute("creationdate", TmxUtils.tmxDate());
			tu.setAttribute("creationtool", Constants.APPNAME);
			tu.setAttribute("creationtoolversion", Constants.VERSION);
			body.addContent(tu);
			Element tuv1 = new Element("tuv");
			tuv1.setAttribute("xml:lang", srcLang.getCode());
			tuv1.setAttribute("creationid", System.getProperty("user.name"));
			tuv1.setAttribute("creationdate", TmxUtils.tmxDate());
			Element seg1 = new Element("seg");
			seg1.setText(srcLang.getCode());
			tuv1.addContent(seg1);
			tu.addContent(tuv1);
			Element tuv2 = new Element("tuv");
			tuv2.setAttribute("xml:lang", tgtLang.getCode());
			tuv2.setAttribute("creationid", System.getProperty("user.name"));
			tuv2.setAttribute("creationdate", TmxUtils.tmxDate());
			Element seg2 = new Element("seg");
			seg2.setText(tgtLang.getCode());
			tuv2.addContent(seg2);
			tu.addContent(tuv2);

			File tempFile = File.createTempFile("temp", ".tmx");
			tempFile.deleteOnExit();
			Indenter.indent(tmx, getPreferences().getInt("indentation"));
			XMLOutputter outputter = new XMLOutputter();
			outputter.preserveSpace(true);
			try (FileOutputStream out = new FileOutputStream(tempFile)) {
				outputter.output(doc, out);
			}
			result.put(Constants.STATUS, Constants.SUCCESS);
			result.put("path", tempFile.getAbsolutePath());
		} catch (Exception ex) {
			logger.log(Level.SEVERE, ex.getMessage(), ex);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, ex.getMessage());
		}
		return result;
	}

	public JSONObject removeDuplicates() {
		JSONObject result = new JSONObject();
		processing = true;
		processingError = "";
		try {
			Thread.ofVirtual().start(() -> {
				try {
					store.removeDuplicates();
				} catch (Exception e) {
					logger.log(Level.SEVERE, e.getMessage(), e);
					processingError = e.getMessage();
				}
				processing = false;
			});
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject removeSpaces() {
		JSONObject result = new JSONObject();
		processing = true;
		processingError = "";
		try {
			Thread.ofVirtual().start(() -> {
				try {
					store.removeSpaces();
				} catch (Exception e) {
					logger.log(Level.SEVERE, e.getMessage(), e);
					processingError = e.getMessage();
				}
				processing = false;
			});
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject consolidateUnits(Language lang) {
		JSONObject result = new JSONObject();
		processing = true;
		processingError = "";
		try {
			Thread.ofVirtual().start(() -> {
				try {
					store.consolidateUnits(lang);
				} catch (Exception e) {
					logger.log(Level.SEVERE, e.getMessage(), e);
					processingError = e.getMessage();
				}
				processing = false;
			});
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			processing = false;
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject setAttributes(String id, String lang, List<String[]> attributes) {
		JSONObject result = new JSONObject();
		try {
			if (lang.isEmpty()) {
				store.setTuAttributes(id, attributes);
			} else {
				store.setTuvAttributes(id, lang, attributes);
			}
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception ex) {
			logger.log(Level.SEVERE, ex.getMessage(), ex);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, ex.getMessage());
		}
		return result;
	}

	public JSONObject getLoadingProgress() throws JSONException, SQLException {
		JSONObject result = new JSONObject();
		if (parsing) {
			result.put(Constants.STATUS, Constants.LOADING);
			result.put(Constants.LOADED, store.getCount());
		} else {
			if (!parsingError.isEmpty()) {
				result.put(Constants.STATUS, Constants.ERROR);
				result.put(Constants.REASON, parsingError);
			} else {
				if (store != null) {
					result.put(Constants.STATUS, Constants.COMPLETED);
					result.put("count", store.getCount());
				} else {
					result.put(Constants.STATUS, Constants.ERROR);
					result.put(Constants.REASON, Constants.NULLSTORE);
				}
			}
		}
		return result;
	}

	public JSONObject getSavingProgress() {
		JSONObject result = new JSONObject();
		if (store != null) {
			if (saving) {
				result.put(Constants.STATUS, Constants.SAVING);
			} else {
				result.put(Constants.STATUS, Constants.COMPLETED);
			}
			result.put("count", store.getSaved());
			if (!savingError.isEmpty()) {
				result.put(Constants.STATUS, Constants.ERROR);
				result.put(Constants.REASON, savingError);
			}
		} else {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Constants.NULLSTORE);
		}
		return result;
	}

	public JSONObject splitFile(String file, int parts) {
		JSONObject result = new JSONObject();
		File f = new File(file);
		if (!f.exists()) {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Messages.getString("TMXService.3"));
			return result;
		}
		splitting = true;
		splitError = "";
		Thread.ofVirtual().start(() -> {
			try {
				countStore = new CountStore();
				TMXReader reader = new TMXReader(countStore);
				reader.parse(f);
				long total = countStore.getCount();
				long l = total / parts;
				if (total % parts != 0) {
					l++;
				}
				splitStore = new SplitStore(f, l);
				JSONObject json = getPreferences();
				splitStore.setIndentation(json.getInt("indentation"));
				countStore = null;
				reader = new TMXReader(splitStore);
				reader.parse(f);
				splitStore.close();
				splitStore = null;
			} catch (Exception ex) {
				if (ex.getMessage() != null) {
					splitError = ex.getMessage();
				} else {
					splitError = Messages.getString("TMXService.4");
				}
			}
			splitting = false;
		});
		result.put(Constants.STATUS, Constants.SUCCESS);
		return result;
	}

	public JSONObject getSplitProgress() {
		JSONObject result = new JSONObject();
		if (splitting) {
			if (countStore != null) {
				result.put(Constants.STATUS, Constants.SUCCESS);
				result.put("count", countStore.getCount() + Messages.getString("TMXService.5"));
			}
			if (splitStore != null) {
				result.put(Constants.STATUS, Constants.SUCCESS);
				result.put("count", splitStore.getCount() + Messages.getString("TMXService.6"));
			}
		} else {
			if (splitError.isEmpty()) {
				result.put(Constants.STATUS, Constants.COMPLETED);
			} else {
				result.put(Constants.STATUS, Constants.ERROR);
				result.put(Constants.REASON, splitError);
			}
		}
		return result;
	}

	public JSONObject mergeFiles(String merged, List<String> files) {
		JSONObject result = new JSONObject();
		merging = true;
		mergeError = "";
		Thread.ofVirtual().start(() -> {
			try {
				JSONObject json = getPreferences();
				int indentation = json.getInt("indentation");
				try (FileOutputStream out = new FileOutputStream(new File(merged))) {
					Element header = new Element("header");
					header.setAttribute("creationdate", TmxUtils.tmxDate());
					header.setAttribute("creationtool", Constants.APPNAME);
					header.setAttribute("creationtoolversion", Constants.VERSION);
					header.setAttribute("datatype", "xml");
					header.setAttribute("segtype", "block");
					header.setAttribute("adminlang", "en");
					header.setAttribute("o-tmf", "unknown");
					header.setAttribute("srclang", "*all*");
					out.write(
							("""
									<?xml version="1.0" encoding="UTF-8"?>
									<!DOCTYPE tmx PUBLIC "-//LISA OSCAR:1998//DTD for Translation Memory eXchange//EN" "tmx14.dtd">
									<tmx version="1.4">
									""")
									.getBytes(StandardCharsets.UTF_8));
					out.write((TextUtils.padding(1, indentation) + header.toString() + "\n")
							.getBytes(StandardCharsets.UTF_8));
					out.write((TextUtils.padding(1, indentation) + "<body>\n").getBytes(StandardCharsets.UTF_8));
					mergeStore = new MergeStore(out);
					mergeStore.setIndentation(indentation);
					TMXReader reader = new TMXReader(mergeStore);
					Iterator<String> it = files.iterator();
					while (it.hasNext()) {
						File f = new File(it.next());
						reader.parse(f);
					}
					out.write((TextUtils.padding(1, indentation) + "</body>\n").getBytes(StandardCharsets.UTF_8));
					out.write("</tmx>".getBytes(StandardCharsets.UTF_8));
				}
			} catch (Exception e) {
				logger.log(Level.SEVERE, e.getMessage(), e);
				if (e.getMessage() != null) {
					mergeError = e.getMessage();
				} else {
					mergeError = Messages.getString("TMXService.7");
				}
			}
			merging = false;
		});
		result.put(Constants.STATUS, Constants.SUCCESS);
		return result;
	}

	public JSONObject getMergeProgress() {
		JSONObject result = new JSONObject();
		if (merging) {
			result.put(Constants.STATUS, Constants.SUCCESS);
		} else {
			if (mergeError.isEmpty()) {
				result.put(Constants.STATUS, Constants.COMPLETED);
			} else {
				result.put(Constants.STATUS, Constants.ERROR);
				result.put(Constants.REASON, mergeError);
			}
		}
		return result;
	}

	public JSONObject setProperties(String id, String lang, List<String[]> dataList) {
		JSONObject result = new JSONObject();
		try {
			if (lang.isEmpty()) {
				store.setTuProperties(id, dataList);
			} else {
				store.setTuvProperties(id, lang, dataList);
			}
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception ex) {
			logger.log(Level.SEVERE, ex.getMessage(), ex);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, ex.getMessage());
		}
		return result;
	}

	public JSONObject setNotes(String id, String lang, List<String> notes) {
		JSONObject result = new JSONObject();
		try {
			if (lang.isEmpty()) {
				store.setTuNotes(id, notes);
			} else {
				store.setTuvNotes(id, lang, notes);
			}
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception ex) {
			logger.log(Level.SEVERE, ex.getMessage(), ex);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, ex.getMessage());
		}
		return result;
	}

	public JSONObject cleanCharacters(String file) {
		JSONObject result = new JSONObject();
		cleaning = true;
		cleaningError = "";
		Thread.ofVirtual().start(() -> {
			try {
				TMXCleaner.clean(file);
			} catch (IOException e) {
				logger.log(Level.SEVERE, e.getMessage(), e);
				cleaningError = e.getMessage();
			}
			cleaning = false;
		});
		result.put(Constants.STATUS, Constants.SUCCESS);
		return result;
	}

	public JSONObject cleaningProgress() {
		JSONObject result = new JSONObject();
		if (cleaning) {
			result.put(Constants.STATUS, Constants.SUCCESS);
		} else {
			if (cleaningError.isEmpty()) {
				result.put(Constants.STATUS, Constants.COMPLETED);
			} else {
				result.put(Constants.STATUS, Constants.ERROR);
				result.put(Constants.REASON, cleaningError);
			}
		}
		return result;
	}

	public JSONObject setSrcLanguage(Language lang) {
		JSONObject result = new JSONObject();
		if (store != null) {
			Element header = store.getHeader();
			header.setAttribute("srclang", lang.getCode());
			store.storeHeader(header);
			result.put(Constants.STATUS, Constants.SUCCESS);
		} else {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Constants.NULLSTORE);
		}
		return result;
	}

	public JSONObject getSrcLanguage() {
		JSONObject result = new JSONObject();
		if (store != null) {
			Element header = store.getHeader();
			String code = header.getAttributeValue("srclang");
			result.put(Constants.STATUS, Constants.SUCCESS);
			if ("*all*".equals(code)) {
				result.put("srcLang", code);
				result.put(Constants.STATUS, Constants.SUCCESS);
			} else {
				try {
					Language l = LanguageUtils.getLanguage(code);
					if (l != null) {
						result.put("srcLang", l.getCode());
						result.put(Constants.STATUS, Constants.SUCCESS);
					} else {
						result.put(Constants.STATUS, Constants.ERROR);
						MessageFormat mf = new MessageFormat(Messages.getString("TMXService.8"));
						result.put(Constants.REASON, mf.format(new String[] { code }));
					}
				} catch (IOException | SAXException | ParserConfigurationException e) {
					result.put(Constants.STATUS, Constants.ERROR);
					result.put(Constants.REASON, e.getMessage());
				}
			}
		} else {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Constants.NULLSTORE);
		}
		return result;
	}

	public JSONObject exportDelimited(String file) {
		JSONObject result = new JSONObject();
		exporting = true;
		exportingError = "";
		try {
			Thread.ofVirtual().start(() -> {
				try {
					store.exportDelimited(file);
				} catch (Exception ex) {
					logger.log(Level.SEVERE, ex.getMessage(), ex);
					exportingError = ex.getMessage();
				}
				exporting = false;
			});
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject exportExcel(String file) {
		JSONObject result = new JSONObject();
		exporting = true;
		exportingError = "";
		try {
			Thread.ofVirtual().start(() -> {
				try {
					store.exportExcel(file);
				} catch (Exception ex) {
					logger.log(Level.SEVERE, ex.getMessage(), ex);
					exportingError = ex.getMessage();
				}
				exporting = false;
			});
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject exportProgress() {
		JSONObject result = new JSONObject();
		if (store != null) {
			if (exporting) {
				result.put(Constants.STATUS, Constants.SUCCESS);
			} else {
				if (exportingError.isEmpty()) {
					result.put(Constants.STATUS, Constants.COMPLETED);
				} else {
					result.put(Constants.STATUS, Constants.ERROR);
					result.put(Constants.REASON, exportingError);
				}
			}
		} else {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Constants.NULLSTORE);
		}
		return result;
	}

	public JSONObject getTuvData(String id, String lang) {
		JSONObject result = new JSONObject();
		try {
			Element tuv = store.getTuv(id, lang);
			if (tuv != null) {
				List<String[]> atts = new ArrayList<>();
				List<Attribute> aList = tuv.getAttributes();
				Iterator<Attribute> at = aList.iterator();
				while (at.hasNext()) {
					Attribute a = at.next();
					atts.add(new String[] { a.getName(), a.getValue() });
				}

				List<String[]> props = new ArrayList<>();
				List<Element> pList = tuv.getChildren("prop");
				Iterator<Element> pt = pList.iterator();
				while (pt.hasNext()) {
					Element prop = pt.next();
					props.add(new String[] { prop.getAttributeValue("type"), prop.getText() });
				}

				List<String> notes = new ArrayList<>();
				List<Element> nList = tuv.getChildren("note");
				Iterator<Element> nt = nList.iterator();
				while (nt.hasNext()) {
					notes.add(nt.next().getText());
				}

				JSONArray propertiesArray = new JSONArray();
				for (int i = 0; i < props.size(); i++) {
					propertiesArray.put(props.get(i));
				}
				result.put("properties", propertiesArray);
				JSONArray attributesArray = new JSONArray();
				for (int i = 0; i < atts.size(); i++) {
					attributesArray.put(atts.get(i));
				}
				result.put("attributes", attributesArray);
				JSONArray notesArray = new JSONArray();
				result.put("notes", notesArray);
				for (int i = 0; i < notes.size(); i++) {
					notesArray.put(notes.get(i));
				}
			} else {
				JSONArray attributes = new JSONArray();
				attributes.put(new String[] { "xml:lang", lang });
				result.put("attributes", attributes);
				result.put("properties", new JSONArray());
				result.put("notes", new JSONArray());
			}
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject validateFile(String file) {
		JSONObject result = new JSONObject();
		validating = true;
		validatingError = "";
		Thread.ofVirtual().start(() -> {
			try {
				TMXValidator validator = new TMXValidator();
				validator.validate(new File(file));
			} catch (IOException | SAXException | ParserConfigurationException e) {
				logger.log(Level.SEVERE, e.getMessage(), e);
				validatingError = e.getMessage();
			}
			validating = false;
		});
		result.put(Constants.STATUS, Constants.SUCCESS);
		return result;
	}

	public JSONObject validatingProgress() {
		JSONObject result = new JSONObject();
		if (validating) {
			result.put(Constants.STATUS, Constants.SUCCESS);
		} else {
			if (validatingError.isEmpty()) {
				result.put(Constants.STATUS, Constants.COMPLETED);
			} else {
				result.put(Constants.STATUS, Constants.ERROR);
				result.put(Constants.REASON, validatingError);
			}
		}
		return result;
	}

	public JSONObject getCharsets() {
		JSONObject result = new JSONObject();
		TreeMap<String, Charset> charsets = new TreeMap<>(Charset.availableCharsets());
		Set<String> keys = charsets.keySet();
		JSONArray codes = new JSONArray();
		Iterator<String> i = keys.iterator();
		while (i.hasNext()) {
			Charset cset = charsets.get(i.next());
			codes.put(cset.name());
		}
		result.put("charsets", codes);
		result.put(Constants.STATUS, Constants.SUCCESS);
		return result;
	}

	public JSONObject previewExcel(String excelFile) {
		JSONObject result = new JSONObject();
		ExcelReader reader = new ExcelReader();
		try {
			JSONArray array = new JSONArray();
			List<Sheet> sheets = reader.parseFile(excelFile);
			for (int i = 0; i < sheets.size(); i++) {
				JSONObject json = new JSONObject();
				Sheet sheet = sheets.get(i);
				json.put("name", sheet.getName());
				Set<String> cols = sheet.getColumns();
				json.put("columns", cols.size());
				json.put("rows", sheet.rowsCount());
				JSONArray data = new JSONArray();
				JSONArray colsRow = new JSONArray();
				Iterator<String> it = cols.iterator();
				while (it.hasNext()) {
					colsRow.put(it.next());
				}
				data.put(colsRow);
				for (int j = 0; j < 10 && j < sheet.rowsCount(); j++) {
					Map<String, String> map = sheet.getRow(j);
					JSONArray row = new JSONArray();
					it = cols.iterator();
					while (it.hasNext()) {
						String cell = map.get(it.next());
						row.put(cell != null ? cell : "");
					}
					data.put(row);
				}
				json.put("data", data);
				Map<String, String> firstRow = sheet.getRow(0);
				if (firstRow != null && firstRow.size() == cols.size()) {
					List<String> langs = new ArrayList<>();
					it = cols.iterator();
					while (it.hasNext()) {
						String cell = firstRow.get(it.next());
						if (cell != null) {
							Language lang = LanguageUtils.getLanguage(cell);
							if (lang != null) {
								langs.add(lang.getCode());
							}
						}
					}
					if (langs.size() == cols.size()) {
						JSONArray langsArray = new JSONArray();
						for (int j = 0; j < langs.size(); j++) {
							langsArray.put(langs.get(j));
						}
						json.put("langs", langsArray);
					}
				}
				array.put(json);
			}
			result.put("sheets", array);
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (IOException | SAXException | ParserConfigurationException e) {
			logger.log(Level.SEVERE, "Error reading Excel", e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Messages.getString("TMXService.9"));
			return result;
		}
		return result;
	}

	public JSONObject previewCsv(String csvFile, List<String> langs, String charSet, String columnsSeparator,
			String textDelimiter, boolean fixQuotes, boolean optionalDelims) {
		JSONObject result = new JSONObject();
		List<String> lines = new ArrayList<>();
		ArrayList<String> languages = new ArrayList<>();
		if (langs != null) {
			languages.addAll(langs);
		}
		try (InputStreamReader input = new InputStreamReader(new FileInputStream(csvFile), charSet)) {
			try (BufferedReader buffer = new BufferedReader(input)) {
				String line = "";
				while ((line = buffer.readLine()) != null) {
					if (line.length() > 2048) {
						line = line.substring(0, 2047);
					}
					if (fixQuotes) {
						line = TextUtils.replaceAll(line, "\"\"", "\u2033", false);
					}
					lines.add(line);
					if (lines.size() > 10) {
						break;
					}
				}
			}
		} catch (IOException ioe) {
			logger.log(Level.SEVERE, "Error reading CSV", ioe);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Messages.getString("TMXService.10"));
			return result;
		}

		byte[] feff = { -1, -2 }; // UTF-16BE
		byte[] fffe = { -2, -1 }; // UTF-16LE
		byte[] efbbbf = { -17, -69, -65 }; // UTF-8

		try {
			byte[] array = lines.get(0).getBytes(charSet);
			if (array[0] == fffe[0] && array[1] == fffe[1]) {
				String line = lines.get(0).substring(1);
				lines.set(0, line);
			}
			if (array[0] == feff[0] && array[1] == feff[1]) {
				String line = lines.get(0).substring(1);
				lines.set(0, line);
			}
			if (array[0] == efbbbf[0] && array[1] == efbbbf[1] && array[2] == efbbbf[2]) {
				String line = lines.get(0).substring(1);
				lines.set(0, line);
			}
		} catch (UnsupportedEncodingException uee) {
			logger.log(Level.SEVERE, "Error reading CSV", uee);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Messages.getString("TMXService.10"));
			return result;
		}
		int cols = 0;

		StringBuilder builder = new StringBuilder();
		if (delimitersOk(lines, columnsSeparator, textDelimiter, optionalDelims)) {
			if (languages.isEmpty()) {
				String line = lines.get(0);
				String[] parts = TMXConverter.getParts(line, columnsSeparator, textDelimiter, optionalDelims);

				try {
					boolean hasLanguages = true;
					for (int i = 0; i < parts.length; i++) {
						String code = parts[i];
						if (!textDelimiter.isEmpty()) {
							code = code.substring(1);
							code = code.substring(0, code.length() - 1);
						}
						if (LanguageUtils.getLanguage(code) == null) {
							hasLanguages = false;
							break;
						}
					}
					if (hasLanguages) {
						for (int i = 0; i < parts.length; i++) {
							String code = parts[i];
							if (!textDelimiter.isEmpty()) {
								code = code.substring(1);
								code = code.substring(0, code.length() - 1);
							}
							languages.add(code);
						}
					}
				} catch (IOException | SAXException | ParserConfigurationException ex) {
					logger.log(Level.SEVERE, "Error checking CSV languages", ex);
					result.put(Constants.REASON, Messages.getString("TMXService.12"));
					return result;
				}
			}
			builder.append("<table class='stripes'>");
			if (!languages.isEmpty()) {
				builder.append("<thead><tr>");
				Iterator<String> it = languages.iterator();
				while (it.hasNext()) {
					builder.append("<th>");
					String cell = it.next();
					builder.append(TextUtils.cleanString(cell));
					builder.append("</th>");
				}
				builder.append("</tr></thead>");
			}
			builder.append("<tbody>");
			Iterator<String> it = lines.iterator();
			while (it.hasNext()) {
				String line = it.next();
				String[] parts = TMXConverter.getParts(line, columnsSeparator, textDelimiter, optionalDelims);

				cols = parts.length;
				builder.append("<tr>");
				for (int i = 0; i < parts.length; i++) {
					builder.append("<td style='padding:1px; margin:0px;'>");
					String cell = parts[i];
					if (!textDelimiter.isEmpty()) {
						if (optionalDelims) {
							if (cell.startsWith(textDelimiter) && cell.endsWith(textDelimiter)) {
								cell = cell.substring(1);
								cell = cell.substring(0, cell.length() - 1);
							}
						} else {
							cell = cell.substring(1);
							cell = cell.substring(0, cell.length() - 1);
						}
					}
					if (fixQuotes) {
						cell = cell.replace("\"\"", "\"");
					}
					if (cell.length() > 25) {
						cell = cell.substring(0, 25) + "...";
					}
					builder.append(TextUtils.cleanString(cell));
					builder.append("</td>");
				}
				builder.append("</tr>");
			}
			builder.append("</tbody></table>");
		} else {
			builder.append("<pre>");
			for (int i = 0; i < lines.size(); i++) {
				builder.append(TextUtils.cleanString(lines.get(i)));
				builder.append('\n');
			}
			builder.append("</pre>");
		}
		result.put(Constants.STATUS, Constants.SUCCESS);
		result.put("cols", cols);
		result.put("langs", languages.size());
		JSONArray langArray = new JSONArray();
		for (int i = 0; i < languages.size(); i++) {
			langArray.put(languages.get(i));
		}
		result.put("langCodes", langArray);
		result.put("preview", builder.toString());
		return result;
	}

	public JSONObject convertCsv(String csvFile, String tmxFile, List<String> languages, String charSet,
			String columsSeparator, String textDelimiter, boolean fixQuotes, boolean optionalDelims) {
		JSONObject result = new JSONObject();
		try {
			TMXConverter.csv2tmx(csvFile, tmxFile, languages, charSet, columsSeparator, textDelimiter, fixQuotes,
					optionalDelims);
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			try {
				Files.deleteIfExists(new File(tmxFile).toPath());
			} catch (IOException e1) {
				// do nothing
			}
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject saveIndentation(int value) {
		JSONObject result = new JSONObject();
		try {
			JSONObject json = getPreferences();
			json.put("indentation", value);
			savePreferences(json);
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public static String encodeURIcomponent(String s) {
		StringBuilder o = new StringBuilder();
		for (char ch : s.toCharArray()) {
			if (isUnsafe(ch)) {
				o.append('%');
				o.append(toHex(ch / 16));
				o.append(toHex(ch % 16));
			} else {
				o.append(ch);
			}
		}
		return o.toString();
	}

	private static char toHex(int ch) {
		return (char) (ch < 10 ? '0' + ch : 'A' + ch - 10);
	}

	private static boolean isUnsafe(char ch) {
		if (ch > 128 || ch < 0) {
			return true;
		}
		return " %$&+,/:;=?@<>#%".indexOf(ch) >= 0;
	}

	private static boolean delimitersOk(List<String> lines, String columnsSeparator, String textDelimiter,
			boolean optionalDelims) {
		int columns = -1;
		Iterator<String> it = lines.iterator();
		boolean sameDelimiter = true;
		String delimiter = "";
		while (it.hasNext()) {
			String line = it.next();
			String[] parts = TMXConverter.getParts(line, columnsSeparator, textDelimiter, optionalDelims);

			if (!textDelimiter.isEmpty() && !optionalDelims) {
				for (int i = 0; i < parts.length; i++) {
					if (!parts[i].startsWith(textDelimiter)) {
						return false;
					}
					if (!parts[i].endsWith(textDelimiter)) {
						return false;
					}
				}
			} else if (sameDelimiter) {
				for (int i = 0; i < parts.length; i++) {
					if (parts[i].isEmpty()) {
						sameDelimiter = false;
						break;
					}
					if (delimiter.isEmpty()) {
						delimiter = "" + parts[i].charAt(0);
					}
					if (!parts[i].startsWith(delimiter)) {
						sameDelimiter = false;
						break;
					}
					if (!parts[i].endsWith(delimiter)) {
						sameDelimiter = false;
						break;
					}
				}
			}
			if (columns == -1) {
				columns = parts.length;
			}
			if (columns != parts.length) {
				return false;
			}
			if (columns == 1) {
				return false;
			}
		}
		return !(textDelimiter.isEmpty() && sameDelimiter);
	}

	public JSONObject processTasks(JSONObject json) {
		JSONObject result = new JSONObject();
		processing = true;
		processingError = "";
		try {
			Thread.ofVirtual().start(() -> {
				try {
					if (json.getBoolean("tags")) {
						store.removeTags();
					}
					if (json.getBoolean("spaces")) {
						store.removeSpaces();
					}
					if (json.getBoolean("untranslated")) {
						store.removeUntranslated(new Language(json.getString("sourceLanguage"),
								LanguageUtils.getLanguage(json.getString("sourceLanguage")).getDescription()));
					}
					if (json.getBoolean("duplicates")) {
						store.removeDuplicates();
					}
					if (json.getBoolean("consolidate")) {
						store.consolidateUnits(new Language(json.getString("sourceLanguage"),
								LanguageUtils.getLanguage(json.getString("sourceLanguage")).getDescription()));
					}
				} catch (Exception e) {
					logger.log(Level.SEVERE, e.getMessage(), e);
					processingError = e.getMessage();
				}
				processing = false;
			});
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (Exception e) {
			logger.log(Level.SEVERE, e.getMessage(), e);
			processing = false;
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject convertExcel(String excelFile, String tmxFile, String sheetName, List<String> langs) {
		JSONObject result = new JSONObject();
		try {
			ExcelReader reader = new ExcelReader();
			List<Sheet> sheets = reader.parseFile(excelFile);
			for (int i = 0; i < sheets.size(); i++) {
				Sheet sheet = sheets.get(i);
				if (sheetName.equals(sheet.getName())) {
					TMXConverter.excel2tmx(tmxFile, sheet, langs);
					break;
				}
			}
			result.put(Constants.STATUS, Constants.SUCCESS);
		} catch (IOException | SAXException | ParserConfigurationException e) {
			try {
				Files.deleteIfExists(new File(tmxFile).toPath());
			} catch (IOException e1) {
				// do nothing
			}
			logger.log(Level.SEVERE, e.getMessage(), e);
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result;
	}

	public JSONObject getFileInfo() throws JSONException, SQLException {
		JSONObject result = new JSONObject();
		if (store != null) {
			try {
				result.put("count", store.getCount());
				result.put(Constants.STATUS, Constants.SUCCESS);
				Set<String> codes = store.getLanguages();
				if (codes == null || codes.isEmpty()) {
					result.put(Constants.STATUS, Constants.ERROR);
					result.put(Constants.REASON, Messages.getString("TMXService.11"));
					return result;
				}
				Iterator<String> it = codes.iterator();
				JSONArray data = new JSONArray();
				while (it.hasNext()) {
					String code = it.next();
					JSONObject json = new JSONObject();
					json.put("code", code);
					json.put("name", LanguageUtils.getLanguage(code).getDescription());
					data.put(json);
				}
				result.put("languages", data);
			} catch (IOException | SAXException | ParserConfigurationException e) {
				logger.log(Level.SEVERE, e.getMessage(), e);
				result.put(Constants.STATUS, Constants.ERROR);
				result.put(Constants.REASON, e.getMessage());
			}
		} else {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, Constants.NULLSTORE);
		}
		return result;
	}

	public static JSONObject getPreferences() throws JSONException, IOException {
		JSONObject result = new JSONObject();
		File home = getPreferencesFolder();
		if (!home.exists()) {
			home.mkdirs();
		}
		File preferences = new File(home, "preferences.json");
		if (!preferences.exists()) {
			JSONObject prefs = new JSONObject();
			prefs.put("theme", "system");
			prefs.put("appLang", "en");
			prefs.put("indentation", 2);
			prefs.put("changeId", false);
			try (FileOutputStream output = new FileOutputStream(preferences)) {
				output.write(prefs.toString().getBytes(StandardCharsets.UTF_8));
			}
		}
		try (FileReader input = new FileReader(preferences)) {
			try (BufferedReader reader = new BufferedReader(input)) {
				StringBuilder builder = new StringBuilder();
				String line = "";
				while ((line = reader.readLine()) != null) {
					if (!builder.isEmpty()) {
						builder.append('\n');
					}
					builder.append(line);
				}
				result = new JSONObject(builder.toString());
			}
		}
		if (!result.has("changeId")) {
			result.put("changeId", false);
		}
		return result;
	}

	private JSONObject savePreferences(JSONObject json) throws JSONException, IOException {
		JSONObject result = new JSONObject();
		File home = getPreferencesFolder();
		if (!home.exists()) {
			home.mkdirs();
		}
		File preferences = new File(home, "preferences.json");
		try (FileOutputStream output = new FileOutputStream(preferences)) {
			output.write(json.toString(2).getBytes(StandardCharsets.UTF_8));
		}
		return result;
	}

    public JSONObject saveFileAttributes(JSONObject attributes) {
        ((SqlStore)store).setFileAttributes(attributes);
		JSONObject result = new JSONObject();
		result.put(Constants.STATUS, Constants.SUCCESS);
		return result;
    }

	public JSONObject saveFileProperties(JSONArray properties) {
		((SqlStore)store).setFileProperties(properties);
		JSONObject result = new JSONObject();
		result.put(Constants.STATUS, Constants.SUCCESS);
		return result;
	}

	public Object saveFileNotes(JSONArray notes) {
		((SqlStore)store).setFileNotes(notes);
		JSONObject result = new JSONObject();
		result.put(Constants.STATUS, Constants.SUCCESS);
		return result;
	}
}
