/*******************************************************************************
 * Copyright (c) 2018-2021 Maxprograms.
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

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.lang.System.Logger;
import java.lang.System.Logger.Level;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import javax.xml.parsers.ParserConfigurationException;

import com.maxprograms.tmxserver.Constants;
import com.maxprograms.tmxserver.excel.ExcelWriter;
import com.maxprograms.tmxserver.excel.Sheet;
import com.maxprograms.tmxserver.models.Language;
import com.maxprograms.tmxserver.models.TUnit;
import com.maxprograms.tmxserver.utils.TextUtils;
import com.maxprograms.xml.Attribute;
import com.maxprograms.xml.Document;
import com.maxprograms.xml.Element;
import com.maxprograms.xml.Indenter;
import com.maxprograms.xml.SAXBuilder;

import org.xml.sax.SAXException;

public class H2Store implements StoreInterface {

	private long time;
	private Element header;
	private Set<String> languages;
	private long discarded;
	private int saved;
	private Connection conn;
	private Map<String, PreparedStatement> insertStatements;
	private Map<String, PreparedStatement> selectStatements;
	private Map<String, PreparedStatement> updateStatements;
	private Map<String, PreparedStatement> deleteStatements;
	private PreparedStatement insertTu;
	private PreparedStatement updateTu;
	private PreparedStatement selectTus;
	private SAXBuilder builder;
	private FileOutputStream out;
	private File database;
	private PreparedStatement selectTu;
	private PreparedStatement deleteTu;
	private long processed;
	private boolean allowEmpty = false;
	private long exported;
	private Set<String> langSet;
	private PreparedStatement insertTunit;
	private Statement selectUnits;
	private PreparedStatement deleteUnit;
	private Statement stmt;
	private int indentation;
	private long lastUnit;

	public H2Store(Set<String> languageSet) throws SQLException, IOException {
		langSet = languageSet;
		time = System.currentTimeMillis();
		languages = new TreeSet<>();
		lastUnit = 1l;
		discarded = 0;
		builder = new SAXBuilder();

		insertStatements = new HashMap<>();
		selectStatements = new HashMap<>();
		updateStatements = new HashMap<>();
		deleteStatements = new HashMap<>();

		File workFolder = TmxUtils.getWorkFolder();
		database = new File(workFolder, "h2data");
		if (database.exists()) {
			TmxUtils.deleteFiles(database);
		}
		if (!database.exists()) {
			database.mkdirs();
		}

		String url = "jdbc:h2:" + database.getAbsolutePath() + "/db";
		conn = DriverManager.getConnection(url);
		conn.setAutoCommit(false);
		createTuTable();
	}

	private void createTuTable() throws SQLException {

		stmt = conn.createStatement();

		String query = "CREATE TABLE tu (tuid VARCHAR(30) NOT NULL, tu VARCHAR(6000) NOT NULL,  PRIMARY KEY(tuid) );";
		stmt.execute(query);

		query = "INSERT INTO tu (tuid, tu) VALUES (?, ?)";
		insertTu = conn.prepareStatement(query);
		selectTus = conn.prepareStatement("SELECT tuid, tu FROM tu");
		selectTu = conn.prepareStatement("SELECT tu FROM tu WHERE tuid=?");
		deleteTu = conn.prepareStatement("DELETE FROM tu WHERE tuid=?");
		updateTu = conn.prepareStatement("UPDATE tu SET tu=? WHERE tuid=?");

		StringBuilder sbuilder = new StringBuilder();
		sbuilder.append("CREATE TABLE tunits (tcount INTEGER NOT NULL, tuid VARCHAR(30) NOT NULL");
		Iterator<String> it = langSet.iterator();
		while (it.hasNext()) {
			String lang = it.next();
			sbuilder.append(", LANG_");
			sbuilder.append(lang.replace('-', '_'));
			sbuilder.append(" VARCHAR(6000) NOT NULL DEFAULT ''");
		}
		sbuilder.append(");");
		stmt.execute(sbuilder.toString());

		sbuilder = new StringBuilder();
		sbuilder.append("INSERT INTO tunits (tcount, tuid");
		it = langSet.iterator();
		while (it.hasNext()) {
			String lang = it.next();
			sbuilder.append(", LANG_");
			sbuilder.append(lang.replace('-', '_'));
		}
		sbuilder.append(") VALUES(?,?");
		for (int i = 0; i < langSet.size(); i++) {
			sbuilder.append(",?");
		}
		sbuilder.append(')');
		insertTunit = conn.prepareStatement(sbuilder.toString());
		selectUnits = conn.createStatement();
		deleteUnit = conn.prepareStatement("DELETE FROM tunits WHERE tuid=?");

	}

	@Override
	public void storeTU(Element element) throws IOException, SQLException {
		String tuid = "" + time++;
		List<Element> tuvs = element.getChildren("tuv");
		Iterator<Element> it = tuvs.iterator();
		int tuvCount = 0;
		Map<String, String> tunit = new HashMap<>();
		while (it.hasNext()) {
			Element tuv = it.next();
			String lang = tuv.getAttributeValue("xml:lang");
			if (lang.isEmpty()) {
				lang = tuv.getAttributeValue("lang");
			}
			if (lang.isEmpty()) {
				// ignore this one
				continue;
			}
			if (!languages.contains(lang)) {
				createTable(lang);
				languages.add(lang);
			}
			storeTuv(lang, tuid, tuv);
			tuvCount++;
			tunit.put(lang, TmxUtils.pureText(tuv.getChild("seg"), true, null, false, false));
		}
		if (tuvCount > 0 || allowEmpty) {
			element.removeChild("tuv");
			insertTu.setString(1, tuid);
			insertTu.setNString(2, element.toString());
			insertTu.execute();

			insertTunit.setLong(1, lastUnit);
			insertTunit.setString(2, tuid);
			Iterator<String> st = langSet.iterator();
			int pos = 3;
			while (st.hasNext()) {
				String lang = st.next();
				String value = tunit.get(lang);
				if (value == null) {
					value = "";
				}
				insertTunit.setNString(pos++, value);
			}
			insertTunit.execute();

			lastUnit++;
			if (lastUnit % 10000l == 0) {
				commit();
			}
		} else {
			discarded++;
		}
	}

	private void storeTuv(String lang, String tuid, Element tuv) throws SQLException {
		String oldTuv = getTuvString(tuid, lang);
		if (oldTuv.isEmpty()) {
			insertStatements.get(lang).setString(1, tuid);
			String text = tuv.toString();
			String pureText = TmxUtils.textOnly(tuv.getChild("seg"));
			if (text.length() < Integer.MAX_VALUE) {
				insertStatements.get(lang).setNString(2, text);
				insertStatements.get(lang).setNString(3, pureText);
			} else {
				// ignore
			}
			insertStatements.get(lang).execute();
		} else {
			String text = tuv.toString();
			String pureText = TmxUtils.textOnly(tuv.getChild("seg"));
			if (text.length() < Integer.MAX_VALUE) {
				updateStatements.get(lang).setNString(1, text);
				updateStatements.get(lang).setNString(2, pureText);
			} else {
				// ignore
			}
			updateStatements.get(lang).setString(3, tuid);
			updateStatements.get(lang).execute();
			updateUnit(tuid, lang, pureText);
		}
	}

	private void createTable(String lang) throws SQLException {
		String query = "CREATE TABLE LANG_" + lang.replace('-', '_')
				+ "_tuv ( tuid VARCHAR(30) NOT NULL, tuv VARCHAR(2147483647) NOT NULL, pureText VARCHAR(2147483647) NOT NULL, PRIMARY KEY(tuid) );";
		stmt.execute(query);
		conn.commit();

		query = "INSERT INTO LANG_" + lang.replace('-', '_') + "_tuv (tuid, tuv, pureText) VALUES (?, ?, ?)";
		insertStatements.put(lang, conn.prepareStatement(query));

		query = "SELECT tuv FROM LANG_" + lang.replace('-', '_') + "_tuv WHERE tuid=?";
		selectStatements.put(lang, conn.prepareStatement(query));

		query = "UPDATE LANG_" + lang.replace('-', '_') + "_tuv SET tuv=?, pureText=? WHERE tuid=?";
		updateStatements.put(lang, conn.prepareStatement(query));

		query = "DELETE FROM LANG_" + lang.replace('-', '_') + "_tuv  WHERE tuid=?";
		deleteStatements.put(lang, conn.prepareStatement(query));
	}

	@Override
	public void storeHeader(Element value) {
		header = value;
	}

	@Override
	public Element getHeader() {
		return header;
	}

	@Override
	public Set<String> getLanguages() {
		return languages;
	}

	@Override
	public List<TUnit> getUnits(long start, int count, String filterText, Language filterLanguage,
			boolean caseSensitive, boolean filterUntranslated, boolean regExp, Language filterSrcLanguage,
			Language sortLanguage, boolean ascending) throws IOException, SQLException {

		List<TUnit> result = new ArrayList<>();
		long number = start + 1l;
		processed = 0l;

		StringBuilder sbuilder = new StringBuilder();
		sbuilder.append("SELECT tcount, tuid");
		Iterator<String> lt = langSet.iterator();
		while (lt.hasNext()) {
			String lang = lt.next();
			sbuilder.append(", LANG_");
			sbuilder.append(lang.replace('-', '_'));
		}
		sbuilder.append(" FROM tunits");
		if (filterText != null && !filterText.isEmpty()) {
			sbuilder.append(" WHERE LANG_");
			sbuilder.append(filterLanguage.getCode().replace('-', '_'));
			if (regExp) {
				sbuilder.append(" REGEXP  '");
				sbuilder.append(filterText);
				sbuilder.append("'");
			} else {
				if (caseSensitive) {
					sbuilder.append(" LIKE '%");
				} else {
					sbuilder.append(" ILIKE '%");
				}
				sbuilder.append(filterText);
				sbuilder.append("%'");
			}
		}
		sbuilder.append(" ORDER BY ");
		if (sortLanguage == null) {
			sbuilder.append("tcount");
		} else {
			sbuilder.append(sortLanguage.getCode().replace('-', '_'));
		}
		if (!ascending) {
			sbuilder.append(" DESC");
		}
		sbuilder.append(" LIMIT ");
		sbuilder.append(count);
		sbuilder.append(" OFFSET ");
		sbuilder.append(start);

		try (ResultSet rs = selectUnits.executeQuery(sbuilder.toString())) {
			while (rs.next()) {
				String tuid = rs.getString(2);
				if (filterUntranslated && !isUntranslated(tuid, filterSrcLanguage.getCode())) {
					continue;
				}
				Map<String, String> map = new HashMap<>();
				Iterator<String> it = langSet.iterator();
				int i = 3;
				while (it.hasNext()) {
					String lang = it.next();
					String value = rs.getNString(i++);
					map.put(lang, value);
				}
				if (filterText != null && !filterText.isEmpty()) {
					String s = map.get(filterLanguage.getCode());
					if (regExp) {
						String highlighted = TmxUtils.highlightExpression(s, filterText);
						map.put(filterLanguage.getCode(), highlighted);
					} else {
						String highlighted = TmxUtils.highlight(s, filterText, caseSensitive);
						map.put(filterLanguage.getCode(), highlighted);
					}
				}
				TUnit unit = new TUnit(number++, tuid, map);
				result.add(unit);
				processed++;
			}
		}
		return result;
	}

	private boolean isUntranslated(String tuid, String code) throws SQLException {
		int count = 0;
		Iterator<String> it = languages.iterator();
		while (it.hasNext()) {
			String lang = it.next();
			if (!lang.equals(code)) {
				String tuvText = getTuvString(tuid, lang);
				if (!tuvText.isBlank()) {
					count++;
				}
			}
		}
		return count == 0;
	}

	private String getTuvString(String tuid, String lang) throws SQLException {
		String result = "";
		selectStatements.get(lang).setString(1, tuid);
		try (ResultSet rs = selectStatements.get(lang).executeQuery()) {
			while (rs.next()) {
				result = rs.getNString(1);
			}
		}
		return result;
	}

	@Override
	public void close() throws IOException, SQLException {
		Iterator<String> it = languages.iterator();
		while (it.hasNext()) {
			String langCode = it.next();
			insertStatements.get(langCode).close();
			selectStatements.get(langCode).close();
			updateStatements.get(langCode).close();
			deleteStatements.get(langCode).close();
		}
		insertStatements.clear();
		selectStatements.clear();
		updateStatements.clear();
		deleteStatements.clear();
		insertTu.close();
		updateTu.close();
		selectTu.close();
		selectTus.close();
		insertTunit.close();
		selectUnits.close();
		deleteUnit.close();
		stmt.close();
		conn.close();
		TmxUtils.deleteFiles(database);
	}

	@Override
	public long getCount() throws SQLException {
		long count = 0;
		try (ResultSet rs = stmt.executeQuery("SELECT COUNT(*) FROM tunits")) {
			while (rs.next()) {
				count = rs.getLong(1);
			}
		}
		return count;
	}

	@Override
	public String saveData(String id, String lang, String value)
			throws IOException, SQLException, SAXException, ParserConfigurationException {
		if (value.isEmpty()) {
			deleteTuv(id, lang);
			updateUnit(id, lang, value);
			return "";
		}
		Element tuv = null;
		String tuvText = getTuvString(id, lang);
		if (!tuvText.isEmpty()) {
			tuv = toElement(tuvText);
			Element seg = tuv.getChild("seg");
			Map<String, String> tags = TmxUtils.getTags();
			Set<String> keys = tags.keySet();
			Iterator<String> it = keys.iterator();
			while (it.hasNext()) {
				String key = it.next();
				value = TextUtils.replaceAll(value, key, tags.get(key), false);
			}
			try {
				Element e = toElement(("<seg>" + value + "</seg>"));
				seg.setContent(e.getContent());
			} catch (Exception ex) {
				seg.setText(value);
			}
		} else {
			tuv = new Element("tuv");
			tuv.setAttribute("xml:lang", lang);
			tuv.setAttribute("creationdate", TmxUtils.tmxDate());
			Element seg = new Element("seg");
			seg.setText(value);
			tuv.addContent(seg);
		}
		storeTuv(lang, id, tuv);
		String pure = TmxUtils.pureText(tuv.getChild("seg"), true, null, false, false);
		updateUnit(id, lang, pure);
		return pure;
	}

	private void updateUnit(String id, String lang, String value) throws SQLException {
		String query = "UPDATE tunits SET LANG_" + lang.replace('-', '_') + "=? WHERE tuid=?";
		try (PreparedStatement update = conn.prepareStatement(query)) {
			update.setNString(1, value);
			update.setString(2, id);
			update.execute();
		}
	}

	private void deleteTuv(String id, String lang) throws SQLException {
		deleteStatements.get(lang).setString(1, id);
		deleteStatements.get(lang).execute();
		updateUnit(id, lang, "");
	}

	private Element toElement(String string) throws SAXException, IOException, ParserConfigurationException {
		if (string == null || string.isBlank()) {
			return null;
		}
		Document d = builder.build(new ByteArrayInputStream(string.getBytes(StandardCharsets.UTF_8)));
		return d.getRootElement();
	}

	@Override
	public long getDiscarded() {
		return discarded;
	}

	@Override
	public void writeFile(File file) throws IOException, SQLException, SAXException, ParserConfigurationException {
		saved = 0;
		out = new FileOutputStream(file);
		writeString("<?xml version=\"1.0\" ?>\n"
				+ "<!DOCTYPE tmx PUBLIC \"-//LISA OSCAR:1998//DTD for Translation Memory eXchange//EN\" \"tmx14.dtd\">\n"
				+ "<tmx version=\"1.4\">\n");
		writeString(TextUtils.padding(1, indentation) + header.toString() + "\n");
		writeString(TextUtils.padding(1, indentation) + "<body>\n");

		String query = "SELECT tuid, tu FROM tu";
		try (ResultSet rs = stmt.executeQuery(query)) {
			while (rs.next()) {
				String tuid = rs.getString(1);
				String tuText = rs.getNString(2);
				Element tu = toElement(tuText);
				Iterator<String> langIt = languages.iterator();
				while (langIt.hasNext()) {
					String lang = langIt.next();
					String tuv = getTuvString(tuid, lang);
					if (!tuv.isEmpty()) {
						tu.addContent(toElement(tuv));
					}
				}
				if (tu.getChildren().isEmpty()) {
					continue;
				}
				Indenter.indent(tu, 3, indentation);
				writeString(TextUtils.padding(2, indentation) + tu.toString() + "\n");
				saved++;
			}
		}
		writeString(TextUtils.padding(1, indentation) + "</body>\n");
		writeString("</tmx>");
		out.close();
	}

	private void writeString(String string) throws IOException {
		out.write(string.getBytes(StandardCharsets.UTF_8));
	}

	@Override
	public int getSaved() {
		return saved;
	}

	@Override
	public void commit() throws IOException, SQLException {
		conn.commit();
	}

	@Override
	public Element getTu(String id) throws SQLException {
		String tu = null;
		selectTu.setString(1, id);
		try (ResultSet rs = selectTu.executeQuery()) {
			while (rs.next()) {
				tu = rs.getNString(1);
			}
		}
		if (tu != null) {
			try {
				Document d = builder.build(new ByteArrayInputStream(tu.getBytes(StandardCharsets.UTF_8)));
				return d.getRootElement();
			} catch (SAXException | IOException | ParserConfigurationException sax) {
				// ignore this
				Logger logger = System.getLogger(H2Store.class.getName());
				logger.log(Level.WARNING, "Broken TU " + tu);
			}
		}
		return null;
	}

	@Override
	public void delete(List<String> selected) throws SQLException {
		conn.setAutoCommit(false);
		Iterator<String> it = selected.iterator();
		while (it.hasNext()) {
			delete(it.next());
		}
		conn.commit();
	}

	private void delete(String tuid) throws SQLException {
		conn.setAutoCommit(false);
		Set<String> keyset = deleteStatements.keySet();
		Iterator<String> mit = keyset.iterator();
		while (mit.hasNext()) {
			String s = mit.next();
			deleteStatements.get(s).setString(1, tuid);
			deleteStatements.get(s).execute();
		}
		deleteTu.setString(1, tuid);
		deleteTu.execute();
		deleteUnit.setString(1, tuid);
		deleteUnit.execute();
		conn.commit();
	}

	@Override
	public void replaceText(String search, String replace, Language language, boolean regExp)
			throws SQLException, SAXException, IOException, ParserConfigurationException {
		processed = 0l;
		StringBuilder sb = new StringBuilder();
		sb.append("SELECT COUNT(tuid) FROM ");
		sb.append(language.getCode().replace('-', '_'));
		if (regExp) {
			sb.append("_tuv WHERE pureText REGEXP '");
		} else {
			sb.append("_tuv WHERE pureText LIKE '%");
		}
		sb.append(search);
		if (regExp) {
			sb.append("'");
		} else {
			sb.append("%'");
		}
		String query = sb.toString();
		long total = 0l;
		try (ResultSet rs = stmt.executeQuery(query)) {
			while (rs.next()) {
				total = rs.getLong(1);
			}
		}
		if (total == 0l) {
			return;
		}
		sb = new StringBuilder();
		sb.append("SELECT tuid, tuv FROM ");
		sb.append(language.getCode().replace('-', '_'));
		if (regExp) {
			sb.append("_tuv WHERE pureText REGEXP '");
		} else {
			sb.append("_tuv WHERE pureText LIKE '%");
		}
		sb.append(search);
		if (regExp) {
			sb.append("'");
		} else {
			sb.append("%'");
		}
		query = sb.toString();
		conn.setAutoCommit(false);
		long count = 0l;
		try (ResultSet rs = stmt.executeQuery(query)) {
			while (rs.next()) {
				String tuid = rs.getString(1);
				String tuvText = rs.getNString(2);
				Element tuv = toElement(tuvText);
				TmxUtils.replaceText(tuv.getChild("seg"), search, replace, regExp);
				storeTuv(language.getCode(), tuid, tuv);
				count++;
				processed = lastUnit * count / total;
			}
		}
		conn.commit();
	}

	@Override
	public long getProcessed() {
		return processed;
	}

	@Override
	public void insertUnit(String id) throws SQLException, IOException {
		conn.setAutoCommit(false);
		Element tu = new Element("tu");
		tu.setAttribute("tuid", id);
		tu.setAttribute("creationdate", TmxUtils.tmxDate());
		tu.setAttribute("creationid", System.getProperty("user.name"));
		tu.setAttribute("creationtool", Constants.APPNAME);
		tu.setAttribute("creationtoolversion", Constants.VERSION);
		allowEmpty = true;
		storeTU(tu);
		allowEmpty = false;
		conn.commit();
		lastUnit++;
	}

	@Override
	public long removeUntranslated(Language language) throws IOException, SQLException {
		processed = 0l;
		List<String> selected = new ArrayList<>();
		String srclang = language.getCode();
		String query = "SELECT tuid, tu FROM tu";
		try (ResultSet rs = stmt.executeQuery(query)) {
			while (rs.next()) {
				processed++;
				String tuid = rs.getString(1);
				boolean matches = isUntranslated(tuid, srclang);
				if (matches) {
					selected.add(tuid);
				}
			}
		}
		long result = selected.size();
		Iterator<String> it = selected.iterator();
		conn.setAutoCommit(false);
		while (it.hasNext()) {
			delete(it.next());
		}
		conn.commit();
		return result;
	}

	@Override
	public void removeSameAsSource(Language language)
			throws SQLException, SAXException, IOException, ParserConfigurationException {
		processed = 0l;
		List<String> selected = new ArrayList<>();
		String srclang = language.getCode();
		String query = "SELECT tuid, tu FROM tu";
		try (ResultSet rs = stmt.executeQuery(query)) {
			while (rs.next()) {
				String tuid = rs.getString(1);
				String tuv = getTuvString(tuid, srclang);
				if (!tuv.isEmpty()) {
					Element srcTuv = toElement(tuv);
					Element src = srcTuv.getChild("seg");
					Iterator<String> langIt = languages.iterator();
					int count = 0;
					while (langIt.hasNext()) {
						String lang = langIt.next();
						if (!lang.equals(srclang)) {
							tuv = getTuvString(tuid, lang);
							if (!tuv.isEmpty()) {
								Element tgt = toElement(tuv).getChild("seg");
								if (src.equals(tgt)) {
									deleteTuv(tuid, lang);
								} else {
									count++;
								}
							}
						}
					}
					if (count == 0) {
						selected.add(tuid);
					}
				}
				processed++;
			}
		}
		Iterator<String> it = selected.iterator();
		while (it.hasNext()) {
			delete(it.next());
		}
		selected.clear();
	}

	@Override
	public void addLanguage(Language language) throws IOException, SQLException {
		String lang = language.getCode();
		if (!languages.contains(lang)) {
			createTable(lang);
			languages.add(lang);
			langSet.add(lang);
			Iterator<String> it = langSet.iterator();
			String last = "tuid";
			while (it.hasNext()) {
				String s = it.next();
				if (!s.equals(lang)) {
					last = s;
				} else {
					break;
				}
			}
			StringBuilder sbuilder = new StringBuilder();
			sbuilder.append("ALTER TABLE tunits ADD COLUMN LANG_");
			sbuilder.append(lang.replace('-', '_'));
			sbuilder.append(" VARCHAR(6000) NOT NULL DEFAULT '' AFTER ");
			sbuilder.append(last.replace('-', '_'));
			sbuilder.append(';');
			stmt.execute(sbuilder.toString());
		}
	}

	@Override
	public void removeLanguage(Language language) throws IOException, SQLException {
		String lang = language.getCode();
		if (languages.contains(lang)) {
			deleteTable(lang);
			languages.remove(lang);
			langSet.remove(lang);
			StringBuilder sbuilder = new StringBuilder();
			sbuilder.append("ALTER TABLE tunits DROP COLUMN LANG_");
			sbuilder.append(lang.replace('-', '_'));
			sbuilder.append(';');
			stmt.execute(sbuilder.toString());
		}
	}

	private void deleteTable(String lang) throws SQLException {
		String query = "DROP TABLE LANG_" + lang.replace('-', '_') + "_tuv;";
		stmt.execute(query);

		insertStatements.get(lang).close();
		insertStatements.remove(lang);

		selectStatements.get(lang).close();
		selectStatements.remove(lang);

		updateStatements.get(lang).close();
		updateStatements.remove(lang);

		deleteStatements.get(lang).close();
		deleteStatements.remove(lang);
	}

	@Override
	public void removeTags() throws SQLException, SAXException, IOException, ParserConfigurationException {
		processed = 0l;
		String query = "SELECT tuid, tu FROM tu";
		try (ResultSet rs = stmt.executeQuery(query)) {
			while (rs.next()) {
				String tuid = rs.getString(1);
				Iterator<String> it = languages.iterator();
				while (it.hasNext()) {
					String lang = it.next();
					String tuvText = getTuvString(tuid, lang);
					if (!tuvText.isEmpty()) {
						Element tuv = toElement(tuvText);
						Element seg = tuv.getChild("seg");
						if (!seg.getChildren().isEmpty()) {
							seg.setText(TmxUtils.textOnly(seg));
							storeTuv(lang, tuid, tuv);
						}
					}
				}
				processed++;
			}
		}
	}

	@Override
	public void changeLanguage(Language oldLanguage, Language newLanguage)
			throws IOException, SQLException, SAXException, ParserConfigurationException {
		String newCode = newLanguage.getCode();
		String oldCode = oldLanguage.getCode();
		createTable(newCode);
		conn.setAutoCommit(false);
		processed = 0l;
		String query = "SELECT tuid FROM " + oldCode.replace('-', '_') + "_tuv";
		try (ResultSet rs = stmt.executeQuery(query)) {
			while (rs.next()) {
				String tuid = rs.getString(1);
				String tuvString = getTuvString(tuid, oldCode);
				if (tuvString != null && !tuvString.isEmpty()) {
					Element tuv = toElement(tuvString);
					tuv.setAttribute("xml:lang", newCode);
					storeTuv(newCode, tuid, tuv);
				}
				processed++;
				if (processed % 10000 == 0) {
					conn.commit();
				}
			}
		}
		conn.commit();
		deleteTable(oldCode);
		languages.add(newCode);
		languages.remove(oldCode);
	}

	@Override
	public void removeDuplicates() throws SQLException, SAXException, IOException, ParserConfigurationException {
		processed = 0l;

		List<String> langs = new ArrayList<>();
		Iterator<String> it = languages.iterator();
		while (it.hasNext()) {
			langs.add(it.next());
		}
		for (int i = 0; i < langs.size() - 1; i++) {
			String srcLang = langs.get(i);
			Set<String> deleteLater = new TreeSet<>();
			String query = "SELECT pureText, tuid FROM LANG_" + srcLang.replace('-', '_') + "_tuv ORDER BY pureText";
			try (ResultSet rs = stmt.executeQuery(query)) {
				String pureA = null;
				String idA = null;
				while (rs.next()) {
					if (pureA == null) {
						pureA = rs.getNString(1);
						idA = rs.getString(2);
						continue;
					}
					String idB = rs.getString(2);
					if (deleteLater.contains(idB)) {
						continue;
					}
					String pureB = rs.getNString(1);
					if (!pureA.equals(pureB)) {
						pureA = pureB;
						idA = idB;
						continue;
					}
					if (isDuplicate(idA, idB)) {
						deleteLater.add(idB);
					}
					processed++;
				}
			}
			Iterator<String> dt = deleteLater.iterator();
			while (dt.hasNext()) {
				delete(dt.next());
			}
		}
	}

	private boolean isDuplicate(String idA, String idB)
			throws SQLException, SAXException, IOException, ParserConfigurationException {
		Iterator<String> it = languages.iterator();
		while (it.hasNext()) {
			String lang = it.next();
			String a = getTuvString(idA, lang);
			String b = getTuvString(idB, lang);
			if (a.isEmpty() && !b.isEmpty()) {
				return false;
			}
			if (!a.isEmpty() && b.isEmpty()) {
				return false;
			}
			if (a.isEmpty() && b.isEmpty()) {
				continue;
			}
			Element segA = toElement(a).getChild("seg");
			Element segB = toElement(b).getChild("seg");
			if (!segA.equals(segB)) {
				return false;
			}
		}
		return true;
	}

	@Override
	public void removeSpaces() throws SAXException, IOException, ParserConfigurationException, SQLException {
		processed = 0l;
		String query = "SELECT tuid FROM tu";
		try (ResultSet rs = stmt.executeQuery(query)) {
			while (rs.next()) {
				String id = rs.getString(1);
				Iterator<String> it = languages.iterator();
				while (it.hasNext()) {
					String lang = it.next();
					String tuvText = getTuvString(id, lang);
					if (tuvText.isEmpty()) {
						continue;
					}
					Element tuv = toElement(tuvText);
					if (tuv != null) {
						Element seg = tuv.getChild("seg");
						String text = TmxUtils.textOnly(seg);
						if (text.isBlank()) {
							deleteTuv(id, lang);
							continue;
						}
						if (seg != null) {
							seg.setContent(TmxUtils.stripSegment(seg).getContent());
							if (!seg.getText().isEmpty()) {
								storeTuv(lang, id, tuv);
							} else {
								deleteTuv(id, lang);
							}
						}
					}
				}
				processed++;
			}
		}
	}

	@Override
	public void consolidateUnits(Language language)
			throws IOException, SQLException, SAXException, ParserConfigurationException {
		processed = 0l;
		String srcLang = language.getCode();
		List<Pair> pairs = new ArrayList<>();
		String query = "SELECT tuid, tuv FROM LANG_" + srcLang.replace('-', '_') + "_tuv";
		try (ResultSet rs = stmt.executeQuery(query)) {
			while (rs.next()) {
				String id = rs.getString(1);
				String tuvText = "";
				tuvText = rs.getNString(2);
				if (tuvText.isEmpty()) {
					continue;
				}
				String text = makeText(tuvText);
				if (!text.isEmpty()) {
					Pair p = new Pair(id, text);
					pairs.add(p);
				}
			}
		}
		Collections.sort(pairs);
		conn.setAutoCommit(false);
		int i = 0;
		while (i < pairs.size() - 1) {
			Pair currentPair = pairs.get(i);
			Element currentSeg = toElement(getTuvString(currentPair.getId(), srcLang)).getChild("seg");
			int j = 1;
			Pair nextPair = pairs.get(i + j);
			while (currentPair.getText().equals(nextPair.getText())) {
				Element nextSeg = toElement(getTuvString(nextPair.getId(), srcLang)).getChild("seg");
				if (currentSeg.equals(nextSeg)) {
					Iterator<String> lt = languages.iterator();
					while (lt.hasNext()) {
						String lang = lt.next();
						if (lang.equals(srcLang)) {
							continue;
						}
						Element a = toElement(getTuvString(currentPair.getId(), lang));
						Element b = toElement(getTuvString(nextPair.getId(), lang));
						if (a == null && b != null) {
							storeTuv(lang, currentPair.getId(), b);
							String pure = TmxUtils.pureText(b.getChild("seg"), true, null, false, false);
							updateUnit(currentPair.getId(), lang, pure);
							deleteTuv(nextPair.getId(), lang);
							conn.commit();
						}
					}
				}
				j++;
				if (i + j >= pairs.size()) {
					break;
				}
				nextPair = pairs.get(i + j);
			}
			i = i + j;
			processed++;
		}
		removeUntranslated(language);
	}

	private static String makeText(String tuvText) {
		if (tuvText.indexOf("<seg/>") != -1) {
			return "";
		}
		tuvText = tuvText.substring(tuvText.indexOf("<seg>") + "<seg>".length());
		tuvText = tuvText.substring(0, tuvText.indexOf("</seg>"));
		return tuvText;
	}

	@Override
	public void setTuAttributes(String id, List<String[]> attributes)
			throws SAXException, IOException, ParserConfigurationException, SQLException {
		List<Attribute> atts = new ArrayList<>();
		Iterator<String[]> it = attributes.iterator();
		while (it.hasNext()) {
			String[] pair = it.next();
			atts.add(new Attribute(pair[0], pair[1]));
		}
		String tuText = "";
		selectTu.setString(1, id);
		try (ResultSet rs = selectTu.executeQuery()) {
			while (rs.next()) {
				tuText = rs.getNString(1);
			}
		}
		if (!tuText.isEmpty()) {
			Element tu = toElement(tuText);
			tu.setAttributes(atts);
			updateTu.setString(2, id);
			updateTu.setNString(1, tu.toString());
			updateTu.execute();
		}
	}

	@Override
	public void setTuProperties(String id, List<String[]> properties)
			throws SQLException, SAXException, IOException, ParserConfigurationException {
		List<Element> content = new ArrayList<>();
		Iterator<String[]> it = properties.iterator();
		while (it.hasNext()) {
			String[] pair = it.next();
			if (pair[0].isEmpty() || pair[1].isEmpty()) {
				continue;
			}
			Element prop = new Element("prop");
			prop.setAttribute("type", pair[0]);
			prop.setText(pair[1]);
			content.add(prop);
		}
		String tuText = "";
		selectTu.setString(1, id);
		try (ResultSet rs = selectTu.executeQuery()) {
			while (rs.next()) {
				tuText = rs.getNString(1);
			}
		}
		if (!tuText.isEmpty()) {
			Element tu = toElement(tuText);
			content.addAll(tu.getChildren("note"));
			tu.setChildren(content);
			updateTu.setString(2, id);
			updateTu.setNString(1, tu.toString());
			updateTu.execute();
		}
	}

	@Override
	public void setTuNotes(String id, List<String> notes)
			throws SQLException, SAXException, IOException, ParserConfigurationException {
		List<Element> content = new ArrayList<>();
		Iterator<String> it = notes.iterator();
		while (it.hasNext()) {
			String note = it.next();
			if (note.isEmpty()) {
				continue;
			}
			Element n = new Element("note");
			n.setText(note);
			content.add(n);
		}
		String tuText = "";
		selectTu.setString(1, id);
		try (ResultSet rs = selectTu.executeQuery()) {
			while (rs.next()) {
				tuText = rs.getNString(1);
			}
		}
		if (!tuText.isEmpty()) {
			Element tu = toElement(tuText);
			content.addAll(tu.getChildren("prop"));
			tu.setChildren(content);
			updateTu.setString(2, id);
			updateTu.setNString(1, tu.toString());
			updateTu.execute();
		}
	}

	@Override
	public void exportDelimited(String file)
			throws IOException, SQLException, SAXException, ParserConfigurationException {
		exported = 0l;
		try (FileOutputStream stream = new FileOutputStream(file)) {
			try (OutputStreamWriter cout = new OutputStreamWriter(stream, StandardCharsets.UTF_16LE)) {
				byte[] feff = { -1, -2 };
				stream.write(feff);

				StringBuilder langs = new StringBuilder();
				Iterator<String> it = languages.iterator();
				while (it.hasNext()) {
					if (!langs.toString().isEmpty()) {
						langs.append('\t');
					}
					langs.append(it.next());
				}
				langs.append('\n');
				cout.write(langs.toString());

				exported = 0;

				String query = "SELECT tuid FROM tu";
				try (ResultSet rs = stmt.executeQuery(query)) {
					while (rs.next()) {
						StringBuilder line = new StringBuilder();
						String tuid = rs.getString(1);
						Iterator<String> langIt = languages.iterator();
						while (langIt.hasNext()) {
							String lang = langIt.next();
							String tuv = getTuvString(tuid, lang);
							String text = " ";
							if (!tuv.isEmpty()) {
								Element e = toElement(tuv);
								text = TmxUtils.cleanLines(TmxUtils.textOnly(e.getChild("seg")));
							}
							if (!line.toString().isEmpty()) {
								line.append('\t');
							}
							line.append(text);
						}
						line.append('\n');
						cout.write(line.toString());
						exported++;
					}
				}
			}
		}
	}

	@Override
	public void exportExcel(String file) throws SQLException, SAXException, IOException, ParserConfigurationException {
		exported = 0l;
		Map<String, String> langsMap = new HashMap<>();
		Set<String> cols = new TreeSet<>();
		int i = 0;
		Iterator<String> it = languages.iterator();
		while (it.hasNext()) {
			String lang = it.next();
			char c = (char) (65 + i++);
			cols.add("" + c);
			langsMap.put(lang, "" + c);
		}

		List<Map<String, String>> rows = new ArrayList<>();
		Map<String, String> firstRow = new HashMap<>();
		Iterator<String> langIt = languages.iterator();
		while (langIt.hasNext()) {
			String lang = langIt.next();
			firstRow.put(langsMap.get(lang), lang);
		}
		rows.add(firstRow);
		String query = "SELECT tuid FROM tu";
		try (ResultSet rs = stmt.executeQuery(query)) {
			while (rs.next()) {
				String tuid = rs.getString(1);
				Map<String, String> rowMap = new HashMap<>();
				langIt = languages.iterator();
				while (langIt.hasNext()) {
					String lang = langIt.next();
					String tuvText = getTuvString(tuid, lang);
					Element tuv = null;
					if (!tuvText.isEmpty()) {
						tuv = toElement(tuvText);
					}
					String text = "";
					if (tuv != null) {
						text = TmxUtils.textOnly(tuv.getChild("seg"));
					}
					rowMap.put(langsMap.get(lang), text);
				}
				rows.add(rowMap);
				exported++;
			}
		}
		Sheet sheet = new Sheet("Sheet1", cols, rows);
		ExcelWriter writer = new ExcelWriter();
		writer.writeFile(file, sheet);
	}

	@Override
	public long getExported() {
		return exported;
	}

	@Override
	public Element getTuv(String id, String lang)
			throws SQLException, SAXException, IOException, ParserConfigurationException {
		String tuvText = getTuvString(id, lang);
		if (!tuvText.isEmpty()) {
			return toElement(tuvText);
		}
		return null;
	}

	@Override
	public void setTuvAttributes(String id, String lang, List<String[]> attributes)
			throws SQLException, SAXException, IOException, ParserConfigurationException {
		String tuvText = getTuvString(id, lang);
		if (!tuvText.isEmpty()) {
			Element tuv = toElement(tuvText);
			List<Attribute> atts = new ArrayList<>();
			Iterator<String[]> it = attributes.iterator();
			while (it.hasNext()) {
				String[] pair = it.next();
				atts.add(new Attribute(pair[0], pair[1]));
			}
			tuv.setAttributes(atts);
			storeTuv(lang, id, tuv);
		}
	}

	@Override
	public void setTuvProperties(String id, String lang, List<String[]> properties)
			throws SQLException, SAXException, IOException, ParserConfigurationException {
		String tuvText = getTuvString(id, lang);
		if (!tuvText.isEmpty()) {
			Element tuv = toElement(tuvText);
			tuv.removeChild("prop");
			List<Element> content = tuv.getChildren();
			Iterator<String[]> it = properties.iterator();
			while (it.hasNext()) {
				String[] pair = it.next();
				if (pair[0].isEmpty() || pair[1].isEmpty()) {
					continue;
				}
				Element prop = new Element("prop");
				prop.setAttribute("type", pair[0]);
				prop.setText(pair[1]);
				content.add(0, prop);
			}
			tuv.setChildren(content);
			storeTuv(lang, id, tuv);
		}
	}

	@Override
	public void setTuvNotes(String id, String lang, List<String> notes)
			throws SQLException, SAXException, IOException, ParserConfigurationException {
		String tuvText = getTuvString(id, lang);
		if (!tuvText.isEmpty()) {
			Element tuv = toElement(tuvText);
			tuv.removeChild("note");
			List<Element> content = tuv.getChildren();
			Iterator<String> it = notes.iterator();
			while (it.hasNext()) {
				String note = it.next();
				if (note.isEmpty()) {
					continue;
				}
				Element not = new Element("note");
				not.setText(note);
				content.add(0, not);
			}
			tuv.setChildren(content);
			storeTuv(lang, id, tuv);
		}
	}

	@Override
	public void setIndentation(int indentation) {
		this.indentation = indentation;
	}
}
