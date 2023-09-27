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

package com.maxprograms.tmxserver;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.lang.System.Logger;
import java.lang.System.Logger.Level;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import javax.xml.parsers.ParserConfigurationException;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.xml.sax.SAXException;

import com.maxprograms.languages.Language;
import com.maxprograms.languages.LanguageUtils;
import com.maxprograms.tmxserver.models.TUnit;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

public class TMXServer implements HttpHandler {

	private static Logger logger = System.getLogger(TMXServer.class.getName());
	private HttpServer server;
	private TMXService service;

	public TMXServer(Integer port) throws IOException {
		server = HttpServer.create(new InetSocketAddress(port), 0);
		server.createContext("/TMXServer", this);
		server.setExecutor(new ThreadPoolExecutor(3, 10, 20, TimeUnit.SECONDS, new ArrayBlockingQueue<>(100)));
		service = new TMXService();
	}

	public static void main(String[] args) {
		String port = "8050";
		for (int i = 0; i < args.length; i++) {
			String arg = args[i];
			if (arg.equals("-port") && (i + 1) < args.length) {
				port = args[i + 1];
			}
			if (arg.equals("-lang") && (i + 1) < args.length) {
				String lang = args[i + 1];
				Locale.setDefault(new Locale(lang));
			}
		}
		try {
			TMXServer instance = new TMXServer(Integer.valueOf(port));
			instance.run();
		} catch (Exception e) {
			logger.log(Level.ERROR, "Server error", e);
		}
	}

	private void run() {
		server.start();
		logger.log(Level.INFO, "TMXServer started");
	}

