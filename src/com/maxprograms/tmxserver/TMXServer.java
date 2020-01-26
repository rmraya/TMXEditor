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
		String request = "";
		try (InputStream is = t.getRequestBody()) {
			request = readRequestBody(is);
		}
		if (debug) {
			logger.log(Level.INFO, request);
		}
		JSONObject json = null;
		String response = "";
		String command = "version";
		try {
			if (!request.isBlank()) {
				json = new JSONObject(request);
				command = json.getString("command");
			}
			if ("version".equals(command)) {
				JSONObject obj = new JSONObject();
				obj.put("tool", "TMXServer");
				obj.put("version", Constants.VERSION);
				obj.put("build", Constants.BUILD);
				response = obj.toString(2);
			} else if ("stop".equals(command)) {
				if (service.isOpen()) {
					service.closeFile();
				}
				JSONObject obj = new JSONObject();
				obj.put("status", Result.SUCCESS);
				response = obj.toString(2);
			} else if ("closeFile".equals(command)) {
				response = closeFile();
			} else if ("openFile".equals(command)) {
				response = openFile(json.getString("file"));
			} else if ("loadingProgress".equals(command)) {
				response = getLoadingProgress();
			} else if ("getLanguages".equals(command)) {
				response = getLanguages();
			} else if ("getSegments".equals(command)) {
				response = getSegments(json);
			} else if ("getTuData".equals(command)) {
				response = getTuData(json.getString("id"));
			} else if ("getTuvData".equals(command)) {
				response = getTuvData(json.getString("id"), json.getString("lang"));
			} else {
				JSONObject obj = new JSONObject();
				obj.put("status", Result.ERROR);
				obj.put("reason", "Unknown command");
				obj.put("received", json.toString());
				response = obj.toString(2);
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
				System.exit(0);
			}
		} catch (IOException e) {
			response = e.getMessage();
			t.sendResponseHeaders(500, response.length());
			try (OutputStream os = t.getResponseBody()) {
				os.write(response.getBytes());
			}
		}
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
					filterLanguage, caseSensitiveFilter, filterUntranslated, regExp,
					filterSrcLanguage, sortLanguage, ascending);
			result.put("status", segments.getResult());
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
				result.put("reason", segments.getMessage());
			}
		} catch (Exception e) {
			result.put("status", Result.ERROR);
			result.put("reason", e.getMessage());
		}
		return result.toString(2);
	}

	private String getLanguages() {
		JSONObject result = new JSONObject();
		Result<Language> languages = service.getLanguages();
		result.put("status", languages.getResult());
		if (languages.getResult().equals(Result.SUCCESS)) {
			JSONArray array = new JSONArray();
			Iterator<Language> it = languages.getData().iterator();
			while (it.hasNext()) {
				array.put(it.next().toJSON());
			}
			result.put("languages", array);
		} else {
			result.put("reason", languages.getMessage());
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
		JSONObject result = new JSONObject();
		String[] res = service.openFile(file);
		result.put("status", res[0]);
		if (!Result.SUCCESS.equals(res[0])) {
			result.put("reason", res[1]);
		}
		return result.toString();
	}

	private String getLoadingProgress() {
		JSONObject result = service.getLoadingProgress();
		return result.toString();
	}

	private String closeFile() {
		JSONObject result = new JSONObject();
		String[] res = service.closeFile();
		result.put("status", res[0]);
		if (!Result.SUCCESS.equals(res[0])) {
			result.put("reason", res[1]);
		}
		return result.toString();
	}

	private String getTuData(String id) {
		String[] data = service.getTuData(id);
		if (Result.SUCCESS.equals(data[0])) {
			return new JSONObject(data[1]).toString();
		}
		JSONObject result = new JSONObject();
		result.put("reason", data[1]);
		return result.toString();
	}

	private String getTuvData(String id, String lang) {
		String[] data = service.getTuvData(id, lang);
		if (Result.SUCCESS.equals(data[0])) {
			return new JSONObject(data[1]).toString();
		}
		JSONObject result = new JSONObject();
		result.put("reason", data[1]);
		return result.toString();
	}
}
