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
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.net.InetAddress;
import java.net.URL;
import java.net.URLConnection;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.TreeMap;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.crypto.NoSuchPaddingException;
import javax.net.ssl.HttpsURLConnection;
import javax.xml.parsers.ParserConfigurationException;

import com.maxprograms.capi.DiskId;
import com.maxprograms.capi.HexDate;
import com.maxprograms.capi.LFile;
import com.maxprograms.capi.Nics;
import com.maxprograms.converters.StringConverter;
import com.maxprograms.languages.RegistryParser;
import com.maxprograms.tmxserver.models.FileProperties;
import com.maxprograms.tmxserver.models.Language;
import com.maxprograms.tmxserver.models.Result;
import com.maxprograms.tmxserver.models.TUnit;
import com.maxprograms.tmxserver.models.TuProperties;
import com.maxprograms.tmxserver.tmx.CountStore;
import com.maxprograms.tmxserver.tmx.MapDbStore;
import com.maxprograms.tmxserver.tmx.MergeStore;
import com.maxprograms.tmxserver.tmx.SimpleStore;
import com.maxprograms.tmxserver.tmx.SplitStore;
import com.maxprograms.tmxserver.tmx.StoreInterface;
import com.maxprograms.tmxserver.tmx.TMXCleaner;
import com.maxprograms.tmxserver.tmx.TMXConverter;
import com.maxprograms.tmxserver.tmx.TMXReader;
import com.maxprograms.tmxserver.tmx.TmxUtils;
import com.maxprograms.tmxserver.utils.LangUtils;
import com.maxprograms.tmxserver.utils.TextUtils;
import com.maxprograms.tmxvalidation.TMXValidator;
import com.maxprograms.xml.Attribute;
import com.maxprograms.xml.Document;
import com.maxprograms.xml.Element;
import com.maxprograms.xml.Indenter;
import com.maxprograms.xml.SAXBuilder;
import com.maxprograms.xml.XMLOutputter;
import org.json.JSONObject;
import org.xml.sax.SAXException;

public class TMXService implements TMXServiceInterface {

	protected static final Logger LOGGER = Logger.getLogger(TMXService.class.getName());
	protected static final String FILE_SEPARATOR = System.getProperty("file.separator");

	protected StoreInterface store;
	protected File currentFile;
	private RegistryParser registry;
	protected int indentation;

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

	private static File getPreferencesFolder() {
		String os = System.getProperty("os.name").toLowerCase();
		if (os.startsWith("mac")) {
			return new File(System.getProperty("user.home") + "/Library/Application Support/TMXEditor/");
		}
		if (os.startsWith("windows")) {
			return new File(System.getenv("AppData") + "\\TMXEditor\\");
		}
		return new File(System.getProperty("user.home") + "/.tmxeditor/");
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

	@Override
	public String[] openFile(String fileName) {
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
			long size = currentFile.length();
			if (size > 100l * 1024 * 1024) {
				store = new MapDbStore(tmp.getAbsolutePath());
			} else {
				store = new SimpleStore();
			}
			parsingError = "";
			Thread thread = new Thread() {
				@Override
				public void run() {
					try {
						TMXReader reader = new TMXReader(store);
						reader.parse(currentFile);
					} catch (Exception e) {
						LOGGER.log(Level.SEVERE, e.getMessage(), e);
						parsingError = e.getMessage();
						try {
							store.close();
						} catch (Exception e1) {
							// do nothing
						}
						store = null;
					}
					parsing = false;
				}
			};
			thread.start();
			return new String[] { Result.SUCCESS };
		} catch (Exception ex) {
			LOGGER.log(Level.SEVERE, ex.getMessage(), ex);
			parsing = false;
			return new String[] { Result.ERROR, ex.getMessage() };
		}
	}

	@Override
	public Result<TUnit> getData(int start, int count, String filterText, Language filterLanguage,
			boolean caseSensitiveFilter, boolean filterUntranslated, boolean regExp, Language filterSrcLanguage,
			Language sortLanguage, boolean ascending) {
		processing = true;
		processingError = "";
		Result<TUnit> result = new Result<>();
		List<TUnit> data = null;
		try {
			data = store.getUnits(start, count, filterText, filterLanguage, caseSensitiveFilter, filterUntranslated,
					regExp, filterSrcLanguage, sortLanguage, ascending);
			result.setData(data);
			result.setResult(Result.SUCCESS);
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			processingError = e.getMessage();
			result.setResult(Result.ERROR);
			result.setMessage(e.getMessage());
		}
		processing = false;
		return result;
	}

	@Override
	public Result<Language> getLanguages() {
		Result<Language> result = new Result<>();
		if (parsing) {
			result.setResult(Result.ERROR);
			result.setMessage("Requested languages while parsing");
			return result;
		}
		if (store == null) {
			result.setResult(Result.ERROR);
			result.setMessage("Null store");
			return result;
		}
		if (registry == null) {
			try {
				registry = new RegistryParser();
			} catch (IOException e) {
				LOGGER.log(Level.SEVERE, e.getMessage(), e);
				result.setMessage(e.getMessage());
				return result;
			}
		}
		List<Language> data = new ArrayList<>();
		Set<String> codes = store.getLanguages();
		if (codes == null || codes.isEmpty()) {
			result.setResult(Result.ERROR);
			result.setMessage("Error getting languages from store");
			return result;
		}
		Iterator<String> it = codes.iterator();
		while (it.hasNext()) {
			String code = it.next();
			data.add(new Language(code, registry.getTagDescription(code)));
		}
		result.setData(data);
		result.setResult(Result.SUCCESS);
		return result;
	}

	@Override
	public String[] getProcessingProgress() {
		if (processing && store != null) {
			return new String[] { Result.SUCCESS, "Processed " + store.getProcessed() + " units" };
		}
		if (!processing && store != null) {
			return new String[] { Result.COMPLETED };
		}
		if (!processingError.isEmpty()) {
			return new String[] { Result.ERROR, processingError };
		}
		return new String[] { Result.ERROR, "Not doing anything at this time" };
	}