	@Override
	public void handle(HttpExchange t) throws IOException {
		try {
			String request = "";
			try (InputStream is = t.getRequestBody()) {
				request = readRequestBody(is);
			}
			if (request.isBlank()) {
				throw new IOException(Messages.getString("TMXServer.0"));
			}
			String response = "";
			JSONObject json = new JSONObject(request);
			String command = json.getString("command");
			try {
				switch (command) {
					case "version":
						JSONObject obj = new JSONObject();
						obj.put("tool", "TMXServer");
						obj.put("version", Constants.VERSION);
						obj.put("build", Constants.BUILD);
						response = obj.toString();
						break;
					case "stop":
						if (service.isOpen()) {
							service.closeFile();
						}
						JSONObject stop = new JSONObject();
						stop.put(Constants.STATUS, Constants.SUCCESS);
						response = stop.toString();
						break;
					case "closeFile":
						response = closeFile();
						break;
					case "saveFile":
						response = saveFile(json.getString("file"));
						break;
					case "savingProgress":
						response = getSavingProgress();
						break;
					case "openFile":
						response = openFile(json.getString("file"));
						break;
					case "fileInfo":
						response = service.getFileInfo().toString();
						break;
					case "loadingProgress":
						response = getLoadingProgress();
						break;
					case "getLanguages":
						response = getLanguages();
						break;
					case "getSegments":
						response = getSegments(json);
						break;
					case "getTuData":
						response = getTuData(json.getString("id"));
						break;
					case "getTuvData":
						response = getTuvData(json.getString("id"), json.getString("lang"));
						break;
					case "saveTuvData":
						response = saveTuvData(json);
						break;
					case "consolidateUnits":
						response = consolidateUnits(json.getString("srcLang"));
						break;
					case "processingProgress":
						response = getProcessingProgress();
						break;
					case "getCount":
						response = getCount();
						break;
					case "validateFile":
						response = validateFile(json.getString("file"));
						break;
					case "validatingProgress":
						response = getValidatingProgress();
						break;
					case "cleanCharacters":
						response = cleanCharacters(json.getString("file"));
						break;
					case "cleaningProgress":
						response = getCleaningProgress();
						break;
					case "removeUntranslated":
						response = removeUntranslated(json.getString("srcLang"));
						break;
					case "removeSameAsSource":
						response = removeSameAsSource(json.getString("srcLang"));
						break;
					case "replaceText":
						response = replaceText(json);
						break;
					case "removeSpaces":
						response = removeSpaces();
						break;
					case "removeDuplicates":
						response = removeDuplicates();
						break;
					case "getAllLanguages":
						response = getAllLanguages();
						break;
					case "changeLanguage":
						response = changeLanguage(json);
						break;
					case "insertUnit":
						response = insertUnit();
						break;
					case "deleteUnits":
						response = deleteUnits(json);
						break;
					case "createFile":
						response = createFile(json);
						break;
					case "getFileProperties":
						response = getFileProperties();
						break;
					case "removeTags":
						response = removeTags();
						break;
					case "removeLanguage":
						response = removeLanguage(json);
						break;
					case "addLanguage":
						response = addLanguage(json);
						break;
					case "getSrcLanguage":
						response = getSrcLanguage();
						break;
					case "setSrcLanguage":
						response = setSrcLanguage(json);
						break;
					case "exportProgress":
						response = exportProgress();
						break;
					case "exportDelimited":
						response = exportDelimited(json);
						break;
					case "exportExcel":
						response = exportExcel(json);
						break;
					case "splitFile":
						response = splitFile(json);
						break;
					case "getSplitProgress":
						response = getSplitProgress();
						break;
					case "mergeFiles":
						response = mergeFiles(json);
						break;
					case "getMergeProgress":
						response = getMergeProgress();
						break;
					case "getCharsets":
						response = getCharsets();
						break;
					case "previewCsv":
						response = previewCsv(json);
						break;
					case "previewExcel":
						response = previewExcel(json);
						break;
					case "convertCsv":
						response = convertCsv(json);
						break;
					case "convertExcel":
						response = convertExcel(json);
						break;
					case "setAttributes":
						response = setAttributes(json);
						break;
					case "setProperties":
						response = setProperties(json);
						break;
					case "setNotes":
						response = setNotes(json);
						break;
					case "processTasks":
						response = processTasks(json);
						break;
					case "systemInfo":
						response = getSystemInformation();
						break;
					default:
						JSONObject unknown = new JSONObject();
						unknown.put(Constants.STATUS, Constants.ERROR);
						unknown.put(Constants.REASON, Messages.getString("TMXServer.1"));
						unknown.put("received", json.toString());
						response = unknown.toString();
				}
			} catch (IOException | SAXException | ParserConfigurationException e) {
				logger.log(Level.ERROR, e);
				JSONObject error = new JSONObject();
				error.put(Constants.STATUS, Constants.ERROR);
				error.put(Constants.REASON, e.getMessage());
				response = error.toString();
			}
			t.getResponseHeaders().add("content-type", "application/json; charset=utf-8");
			byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
			t.sendResponseHeaders(200, bytes.length);
			try (ByteArrayInputStream stream = new ByteArrayInputStream(bytes)) {
				try (OutputStream os = t.getResponseBody()) {
					byte[] array = new byte[2048];
					int read;
					while ((read = stream.read(array)) != -1) {
						os.write(array, 0, read);
					}
				}
			}
		} catch (IOException e) {
			logger.log(Level.ERROR, e);
			String message = e.getMessage();
			t.sendResponseHeaders(500, message.length());
			try (OutputStream os = t.getResponseBody()) {
				os.write(message.getBytes());
			}
		}
	}

	private String setAttributes(JSONObject json) {
		List<String[]> attributes = new ArrayList<>();
		JSONArray array = json.getJSONArray("attributes");
		for (int i = 0; i < array.length(); i++) {
			JSONArray pair = array.getJSONArray(i);
			String[] att = new String[2];
			att[0] = pair.getString(0);
			att[1] = pair.getString(1);
			attributes.add(att);
		}
		return service.setAttributes(json.getString("id"), json.getString("lang"), attributes).toString();
	}

