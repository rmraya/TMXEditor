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
import java.util.Iterator;
import java.util.List;
import java.util.ArrayList;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import com.maxprograms.tmxserver.models.Language;
import com.maxprograms.tmxserver.models.Result;
import com.maxprograms.tmxserver.models.TUnit;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import org.json.JSONArray;
import org.json.JSONObject;

public class TMXServer implements HttpHandler {

	private static Logger logger = System.getLogger(TMXServer.class.getName());
	private HttpServer server;
	private TMXService service;
	private boolean debug;

	public TMXServer(Integer port) throws IOException {
		server = HttpServer.create(new InetSocketAddress(port), 0);
		server.createContext("/TMXServer", this);
		server.setExecutor(new ThreadPoolExecutor(3, 10, 20, TimeUnit.SECONDS, new ArrayBlockingQueue<Runnable>(100)));
		service = new TMXService();
	}

	public static void main(String[] args) {
		String port = "8050";
		boolean shouldDebug = false;
		for (int i = 0; i < args.length; i++) {
			String arg = args[i];
			if (arg.equals("-version")) {
				logger.log(Level.INFO, () -> "Version: " + Constants.VERSION + " Build: " + Constants.BUILD);
				return;
			}
			if (arg.equals("-port") && (i + 1) < args.length) {
				port = args[i + 1];
			}
			if (arg.equals("-debug")) {
				shouldDebug = true;
			}
		}
		try {
			TMXServer instance = new TMXServer(Integer.valueOf(port));
			instance.setDebug(shouldDebug);
			instance.run();
		} catch (Exception e) {
			logger.log(Level.ERROR, "Server error", e);
		}
	}