	@Override
	public String[] getCount() {
		if (store != null) {
			return new String[] { Result.SUCCESS, "" + store.getCount() };
		}
		return new String[] { Result.ERROR };
	}

	@Override
	public String[] closeFile() {
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
				return new String[] { Result.SUCCESS };
			} catch (Exception e) {
				LOGGER.log(Level.SEVERE, e.getMessage(), e);
				return new String[] { Result.ERROR, e.getMessage() };
			}
		}
		return new String[] { Result.ERROR, "Null Store" };
	}

	@Override
	public String[] checkUpdates() {
		String version = "";
		try {
			URL url = new URL("https://www.maxprograms.com/tmxeditor");
			URLConnection connection = url.openConnection();
			connection.setConnectTimeout(10000);
			try (InputStream input = connection.getInputStream()) {
				byte[] array = new byte[1024];
				int bytes = input.read(array);
				if (bytes != -1) {
					version = new String(array, StandardCharsets.UTF_8).trim();
				}
			}
			return new String[] { Result.SUCCESS, version };
		} catch (IOException e) {
			return new String[] { Result.ERROR, "Error checking for updates" };
		}
	}

	@Override
	public String[] saveData(String id, String lang, String value) {
		try {
			String updated = store.saveData(id, lang, value);
			return new String[] { Result.SUCCESS, updated };
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public String[] saveFile(String file) {
		saving = true;
		currentFile = new File(file);
		getIndentation();
		store.setIndentation(indentation);

		savingError = "";
		try {
			new Thread() {
				@Override
				public void run() {
					try {
						store.writeFile(currentFile);
					} catch (Exception ex) {
						LOGGER.log(Level.SEVERE, ex.getMessage(), ex);
						savingError = ex.getMessage();
					}
					saving = false;
				}
			}.start();
			return new String[] { Result.SUCCESS };
		} catch (Exception ex) {
			return new String[] { Result.ERROR, ex.getMessage() };
		}
	}

	@Override
	public Result<FileProperties> getFileProperties() {
		Result<FileProperties> result = new Result<>();
		if (currentFile != null) {
			result.setResult(Result.SUCCESS);
			Element header = store.getHeader();

			List<String[]> properties = new ArrayList<>();
			List<Element> propsList = header.getChildren("prop");
			Iterator<Element> propsIt = propsList.iterator();
			while (propsIt.hasNext()) {
				Element prop = propsIt.next();
				properties.add(new String[] { prop.getAttributeValue("type"), prop.getText() });
			}

			List<String> notes = new ArrayList<>();
			List<Element> notesList = header.getChildren("note");
			Iterator<Element> notesIt = notesList.iterator();
			while (notesIt.hasNext()) {
				Element note = notesIt.next();
				notes.add(note.getText());
			}

			FileProperties file = new FileProperties(currentFile.getAbsolutePath(),
					header.getAttributeValue("creationtool"), header.getAttributeValue("creationtoolversion"),
					header.getAttributeValue("segtype"), header.getAttributeValue("o-tmf"),
					header.getAttributeValue("adminlang"), header.getAttributeValue("srclang"),
					header.getAttributeValue("datatype"), properties, notes);
			List<FileProperties> data = new ArrayList<>();
			data.add(file);
			result.setData(data);
		} else {
			result.setResult(Result.ERROR);
			result.setMessage("No file open.");
		}
		return result;
	}

	@Override
	public String[] isRegistered() {
		try {
			LFile lfile = new LFile(new File(getPreferencesFolder(), Constants.LICENSE), "TMXEditor");
			if (LFile.ENABLED == lfile.checkLicense()) {
				if (checkVersion()) {
					return new String[] { Result.SUCCESS };
				}
			}
			return new String[] { Result.NOT_REGISTERED };
		} catch (Exception e) {
			return new String[] { Result.NOT_REGISTERED };
		}
	}

	private static boolean checkVersion() throws IOException, SAXException, ParserConfigurationException {
		File folder = TmxUtils.getWorkFolder();
		File versionFile = new File(folder, "version.xml");
		if (!versionFile.exists()) {
			return false;
		}
		SAXBuilder builder = new SAXBuilder();
		Document doc = builder.build(versionFile);
		Element root = doc.getRootElement();
		return root.getText().equals(Constants.VERSION) && root.getAttributeValue("build").equals(Constants.BUILD);
	}

	@Override
	public Result<Boolean> registerLicense(String license) {
		Result<Boolean> result = new Result<>();
		if (license.matches(".*[A-F|0-9][A-F|0-9][A-F|0-9]-[A-F|0-9][A-F|0-9][A-F|0-9]?")) {
			long now = System.currentTimeMillis();
			String[] parts = license.split("-");
			HexDate date = new HexDate(license.substring(license.indexOf(parts[parts.length - 2])));
			Calendar cd = Calendar.getInstance();
			cd.set(date.getYear(), date.getMonth(), date.getDay());
			if (now > cd.getTimeInMillis()) {
				result.setResult(Result.NOT_REGISTERED);
				result.setMessage("Expired License");
				return result;
			}
		}
		try {
			String server = "https://apps.maxprograms.com/MXPWebSite/Register";
			List<String> cards = Nics.getCards();
			StringBuilder cardList = new StringBuilder();
			Iterator<String> it = cards.iterator();
			while (it.hasNext()) {
				if (!cardList.toString().isEmpty()) {
					cardList.append('|');
				}
				cardList.append(it.next());
			}
			String hostName = "unknown";
			try {
				hostName = InetAddress.getLocalHost().getHostName();
			} catch (java.net.UnknownHostException unk) {
				if (FILE_SEPARATOR.equals("/")) {
					StringBuilder host = new StringBuilder();
					Process p = Runtime.getRuntime().exec("hostname");
					try (BufferedReader input = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
						String line;
						while ((line = input.readLine()) != null) {
							host.append(line.trim());
						}
					}
					if (!host.toString().isEmpty()) {
						hostName = host.toString();
					}
				}
			}

			List<String> disks = null;
			try {
				disks = DiskId.getDiskIds();
			} catch (IOException ioe) {
				result.setResult(Result.NOT_REGISTERED);
				result.setMessage("Unsupported hard disks");
				return result;
			}
			StringBuilder diskList = new StringBuilder();
			Iterator<String> id = disks.iterator();
			while (id.hasNext()) {
				if (!diskList.toString().isEmpty()) {
					diskList.append('|');
				}
				diskList.append(id.next());
			}
			URL url = new URL(server + "?license=" + StringConverter.encodeString(license) + "&key="
					+ StringConverter.encodeString(cardList.toString()) + "&product=" + "TMXEditor" + "&version="
					+ Constants.VERSION + "&user=" + encodeURIcomponent(System.getProperty("user.name")) + "&hostname="
					+ encodeURIcomponent(hostName) + "&hd=" + StringConverter.encodeString(diskList.toString()));
			HttpsURLConnection con = (HttpsURLConnection) url.openConnection();
			String res = "";
			try (InputStream input = con.getInputStream()) {
				int available = input.available();
				byte[] array = new byte[available];
				int bytes = input.read(array);
				if (bytes != -1) {
					res = StringConverter.decodeString(new String(array).trim());
				}
			}
			con.disconnect();
			if (!res.startsWith("OK")) {
				if (res.length() > 2) {
					result.setResult(Result.NOT_REGISTERED);
					result.setMessage(res.substring(2));
					return result;
				}
				result.setResult(Result.NOT_REGISTERED);
				result.setMessage("Error registering license");
				return result;
			}
			String name = res.substring(2);
			LFile lfile = new LFile(new File(getPreferencesFolder(), Constants.LICENSE), "TMXEditor");
			lfile.setUser(name);
			lfile.setKey(license);
			lfile.enable(cards, disks);

			File folder = TmxUtils.getWorkFolder();
			File versionFile = new File(folder, "version.xml");
			try (FileOutputStream output = new FileOutputStream(versionFile)) {
				Document doc = new Document(null, "version", null, null);
				Element root = doc.getRootElement();
				root.setText(Constants.VERSION);
				root.setAttribute("build", Constants.BUILD);
				XMLOutputter outputter = new XMLOutputter();
				outputter.output(doc, output);
			}
			result.setResult(Result.SUCCESS);
		} catch (Exception e) {
			result.setResult(Result.NOT_REGISTERED);
			result.setMessage("Error registering license");
		}
		return result;
	}

	@Override
	public String[] requestTrial(String firstName, String lastName, String company, String email) {
		String userid = System.getProperty("user.name");
		if (userid == null || userid.equals("")) {
			return new String[] { Result.ERROR, "A computer user account is required" };
		}
		List<String> cards = null;
		try {
			cards = Nics.getCards();
		} catch (Exception e) {
			return new String[] { Result.ERROR, "Error generating trial key" };
		}
		if (cards.isEmpty()) {
			return new String[] { Result.ERROR, "Cannot register trial in this computer" };
		}
		StringBuilder cardList = new StringBuilder();
		Iterator<String> it = cards.iterator();
		while (it.hasNext()) {
			if (!cardList.toString().isEmpty()) {
				cardList.append('|');
			}
			cardList.append(it.next());
		}
		List<String> disks = null;
		try {
			disks = DiskId.getDiskIds();
		} catch (IOException ioe) {
			return new String[] { Result.ERROR, "Unsupported hard disk" };
		}
		StringBuilder diskList = new StringBuilder();
		Iterator<String> id = disks.iterator();
		while (id.hasNext()) {
			if (!diskList.toString().isEmpty()) {
				diskList.append('|');
			}
			diskList.append(id.next());
		}
		String result = "";
		try {
			String hostName = "unknown";
			try {
				hostName = InetAddress.getLocalHost().getHostName();
			} catch (java.net.UnknownHostException unk) {
				if (FILE_SEPARATOR.equals("/")) {
					StringBuilder host = new StringBuilder();
					Process p = Runtime.getRuntime().exec("hostname");
					try (BufferedReader input = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
						String line;
						while ((line = input.readLine()) != null) {
							host.append(line.trim());
						}
					}
					if (!host.toString().isEmpty()) {
						hostName = host.toString();
					}
				}
			}
			String server = "https://apps.maxprograms.com/MXPWebSite/RegisterTrial";
			URL url = new URL(server + "?key=" + StringConverter.encodeString(cardList.toString()) + "&product="
					+ encodeURIcomponent("TMXEditor") + "&version=" + Constants.VERSION + "&user="
					+ encodeURIcomponent(System.getProperty("user.name")) + "&hostname=" + encodeURIcomponent(hostName)
					+ "&hd=" + StringConverter.encodeString(diskList.toString()) + "&firstName="
					+ StringConverter.encodeString(firstName) + "&lastName=" + StringConverter.encodeString(lastName)
					+ "&company=" + encodeURIcomponent(company) + "&email=" + encodeURIcomponent(email));
			HttpsURLConnection con = (HttpsURLConnection) url.openConnection();
			try (InputStream input = con.getInputStream()) {
				int available = input.available();
				byte[] array = new byte[available];
				int bytes = input.read(array);
				if (bytes != -1) {
					result = new String(array).trim();
				}
			}
			con.disconnect();
		} catch (Exception e) {
			return new String[] { Result.ERROR, "Error sendig request to server. Check your firewall or antivirus" };
		}
		if (result.equals("")) {
			return new String[] { Result.ERROR, "Error reading server reply. Check your firewall or antivirus" };
		}
		result = StringConverter.decodeString(result);
		if (result.startsWith("REPEATED")) {
			return new String[] { Result.ERROR,
					"Duplicated request. Contact sales@maxprograms.com and request a license" };
		}
		if (!result.startsWith("OK")) {
			return new String[] { Result.ERROR, "Trial registration failed" };
		}
		return new String[] { Result.SUCCESS };
	}

	@Override
	public String[] getTuData(String id) {
		Comparator<String[]> comparator = new Comparator<>() {

			@Override
			public int compare(String[] o1, String[] o2) {
				return o1[0].compareTo(o2[0]);
			}

		};
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
				Collections.sort(atts, comparator);

				List<String[]> props = new ArrayList<>();
				List<Element> pList = tu.getChildren("prop");
				Iterator<Element> pt = pList.iterator();
				while (pt.hasNext()) {
					Element prop = pt.next();
					props.add(new String[] { prop.getAttributeValue("type"), prop.getText() });
				}
				Collections.sort(props, comparator);

				List<String> notes = new ArrayList<>();
				List<Element> nList = tu.getChildren("note");
				Iterator<Element> nt = nList.iterator();
				while (nt.hasNext()) {
					notes.add(nt.next().getText());
				}

				TuProperties tp = new TuProperties(atts, props, notes);
				return new String[] {Result.SUCCESS, tp.toJSON().toString()};
			} 
			return new String[] {Result.ERROR, "Null element"};
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			return new String[] {Result.ERROR, e.getMessage()};
		}
	}

	@Override
	public String[] sendFeedback(String feedback) {
		try {
			LFile lfile = new LFile(new File(getPreferencesFolder(), Constants.LICENSE), "TMXEditor");
			String key = lfile.getKey();
			String user = lfile.getUser();

			String server = "https://apps.maxprograms.com/MXPWebSite/Feedback";

			URL url = new URL(server + "?license=" + StringConverter.encodeString(key) + "&product=" + "TMXEditor"
					+ "&version=" + Constants.VERSION + "&user=" + StringConverter.encodeString(user) + "&message="
					+ StringConverter.encodeString(feedback));
			HttpsURLConnection con = (HttpsURLConnection) url.openConnection();
			try (InputStream input = con.getInputStream()) {
				int available = input.available();
				byte[] array = new byte[available];
				int bytes = input.read(array);
				if (bytes != -1) {
					String result = new String(array).trim();
					LOGGER.log(Level.INFO, result);
					return new String[] { Result.SUCCESS };
				}
			}
			con.disconnect();
			return new String[] { Result.ERROR, "No reply received from server." };
		} catch (InvalidKeyException | NoSuchAlgorithmException | NoSuchPaddingException | IOException | SAXException
				| ParserConfigurationException e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public String[] delete(List<TUnit> selected) {
		try {
			store.delete(selected);
			return new String[] { Result.SUCCESS };
		} catch (Exception ex) {
			LOGGER.log(Level.SEVERE, ex.getMessage(), ex);
			return new String[] { Result.ERROR, ex.getMessage() };
		}
	}

	@Override
	public String[] replaceText(String search, String replace, Language language, boolean regExp) {
		processing = true;
		processingError = "";
		try {
			new Thread() {
				@Override
				public void run() {
					try {
						store.replaceText(search, replace, language, regExp);
					} catch (Exception e) {
						LOGGER.log(Level.SEVERE, e.getMessage(), e);
						processingError = e.getMessage();
					}
					processing = false;
				}
			}.start();
			return new String[] { Result.SUCCESS };
		} catch (Exception ex) {
			processing = false;
			LOGGER.log(Level.SEVERE, ex.getMessage(), ex);
			return new String[] { Result.ERROR, ex.getMessage() };
		}
	}

	@Override
	public String[] insertUnit() {
		try {
			String id = "tmx" + System.currentTimeMillis();
			store.insertUnit(id);
			return new String[] { Result.SUCCESS, id };
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public Result<Language> getAllLanguages() {
		Result<Language> result = new Result<>();
		try {
			result.setData(LangUtils.getAllLanguages());
			result.setResult(Result.SUCCESS);
		} catch (SAXException | IOException | ParserConfigurationException e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			result.setResult(Result.ERROR);
			result.setMessage(e.getMessage());
		}
		return result;
	}

	@Override
	public String[] removeUntranslated(Language lang) {
		processing = true;
		processingError = "";
		try {
			new Thread() {
				@Override
				public void run() {
					try {
						store.removeUntranslated(lang);
					} catch (Exception e) {
						LOGGER.log(Level.SEVERE, e.getMessage(), e);
						processingError = e.getMessage();
					}
					processing = false;
				}
			}.start();
			return new String[] { Result.SUCCESS };
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			processing = false;
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public String[] addLanguage(Language lang) {
		try {
			store.addLanguage(lang);
			return new String[] { Result.SUCCESS };
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public String[] removeLanguage(Language lang) {
		try {
			store.removeLanguage(lang);
			return new String[] { Result.SUCCESS };
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public String[] removeAlltags() {
		processing = true;
		processingError = "";
		try {
			new Thread() {
				@Override
				public void run() {
					try {
						store.removeAlltags();
					} catch (Exception e) {
						LOGGER.log(Level.SEVERE, e.getMessage(), e);
						processingError = e.getMessage();
					}
					processing = false;
				}
			}.start();
			return new String[] { Result.SUCCESS };
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			processing = false;
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public String[] changeLanguage(Language oldLanguage, Language newLanguage) {
		processing = true;
		processingError = "";
		try {
			new Thread() {
				@Override
				public void run() {
					try {
						store.changeLanguage(oldLanguage, newLanguage);
					} catch (Exception e) {
						LOGGER.log(Level.SEVERE, e.getMessage(), e);
						processingError = e.getMessage();
					}
					processing = false;
				}
			}.start();
			return new String[] { Result.SUCCESS };
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			processing = false;
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public String[] createFile(Language srcLang, Language tgtLang) {
		try {
			Document doc = new Document(null, "tmx", null, null);
			Element tmx = doc.getRootElement();
			tmx.setAttribute("version", "1.4");
			Element header = new Element("header");
			header.setAttribute("creationdate", TmxUtils.tmxDate());
			header.setAttribute("creationtool", "TMXEditor");
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
			tu.setAttribute("creationdate", TmxUtils.tmxDate());
			tu.setAttribute("creationtool", "TMXEditor");
			tu.setAttribute("creationtoolversion", Constants.VERSION);
			body.addContent(tu);
			Element tuv1 = new Element("tuv");
			tuv1.setAttribute("xml:lang", srcLang.getCode());
			Element seg1 = new Element("seg");
			seg1.setText(srcLang.getCode());
			tuv1.addContent(seg1);
			tu.addContent(tuv1);
			Element tuv2 = new Element("tuv");
			tuv2.setAttribute("xml:lang", tgtLang.getCode());
			Element seg2 = new Element("seg");
			seg2.setText(tgtLang.getCode());
			tuv2.addContent(seg2);
			tu.addContent(tuv2);

			File tempFile = File.createTempFile("temp", ".tmx");
			tempFile.deleteOnExit();
			try (FileOutputStream out = new FileOutputStream(tempFile)) {
				XMLOutputter outputter = new XMLOutputter();
				outputter.output(doc, out);
			}
			return new String[] { Result.SUCCESS, tempFile.getAbsolutePath() };
		} catch (Exception ex) {
			LOGGER.log(Level.SEVERE, ex.getMessage(), ex);
			return new String[] { Result.ERROR, ex.getMessage() };
		}
	}

	@Override
	public String[] disableLicense() {
		List<String> cards = null;
		try {
			cards = Nics.getCards();
		} catch (Exception e) {
			return new String[] { Result.ERROR, "Error generating registration key" };
		}
		if (cards.isEmpty()) {
			return new String[] { Result.ERROR, "Cannot register in this computer" };
		}
		StringBuilder cardList = new StringBuilder();
		Iterator<String> it = cards.iterator();
		while (it.hasNext()) {
			if (!cardList.toString().isEmpty()) {
				cardList.append('|');
			}
			cardList.append(it.next());
		}

		String result = "";
		try {
			String hostName = "unknown";
			try {
				hostName = InetAddress.getLocalHost().getHostName();
			} catch (java.net.UnknownHostException unk) {
				if (FILE_SEPARATOR.equals("/")) {
					Process p = Runtime.getRuntime().exec("hostname");
					String line;
					StringBuilder host = new StringBuilder();
					try (BufferedReader input = new BufferedReader(new InputStreamReader(p.getInputStream()))) {
						while ((line = input.readLine()) != null) {
							host.append(line.trim());
						}
					}
					if (!host.toString().isEmpty()) {
						hostName = host.toString();
					}
				}
			}
			LFile lfile = new LFile(new File(getPreferencesFolder(), Constants.LICENSE), "TMXEditor");
			String server = "https://apps.maxprograms.com/MXPWebSite/Disable";
			URL url = new URL(server + "?license=" + StringConverter.encodeString(lfile.getKey()) + "&key="
					+ StringConverter.encodeString(cardList.toString()) + "&product=TMXEditor" + "&version="
					+ Constants.VERSION + "&hostname=" + encodeURIcomponent(hostName) + "&user="
					+ encodeURIcomponent(System.getProperty("user.name")));
			HttpsURLConnection con = (HttpsURLConnection) url.openConnection();
			try (InputStream input = con.getInputStream()) {
				int available = input.available();
				byte[] array = new byte[available];
				int bytes = input.read(array);
				if (bytes != -1) {
					result = new String(array).trim();
				}
			}
			con.disconnect();
		} catch (Exception e) {
			return new String[] { Result.ERROR,
					"Error sending registration to server. Check your firewall or antivirus" };
		}
		if (result.equals("")) {
			return new String[] { Result.ERROR,
					"Error reading answer from license server. Check your firewall or antivirus" };
		}
		result = StringConverter.decodeString(result);
		try {
			LFile lfile = new LFile(new File(getPreferencesFolder(), Constants.LICENSE), "TMXEditor");
			lfile.disable();
		} catch (Exception e1) {
			return new String[] { Result.ERROR, "Error saving license information" };
		}
		return new String[] { Result.SUCCESS };
	}

	@Override
	public String[] removeDuplicates() {
		processing = true;
		processingError = "";
		try {
			new Thread() {
				@Override
				public void run() {
					try {
						store.removeDuplicates();
					} catch (Exception e) {
						LOGGER.log(Level.SEVERE, e.getMessage(), e);
						processingError = e.getMessage();
					}
					processing = false;
				}
			}.start();
			return new String[] { Result.SUCCESS };
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			processing = false;
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public String[] removeSpaces() {
		processing = true;
		processingError = "";
		try {
			new Thread() {
				@Override
				public void run() {
					try {
						store.removeSpaces();
					} catch (Exception e) {
						LOGGER.log(Level.SEVERE, e.getMessage(), e);
						processingError = e.getMessage();
					}
					processing = false;
				}
			}.start();
			return new String[] { Result.SUCCESS };
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			processing = false;
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public String[] consolidateUnits(Language lang) {
		processing = true;
		processingError = "";
		try {
			new Thread() {
				@Override
				public void run() {
					try {
						store.consolidateUnits(lang);
					} catch (Exception e) {
						LOGGER.log(Level.SEVERE, e.getMessage(), e);
						processingError = e.getMessage();
					}
					processing = false;
				}
			}.start();
			return new String[] { Result.SUCCESS };
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			processing = false;
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public String[] getLicenseData() {
		try {
			LFile lfile = new LFile(new File(getPreferencesFolder(), Constants.LICENSE), "TMXEditor");
			String user = lfile.getUser();
			String license = lfile.getKey();
			String days = "";
			if (license.matches(".*[A-F|0-9][A-F|0-9][A-F|0-9]-[A-F|0-9][A-F|0-9][A-F|0-9]?")) {
				days = "" + lfile.remainingDays();
			}
			return new String[] { Result.SUCCESS, user, days };
		} catch (InvalidKeyException | NoSuchAlgorithmException | NoSuchPaddingException | IOException | SAXException
				| ParserConfigurationException e) {
			return new String[] { Result.ERROR, "Error loading registration details" };
		}
	}

	@Override
	public String[] setAttributes(String id, String lang, List<String[]> attributes) {
		try {
			if (lang.isEmpty()) {
				store.setTuAttributes(id, attributes);
			} else {
				store.setTuvAttributes(id, lang, attributes);
			}
			return new String[] { Result.SUCCESS };
		} catch (Exception ex) {
			LOGGER.log(Level.SEVERE, ex.getMessage(), ex);
			return new String[] { Result.ERROR, ex.getMessage() };
		}
	}

	@Override
	public JSONObject getLoadingProgress() {
		JSONObject result = new JSONObject();
		if (store != null) {
			if (parsing) {
				result.put("status", Result.LOADING);
			} else {
				result.put("status", Result.COMPLETED);
			}
			result.put("count", store.getCount());
			if (!parsingError.isEmpty()) {
				result.put("status", Result.ERROR);
				result.put("reason", parsingError);
			}
		} else {
			result.put("status", Result.ERROR);
			result.put("reason", "Null store");
		}
		return result;
	}

	@Override
	public String[] getSavingProgress() {
		if (saving && store != null) {
			return new String[] { Result.SUCCESS, "Saved " + store.getSaved() + " units" };
		}
		if (!saving && store != null) {
			return new String[] { Result.COMPLETED };
		}
		if (!savingError.isEmpty()) {
			return new String[] { Result.ERROR, savingError };
		}
		return new String[] { Result.ERROR, "Null store and not saving" };
	}

	@Override
	public String[] checkFiles() {
		try {
			File folder = TmxUtils.getWorkFolder();
			File start = new File(folder, "start.txt");
			if (!start.exists()) {
				return new String[] { Result.SUCCESS, "" };
			}
			StringBuilder file = new StringBuilder();
			try (BufferedReader input = new BufferedReader(new FileReader(start))) {
				String line;
				while ((line = input.readLine()) != null) {
					file.append(line.trim());
				}
			}
			Files.delete(Paths.get(start.toURI()));
			return new String[] { Result.SUCCESS, file.toString() };
		} catch (IOException e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public String[] splitFile(String file, int parts) {
		File f = new File(file);
		if (!f.exists()) {
			return new String[] { Result.ERROR, "File does not exist" };
		}
		splitting = true;
		splitError = "";
		new Thread() {
			@Override
			public void run() {
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
					getIndentation();
					splitStore.setIndentation(indentation);
					countStore = null;
					reader = new TMXReader(splitStore);
					reader.parse(f);
					splitStore.close();
					splitStore = null;
				} catch (Exception ex) {
					if (ex.getMessage() != null) {
						splitError = ex.getMessage();
					} else {
						splitError = "Error splitting files";
					}
				}
				splitting = false;
			}
		}.start();
		return new String[] { Result.SUCCESS };
	}

	@Override
	public String[] getSplitProgress() {
		if (splitting && countStore != null) {
			return new String[] { Result.SUCCESS, countStore.getCount() + " units counted" };
		}
		if (splitting && splitStore != null) {
			return new String[] { Result.SUCCESS, splitStore.getCount() + " units written" };
		}
		if (splitError.isEmpty()) {
			return new String[] { Result.COMPLETED };
		}
		return new String[] { Result.ERROR, splitError };
	}

	@Override
	public String[] mergeFiles(String merged, List<String> files) {
		merging = true;
		mergeError = "";
		new Thread() {
			@Override
			public void run() {
				try {
					getIndentation();
					try (FileOutputStream out = new FileOutputStream(new File(merged))) {
						Element header = new Element("header");
						header.setAttribute("creationdate", TmxUtils.tmxDate());
						header.setAttribute("creationtool", "TMXEditor");
						header.setAttribute("creationtoolversion", Constants.VERSION);
						header.setAttribute("datatype", "xml");
						header.setAttribute("segtype", "block");
						header.setAttribute("adminlang", "en");
						header.setAttribute("o-tmf", "unknown");
						header.setAttribute("srclang", "*all*");
						out.write(("<?xml version=\"1.0\" ?>\r\n"
								+ "<!DOCTYPE tmx PUBLIC \"-//LISA OSCAR:1998//DTD for Translation Memory eXchange//EN\" \"tmx14.dtd\">\r\n"
								+ "<tmx version=\"1.4\">\n").getBytes(StandardCharsets.UTF_8));
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
					LOGGER.log(Level.SEVERE, e.getMessage(), e);
					if (e.getMessage() != null) {
						mergeError = e.getMessage();
					} else {
						mergeError = "Error merging files";
					}
				}
				merging = false;
			}
		}.start();
		return new String[] { Result.SUCCESS };
	}

	@Override
	public String[] getMergeProgress() {
		if (merging && mergeStore != null) {
			return new String[] { Result.SUCCESS, mergeStore.getCount() + " units merged" };
		}
		if (mergeError.isEmpty()) {
			return new String[] { Result.COMPLETED };
		}
		return new String[] { Result.ERROR, mergeError };
	}

	@Override
	public String[] setProperties(String id, String lang, List<String[]> dataList) {
		try {
			if (lang.isEmpty()) {
				store.setTuProperties(id, dataList);
			} else {
				store.setTuvProperties(id, lang, dataList);
			}
			return new String[] { Result.SUCCESS };
		} catch (Exception ex) {
			LOGGER.log(Level.SEVERE, ex.getMessage(), ex);
			return new String[] { Result.ERROR, ex.getMessage() };
		}
	}

	@Override
	public String[] setNotes(String id, String lang, List<String> notes) {
		try {
			if (lang.isEmpty()) {
				store.setTuNotes(id, notes);
			} else {
				store.setTuvNotes(id, lang, notes);
			}
			return new String[] { Result.SUCCESS };
		} catch (Exception ex) {
			LOGGER.log(Level.SEVERE, ex.getMessage(), ex);
			return new String[] { Result.ERROR, ex.getMessage() };
		}
	}

	@Override
	public String[] cleanCharacters(String file) {
		cleaning = true;
		cleaningError = "";
		new Thread() {
			@Override
			public void run() {
				try {
					TMXCleaner.clean(file);
				} catch (IOException e) {
					LOGGER.log(Level.SEVERE, e.getMessage(), e);
					cleaningError = e.getMessage();
				}
				cleaning = false;
			}
		}.start();
		return new String[] { Result.SUCCESS };
	}

	@Override
	public String[] cleaningProgress() {
		if (cleaning) {
			return new String[] { Result.SUCCESS, "Cleaning..." };
		}
		if (cleaningError.isEmpty()) {
			return new String[] { Result.COMPLETED };
		}
		return new String[] { Result.ERROR, cleaningError };
	}

	@Override
	public String[] setSrcLanguage(Language lang) {
		Element header = store.getHeader();
		header.setAttribute("srclang", lang.getCode());
		store.storeHeader(header);
		return new String[] { Result.SUCCESS };
	}

	@Override
	public Result<Language> getSrcLanguage() {
		Result<Language> result = new Result<>();
		List<Language> data = new ArrayList<>();
		result.setData(data);
		Element header = store.getHeader();
		String code = header.getAttributeValue("srclang");
		if ("*all*".equals(code)) {
			data.add(new Language(code, "Any Language"));
		} else {
			try {
				Language l = LangUtils.getLanguage(code);
				if (l != null) {
					data.add(l);
				} else {
					result.setResult(Result.ERROR);
					result.setMessage("Invalid source language: " + code);
					return result;
				}
			} catch (IOException e) {
				result.setResult(Result.ERROR);
				result.setMessage(e.getMessage());
				return result;
			}
		}
		result.setResult(Result.SUCCESS);
		return result;
	}

	@Override
	public String[] exportDelimited(String file) {
		exporting = true;
		exportingError = "";
		try {
			new Thread() {

				@Override
				public void run() {
					try {
						store.exportDelimited(file);
					} catch (Exception ex) {
						LOGGER.log(Level.SEVERE, ex.getMessage(), ex);
						exportingError = ex.getMessage();
					}
					exporting = false;
				}

			}.start();
			return new String[] { Result.SUCCESS };
		} catch (Exception ex) {
			LOGGER.log(Level.SEVERE, ex.getMessage(), ex);
			return new String[] { Result.ERROR, ex.getMessage() };
		}
	}

	@Override
	public String[] exportProgress() {
		if (exporting && store != null) {
			return new String[] { Result.SUCCESS, "Exported " + store.getExported() + " units" };
		}
		if (!exporting && store != null) {
			return new String[] { Result.COMPLETED };
		}
		if (!exportingError.isEmpty()) {
			return new String[] { Result.ERROR, exportingError };
		}
		return new String[] { Result.ERROR, "Null store and not exporting" };
	}

	@Override
	public String[] getTuvData(String id, String lang) {
		
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
				TuProperties tp = new TuProperties(atts, props, notes);
				return new String[]{Result.SUCCESS, tp.toJSON().toString()};
			}
			return new String[]{Result.ERROR, "null tuv"};
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			return new String[]{Result.ERROR, e.getMessage()};
		}
	}

	@Override
	public String[] validateFile(String file) {
		validating = true;
		validatingError = "";
		new Thread() {
			@Override
			public void run() {
				try {
					TMXValidator validator = new TMXValidator();
					validator.validate(new File(file));
					TMXCleaner.clean(file);
				} catch (IOException | SAXException | ParserConfigurationException e) {
					LOGGER.log(Level.SEVERE, e.getMessage(), e);
					validatingError = e.getMessage();
				}
				validating = false;
			}
		}.start();
		return new String[] { Result.SUCCESS };
	}

	@Override
	public String[] validatingProgress() {
		if (validating) {
			return new String[] { Result.SUCCESS, "Validating..." };
		}
		if (validatingError.isEmpty()) {
			return new String[] { Result.COMPLETED };
		}
		return new String[] { Result.ERROR, validatingError };
	}

	@Override
	public Result<String> getCharsets() {
		Result<String> result = new Result<>();
		TreeMap<String, Charset> charsets = new TreeMap<>(Charset.availableCharsets());
		Set<String> keys = charsets.keySet();
		List<String> codes = new ArrayList<>();
		Iterator<String> i = keys.iterator();
		while (i.hasNext()) {
			Charset cset = charsets.get(i.next());
			codes.add(cset.name());
		}
		result.setData(codes);
		result.setResult(Result.SUCCESS);
		return result;
	}

	@Override
	public String[] previewCsv(String csvFile, List<String> langs, String charSet, String columsSeparator,
			String textDelimiter) {
		List<String> lines = new ArrayList<>();
		ArrayList<String> languages = new ArrayList<>();
		if (langs != null) {
			languages.addAll(langs);
		}
		try (InputStreamReader input = new InputStreamReader(new FileInputStream(csvFile), charSet)) {
			try (BufferedReader buffer = new BufferedReader(input)) {
				String line = "";
				while ((line = buffer.readLine()) != null) {
					lines.add(line);
					if (lines.size() > 10) {
						break;
					}
				}
			}
		} catch (IOException ioe) {
			LOGGER.log(Level.SEVERE, "Error reading CSV", ioe);
			return new String[] { Result.ERROR, "Error reading CSV file" };
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
			LOGGER.log(Level.SEVERE, "Error reading CSV", uee);
			return new String[] { Result.ERROR, "Error reading CSV file" };
		}
		int cols = 0;

		StringBuilder builder = new StringBuilder();
		if (delimitersOk(lines, columsSeparator, textDelimiter)) {
			if (languages.isEmpty()) {
				String line = lines.get(0);
				String[] parts = TextUtils.split(line, columsSeparator);
				try {
					boolean hasLanguages = true;
					for (int i = 0; i < parts.length; i++) {
						String code = parts[i];
						if (!textDelimiter.isEmpty()) {
							code = code.substring(1);
							code = code.substring(0, code.length() - 1);
						}
						if (LangUtils.getLanguage(code) == null) {
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
				} catch (IOException ex) {
					LOGGER.log(Level.SEVERE, "Error checking CSV languages", ex);
					return new String[] { Result.ERROR, "Error checking CSV languages" };
				}
			}
			builder.append("<table style='border-collapse:collapse; margin:0px;'>");
			if (!languages.isEmpty()) {
				builder.append("<tr>");
				Iterator<String> it = languages.iterator();
				while (it.hasNext()) {
					builder.append(
							"<td style='border:1px solid #eeeeee; padding:1px; margin:0px; font-weight: bold; background: #80cbc4;'>");
					String cell = it.next();
					builder.append(TextUtils.cleanString(cell));
					builder.append("</td>");
				}
				builder.append("</tr>");
			}
			Iterator<String> it = lines.iterator();
			while (it.hasNext()) {
				String line = it.next();
				String[] parts = TextUtils.split(line, columsSeparator);
				cols = parts.length;
				builder.append("<tr>");
				for (int i = 0; i < parts.length; i++) {
					builder.append("<td style='border:1px solid #eeeeee; padding:1px; margin:0px;'>");
					String cell = parts[i];
					if (!textDelimiter.isEmpty()) {
						cell = cell.substring(1);
						cell = cell.substring(0, cell.length() - 1);
					}
					if (cell.length() > 25) {
						cell = cell.substring(0, 25) + "...";
					}
					builder.append(TextUtils.cleanString(cell));
					builder.append("</td>");
				}
				builder.append("</tr>");
			}
			builder.append("</table>");

		} else {
			builder.append("<pre>");
			for (int i = 0; i < lines.size(); i++) {
				builder.append(lines.get(i));
				builder.append('\n');
			}
			builder.append("</pre>");
		}
		return new String[] { Result.SUCCESS, builder.toString(), "" + cols, "" + languages.size(),
				langsList(languages) };
	}

	@Override
	public String[] convertCsv(String csvFile, String tmxFile, List<String> languages, String charSet,
			String columsSeparator, String textDelimiter) {
		try {
			TMXConverter.csv2tmx(csvFile, tmxFile, languages, charSet, columsSeparator, textDelimiter);
			return new String[] { Result.SUCCESS };
		} catch (IOException e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public String[] getIndentation() {
		File home = getPreferencesFolder();
		if (!home.exists()) {
			home.mkdirs();
		}
		File preferences = new File(home, "indentation.xml");
		SAXBuilder builder = new SAXBuilder();
		try {
			if (!preferences.exists()) {
				Document doc = builder.build(new ByteArrayInputStream(
						"<preferences><indentation>2</indentation></preferences>".getBytes(StandardCharsets.UTF_8)));
				XMLOutputter outputter = new XMLOutputter();
				try (FileOutputStream output = new FileOutputStream(preferences)) {
					outputter.output(doc, output);
				}
			}
			Document doc = builder.build(preferences);
			Element root = doc.getRootElement();
			String text = root.getChild("indentation").getText();
			indentation = Integer.valueOf(text);
			return new String[] { Result.SUCCESS, text };
		} catch (IOException | SAXException | ParserConfigurationException e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			return new String[] { Result.ERROR, e.getMessage() };
		}
	}

	@Override
	public String[] saveIndentation(int value) {
		File home = getPreferencesFolder();
		if (!home.exists()) {
			home.mkdirs();
		}
		File preferences = new File(home, "indentation.xml");
		SAXBuilder builder = new SAXBuilder();
		try {
			if (!preferences.exists()) {
				Document doc = builder.build(new ByteArrayInputStream(
						"<preferences><indentation/></preferences>".getBytes(StandardCharsets.UTF_8)));
				XMLOutputter outputter = new XMLOutputter();
				try (FileOutputStream output = new FileOutputStream(preferences)) {
					outputter.output(doc, output);
				}
			}
			Document doc = builder.build(preferences);
			Element root = doc.getRootElement();
			root.getChild("indentation").setText("" + value);
			Indenter.indent(root, 2);
			XMLOutputter outputter = new XMLOutputter();
			outputter.preserveSpace(true);
			try (FileOutputStream output = new FileOutputStream(preferences)) {
				outputter.output(doc, output);
			}
			indentation = value;
			if (store != null) {
				store.setIndentation(indentation);
			}
		} catch (IOException | SAXException | ParserConfigurationException e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
			return new String[] { Result.ERROR, e.getMessage() };
		}
		return new String[] { Result.SUCCESS };
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

	private static boolean delimitersOk(List<String> lines, String columsSeparator, String textDelimiter) {
		int columns = -1;
		Iterator<String> it = lines.iterator();
		boolean sameDelimiter = true;
		String delimiter = "";
		while (it.hasNext()) {
			String line = it.next();
			String[] parts = TextUtils.split(line, columsSeparator);
			if (!textDelimiter.isEmpty()) {
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

	private static String langsList(List<String> languages) {
		if (languages.isEmpty()) {
			return "";
		}
		StringBuilder builder = new StringBuilder();
		builder.append(languages.get(0));
		for (int i = 1; i < languages.size(); i++) {
			builder.append('|');
			builder.append(languages.get(i));
		}
		return builder.toString();
	}

	public Language getLanguage(String code) throws IOException {
		if (registry == null) {
			registry = new RegistryParser();
		}
		return new Language(code, registry.getTagDescription(code));
	}

}