	private String setNotes(JSONObject json) {
		List<String> notes = new ArrayList<>();
		JSONArray array = json.getJSONArray("notes");
		for (int i = 0; i < array.length(); i++) {
			notes.add(array.getString(i));
		}
		return service.setNotes(json.getString("id"), json.getString("lang"), notes).toString();
	}

	private String setProperties(JSONObject json) {
		List<String[]> props = new ArrayList<>();
		JSONArray array = json.getJSONArray("properties");
		for (int i = 0; i < array.length(); i++) {
			JSONArray pair = array.getJSONArray(i);
			String[] prop = new String[2];
			prop[0] = pair.getString(0);
			prop[1] = pair.getString(1);
			props.add(prop);
		}
		return service.setProperties(json.getString("id"), json.getString("lang"), props).toString();
	}

	private String convertCsv(JSONObject json) {
		JSONArray array = json.getJSONArray("langs");
		List<String> langs = new ArrayList<>();
		for (int i = 0; i < array.length(); i++) {
			langs.add(array.getString(i));
		}
		return service.convertCsv(json.getString("csvFile"), json.getString("tmxFile"), langs,
				json.getString("charSet"), json.getString("columnsSeparator"), json.getString("textDelimiter"),
				json.getBoolean("fixQuotes"), json.getBoolean("optionalDelims")).toString();
	}

	private String convertExcel(JSONObject json) {
		JSONArray array = json.getJSONArray("langs");
		List<String> langs = new ArrayList<>();
		for (int i = 0; i < array.length(); i++) {
			langs.add(array.getString(i));
		}
		return service
				.convertExcel(json.getString("excelFile"), json.getString("tmxFile"), json.getString("sheet"), langs)
				.toString();
	}

	private String previewCsv(JSONObject json) {
		JSONArray array = json.getJSONArray("langs");
		List<String> langs = new ArrayList<>();
		for (int i = 0; i < array.length(); i++) {
			langs.add(array.getString(i));
		}
		return service.previewCsv(json.getString("csvFile"), langs, json.getString("charSet"),
				json.getString("columnsSeparator"), json.getString("textDelimiter"), json.getBoolean("fixQuotes"),
				json.getBoolean("optionalDelims")).toString();
	}

	private String previewExcel(JSONObject json) {
		return service.previewExcel(json.getString("excelFile")).toString();
	}

	private String getCharsets() {
		return service.getCharsets().toString();
	}

	private String getMergeProgress() {
		return service.getMergeProgress().toString();
	}

	private String mergeFiles(JSONObject json) {
		JSONArray array = json.getJSONArray("files");
		List<String> files = new ArrayList<>();
		for (int i = 0; i < array.length(); i++) {
			files.add(array.getString(i));
		}
		return service.mergeFiles(json.getString("merged"), files).toString();
	}

	private String getSplitProgress() {
		return service.getSplitProgress().toString();
	}

	private String splitFile(JSONObject json) {
		return service.splitFile(json.getString("file"), json.getInt("parts")).toString();
	}

	private String exportProgress() {
		return service.exportProgress().toString();
	}

	private String exportDelimited(JSONObject json) {
		return service.exportDelimited(json.getString("file")).toString();
	}

	private String exportExcel(JSONObject json) {
		return service.exportExcel(json.getString("file")).toString();
	}