	private void setDebug(boolean value) {
		debug = value;
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
				throw new IOException("Empty request");
			}
			if (debug) {
				logger.log(Level.INFO, request);
			}
			String response = "";
			JSONObject json = new JSONObject(request);
			String command = json.getString("command");
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
				stop.put(Constants.STATUS, Result.SUCCESS);
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
			case "splitFile":
				response = splitFile(json);
				break;
			case "getSplitProgress":
				response = getSplitProgress();
				break;
			default:
				JSONObject unknown = new JSONObject();
				unknown.put(Constants.STATUS, Result.ERROR);
				unknown.put(Constants.REASON, "Unknown command");
				unknown.put("received", json.toString());
				response = unknown.toString();
			}
			if (debug) {
				logger.log(Level.INFO, response);
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
			if ("stop".equals(command)) {
				if (debug) {
					logger.log(Level.INFO, "Stopping server");
				}
				System.exit(0);
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

	private String setSrcLanguage(JSONObject json) {
		try {
			Language lang = service.getLanguage(json.getString("lang"));
			return service.setSrcLanguage(lang).toString();
		} catch (IOException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Result.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String getSrcLanguage() {
		return service.getSrcLanguage().toString();
	}

	private String removeLanguage(JSONObject json) {
		try {
			Language lang = service.getLanguage(json.getString("lang"));
			return service.removeLanguage(lang).toString();
		} catch (IOException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Result.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String addLanguage(JSONObject json) {
		try {
			Language lang = service.getLanguage(json.getString("lang"));
			return service.addLanguage(lang).toString();
		} catch (IOException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Result.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String removeTags() {
		return service.removeTags().toString();
	}

	private String createFile(JSONObject json) {
		try {
			Language srcLang = service.getLanguage(json.getString("srcLang"));
			Language tgtLang = service.getLanguage(json.getString("tgtLang"));
			return service.createFile(srcLang, tgtLang).toString();
		} catch (IOException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Result.ERROR);
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
			Language oldLang = service.getLanguage(json.getString("oldLanguage"));
			Language newLang = service.getLanguage(json.getString("newLanguage"));
			return service.changeLanguage(oldLang, newLang).toString();
		} catch (IOException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Result.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String getAllLanguages() {
		JSONObject result = new JSONObject();
		Result<Language> res = service.getAllLanguages();
		if (res.getResult().equals(Result.SUCCESS)) {
			JSONArray array = new JSONArray();
			Iterator<Language> it = res.getData().iterator();
			while (it.hasNext()) {
				array.put(it.next().toJSON());
			}
			result.put("languages", array);
			result.put(Constants.STATUS, Result.SUCCESS);
		} else {
			result.put(Constants.STATUS, Result.ERROR);
			result.put(Constants.REASON, res.getMessage());
		}
		return result.toString();
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
			Language language = service.getLanguage(lang);
			boolean regExp = false;
			if (json.has("regExp")) {
				regExp = json.getBoolean("regExp");
			}
			return service.replaceText(search, replace, language, regExp).toString();
		} catch (IOException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Result.ERROR);
			result.put(Constants.REASON, e.getMessage());
			return result.toString();
		}
	}

	private String removeUntranslated(String srcLang) {
		try {
			Language lang = service.getLanguage(srcLang);
			return service.removeUntranslated(lang).toString();
		} catch (IOException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Result.ERROR);
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
			Language lang = service.getLanguage(srcLang);
			return service.consolidateUnits(lang).toString();
		} catch (IOException e) {
			logger.log(Level.ERROR, e);
			JSONObject result = new JSONObject();
			result.put(Constants.STATUS, Result.ERROR);
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
				filterLanguage = service.getLanguage(json.getString("filterLanguage"));
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
				filterSrcLanguage = service.getLanguage(json.getString("filterSrcLanguage"));
			}
			Language sortLanguage = null;
			if (json.has("sortLanguage")) {
				sortLanguage = service.getLanguage(json.getString("sortLanguage"));
			}
			boolean ascending = false;
			if (json.has("ascending")) {
				ascending = json.getBoolean("ascending");
			}
			boolean caseSensitiveFilter = false;
			if (json.has("caseSensitiveFilter")) {
				caseSensitiveFilter = json.getBoolean("caseSensitiveFilter");
			}
			Result<TUnit> segments = service.getData(json.getInt("start"), json.getInt("count"), filterText,
					filterLanguage, caseSensitiveFilter, filterUntranslated, regExp, filterSrcLanguage, sortLanguage,
					ascending);
			result.put(Constants.STATUS, segments.getResult());
			if (segments.getResult().equals(Result.SUCCESS)) {
				List<TUnit> units = segments.getData();
				JSONArray array = new JSONArray();
				Iterator<TUnit> it = units.iterator();
				List<Language> fileLanguages = service.getLanguages().getData();
				while (it.hasNext()) {
					array.put(it.next().toHTML(fileLanguages));
				}
				result.put("units", array);
			} else {
				result.put(Constants.REASON, segments.getMessage());
			}
		} catch (Exception e) {
			result.put(Constants.STATUS, Result.ERROR);
			result.put(Constants.REASON, e.getMessage());
		}
		return result.toString(2);
	}

	private String getLanguages() {
		JSONObject result = new JSONObject();
		Result<Language> languages = service.getLanguages();
		result.put(Constants.STATUS, languages.getResult());
		if (languages.getResult().equals(Result.SUCCESS)) {
			JSONArray array = new JSONArray();
			Iterator<Language> it = languages.getData().iterator();
			while (it.hasNext()) {
				array.put(it.next().toJSON());
			}
			result.put("languages", array);
		} else {
			result.put(Constants.REASON, languages.getMessage());
		}
		return result.toString();
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
		String[] data = service.getTuData(id);
		if (Result.SUCCESS.equals(data[0])) {
			return new JSONObject(data[1]).toString();
		}
		JSONObject result = new JSONObject();
		result.put(Constants.REASON, data[1]);
		return result.toString();
	}

	private String getTuvData(String id, String lang) {
		String[] data = service.getTuvData(id, lang);
		if (Result.SUCCESS.equals(data[0])) {
			return new JSONObject(data[1]).toString();
		}
		JSONObject result = new JSONObject();
		result.put(Constants.REASON, data[1]);
		return result.toString();
	}
}