	private String setSrcLanguage(JSONObject json) {
		try {
			Language lang = LanguageUtils.getLanguage(json.getString("lang"));
			return service.setSrcLanguage(lang).toString();
		} catch (IOException | JSONException | SAXException | ParserConfigurationException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String getSrcLanguage() {
		return service.getSrcLanguage().toString();
	}

	private String removeLanguage(JSONObject json) {
		try {
			Language lang = LanguageUtils.getLanguage(json.getString("lang"));
			return service.removeLanguage(lang).toString();
		} catch (IOException | JSONException | SAXException | ParserConfigurationException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String addLanguage(JSONObject json) {
		try {
			Language lang = LanguageUtils.getLanguage(json.getString("lang"));
			return service.addLanguage(lang).toString();
		} catch (IOException | JSONException | SAXException | ParserConfigurationException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String removeTags() {
		return service.removeTags().toString();
	}

	private String processTasks(JSONObject json) {
		return service.processTasks(json).toString();
	}

	private String createFile(JSONObject json) {
		try {
			Language srcLang = LanguageUtils.getLanguage(json.getString("srcLang"));
			Language tgtLang = LanguageUtils.getLanguage(json.getString("tgtLang"));
			return service.createFile(srcLang, tgtLang).toString();
		} catch (IOException | JSONException | SAXException | ParserConfigurationException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String getFileProperties() {
		return service.getFileProperties().toString();
	}

	private String insertUnit() {
		return service.insertUnit().toString();
	}

	private String deleteUnits(JSONObject json) {
		JSONArray array = json.getJSONArray("selected");
		List<String> selected = new ArrayList<>();
		for (int i = 0; i < array.length(); i++) {
			selected.add(array.getString(i));
		}
		return service.delete(selected).toString();
	}

	private String changeLanguage(JSONObject json) {
		try {
			Language oldLang = LanguageUtils.getLanguage(json.getString("oldLanguage"));
			Language newLang = LanguageUtils.getLanguage(json.getString("newLanguage"));
			return service.changeLanguage(oldLang, newLang).toString();
		} catch (IOException | JSONException | SAXException | ParserConfigurationException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String getAllLanguages() {
		return service.getAllLanguages().toString();
	}

	private String cleanCharacters(String file) {
		return service.cleanCharacters(file).toString();
	}

	private String getCleaningProgress() {
		return service.cleaningProgress().toString();
	}

	private String removeDuplicates() {
		return service.removeDuplicates().toString();
	}

	private String removeSpaces() {
		return service.removeSpaces().toString();
	}

	private String replaceText(JSONObject json) {
		try {
			String search = "";
			if (json.has("search")) {
				search = json.getString("search");
			}
			String replace = "";
			if (json.has("replace")) {
				replace = json.getString("replace");
			}
			String lang = "";
			if (json.has("lang")) {
				lang = json.getString("lang");
			}
			Language language = LanguageUtils.getLanguage(lang);
			boolean regExp = false;
			if (json.has("regExp")) {
				regExp = json.getBoolean("regExp");
			}
			return service.replaceText(search, replace, language, regExp).toString();
		} catch (IOException | SAXException | ParserConfigurationException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String removeUntranslated(String srcLang) {
		try {
			Language lang = LanguageUtils.getLanguage(srcLang);
			return service.removeUntranslated(lang).toString();
		} catch (IOException | SAXException | ParserConfigurationException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String removeSameAsSource(String srcLang) {
		try {
			Language lang = LanguageUtils.getLanguage(srcLang);
			return service.removeSameAsSource(lang).toString();
		} catch (IOException | SAXException | ParserConfigurationException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String validateFile(String file) {
		return service.validateFile(file).toString();
	}

	private String getValidatingProgress() {
		return service.validatingProgress().toString();
	}

	private String getCount() {
		return service.getCount().toString();
	}

	private String getProcessingProgress() {
		return service.getProcessingProgress().toString();
	}

	private String getSavingProgress() {
		return service.getSavingProgress().toString();
	}

	private String consolidateUnits(String srcLang) {
		try {
			Language lang = LanguageUtils.getLanguage(srcLang);
			return service.consolidateUnits(lang).toString();
		} catch (IOException | SAXException | ParserConfigurationException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String saveFile(String file) {
		JSONObject result = service.saveFile(file);
		return result.toString();
	}

	private String saveTuvData(JSONObject json) {
		return service.saveData(json.getString("id"), json.getString("lang"), json.getString("data")).toString();
	}

	private String getSegments(JSONObject json) {
		JSONObject result = new JSONObject();
		try {
			String filterText = null;
			if (json.has("filterText")) {
				filterText = json.getString("filterText");
			}
			Language filterLanguage = null;
			if (json.has("filterLanguage")) {
				filterLanguage = LanguageUtils.getLanguage(json.getString("filterLanguage"));
			}
			boolean filterUntranslated = false;
			if (json.has("filterUntranslated")) {
				filterUntranslated = json.getBoolean("filterUntranslated");
			}
			boolean regExp = false;
			if (json.has("regExp")) {
				regExp = json.getBoolean("regExp");
			}
			Language filterSrcLanguage = null;
			if (json.has("filterSrcLanguage")) {
				filterSrcLanguage = LanguageUtils.getLanguage(json.getString("filterSrcLanguage"));
			}
			Language sortLanguage = null;
			if (json.has("sortLanguage")) {
				sortLanguage = LanguageUtils.getLanguage(json.getString("sortLanguage"));
			}
			boolean ascending = true;
			if (json.has("ascending")) {
				ascending = json.getBoolean("ascending");
			}
			boolean caseSensitiveFilter = false;
			if (json.has("caseSensitiveFilter")) {
				caseSensitiveFilter = json.getBoolean("caseSensitiveFilter");
			}
			JSONObject segments = service.getData(json.getInt("start"), json.getInt("count"), filterText,
					filterLanguage, caseSensitiveFilter, filterUntranslated, regExp, filterSrcLanguage, sortLanguage,
					ascending);
			result.put(Constants.STATUS, segments.getString(Constants.STATUS));

			if (segments.getString(Constants.STATUS).equals(Constants.SUCCESS)) {
				JSONArray units = segments.getJSONArray("units");

				List<Language> fileLanguages = new ArrayList<>();
				JSONArray langs = service.getLanguages().getJSONArray("languages");
				for (int i = 0; i < langs.length(); i++) {
					Language lang = LanguageUtils.getLanguage(langs.getJSONObject(i).getString("code"));
					fileLanguages.add(lang);
				}

				JSONArray array = new JSONArray();
				for (int i = 0; i < units.length(); i++) {
					TUnit unit = new TUnit(units.getJSONObject(i));
					array.put(unit.toHTML(fileLanguages));
				}
				result.put("units", array);
			} else {
				result.put(Constants.REASON, segments.getString(Constants.REASON));
			}
		} catch (IOException | JSONException | SAXException | ParserConfigurationException e) {
			result.put(Constants.STATUS, Constants.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result.toString(2);
	}

	private String getLanguages() throws JSONException, IOException, SAXException, ParserConfigurationException {
		return service.getLanguages().toString();
	}

	private static String readRequestBody(InputStream is) throws IOException {
		StringBuilder request = new StringBuilder();
		try (BufferedReader rd = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
			String line;
			while ((line = rd.readLine()) != null) {
				request.append(line);
			}
		}
		return request.toString();
	}

	private String openFile(String file) {
		return service.openFile(file).toString();
	}

	private String getLoadingProgress() {
		return service.getLoadingProgress().toString();
	}

	private String closeFile() {
		return service.closeFile().toString();
	}

	private String getTuData(String id) {
		return service.getTuData(id).toString();
	}

	private String getTuvData(String id, String lang) {
		return service.getTuvData(id, lang).toString();
	}

	private static String getSystemInformation() {
		JSONObject result = new JSONObject();
		MessageFormat mf1 = new MessageFormat(Messages.getString("TMXServer.2"));
		result.put("tmxeditor", mf1.format(new String[] { Constants.VERSION, Constants.BUILD }));
		result.put("openxliff", mf1.format(new String[] { com.maxprograms.converters.Constants.VERSION,
				com.maxprograms.converters.Constants.BUILD }));
		result.put("xmljava", mf1
				.format(new String[] { com.maxprograms.xml.Constants.VERSION, com.maxprograms.xml.Constants.BUILD }));
		MessageFormat mf2 = new MessageFormat(Messages.getString("TMXServer.3"));
		result.put("java",
				mf2.format(new String[] { System.getProperty("java.version"), System.getProperty("java.vendor") }));
		return result.toString();
	}
}
