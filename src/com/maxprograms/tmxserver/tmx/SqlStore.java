/*******************************************************************************
 * Copyright (c) 2018-2024 Maxprograms.
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
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Vector;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;

import javax.xml.parsers.ParserConfigurationException;

import org.sqlite.Function;
import org.xml.sax.SAXException;

import com.maxprograms.languages.Language;
import com.maxprograms.languages.LanguageUtils;
import com.maxprograms.tmxserver.Constants;
import com.maxprograms.tmxserver.excel.ExcelWriter;
import com.maxprograms.tmxserver.excel.Sheet;
import com.maxprograms.tmxserver.models.TUnit;
import com.maxprograms.tmxserver.utils.TextUtils;
import com.maxprograms.xml.Document;
import com.maxprograms.xml.Element;
import com.maxprograms.xml.Indenter;
import com.maxprograms.xml.SAXBuilder;

public class SqlStore implements StoreInterface {

    private Connection conn;
    private Element header;
    private Set<String> languages;
    private long time;
    private long position;
    private long discarded;
    private long processed;
    private long saved;
    private long exported;
    private int indentation;
    private PreparedStatement insertTU;
    private PreparedStatement selectTU;
    private PreparedStatement selectTUS;
    private SAXBuilder builder;

    public SqlStore(Set<String> langSet) throws IOException, SQLException {
        File workFolder = TmxUtils.getWorkFolder();
        File database = new File(workFolder, "sqlite");
        if (database.exists()) {
            TmxUtils.deleteFiles(database);
        }
        Files.createDirectories(database.toPath());
        File sqlite = new File(database, "tmxeditor.db");
        Files.deleteIfExists(sqlite.toPath());

        builder = new SAXBuilder();
        languages = new TreeSet<>();
        languages.addAll(langSet);
        time = System.currentTimeMillis();
        position = 0l;
        processed = 0l;
        discarded = 0l;

        DriverManager.registerDriver(new org.sqlite.JDBC());
        conn = DriverManager.getConnection("jdbc:sqlite:" + sqlite.getAbsolutePath().replace('\\', '/'));
        conn.setAutoCommit(false);
        Function.create(conn, "REGEXP", new Function() {
            @Override
            protected void xFunc() throws SQLException {
                String expression = value_text(0);
                String value = value_text(1);
                if (value == null)
                    value = "";

                Pattern pattern = Pattern.compile(expression);
                result(pattern.matcher(value).find() ? 1 : 0);
            }
        });
        createTables();
    }

    private void createTables() throws SQLException {
        String tu = """
                CREATE TABLE tu (
                    id TEXT NOT NULL,
                    tu TEXT NOT NULL,
                    position INTEGER NOT NULL,
                    PRIMARY KEY(id)
                    );""";

        StringBuilder sb = new StringBuilder();
        sb.append("CREATE TABLE tuv (id TEXT NOT NULL, ");
        Iterator<String> it = languages.iterator();
        while (it.hasNext()) {
            String lang = it.next().toLowerCase().replace("-", "_");
            sb.append(lang);
            sb.append("_pure TEXT, ");
            sb.append(lang);
            sb.append("_tuv TEXT, ");
        }
        sb.append("PRIMARY KEY(id));");
        try (Statement create = conn.createStatement()) {
            create.execute(tu);
            create.execute(sb.toString());
        }
        insertTU = conn.prepareStatement("INSERT INTO tu (id, tu, position) VALUES (?, ?, ?)");
        selectTU = conn.prepareStatement("SELECT tu FROM tu WHERE id = ?");
        selectTUS = conn.prepareStatement("SELECT id, position FROM tu WHERE position >= ? ORDER BY position");
        conn.commit();
    }

    @Override
    public void storeTU(Element tu) throws IOException, SQLException {
        String id = tu.hasAttribute("tuid") ? tu.getAttributeValue("tuid") : "" + time++;
        List<Element> tuvs = tu.getChildren("tuv");
        Iterator<Element> it = tuvs.iterator();
        int tuvCount = 0;
        while (it.hasNext()) {
            Element tuv = it.next();
            String lang = tuv.getAttributeValue("xml:lang", "");
            if (lang.isEmpty()) {
                lang = tuv.getAttributeValue("lang", "");
                if (!lang.isEmpty()) {
                    tuv.setAttribute("xml:lang", lang);
                    tuv.removeAttribute("lang");
                }
            }
            if (lang.isEmpty()) {
                // ignore this one
                continue;
            }
            lang = LanguageUtils.normalizeCode(lang);
            if (!languages.contains(lang)) {
                languages.add(lang);
            }
            if (tuvCount == 0) {
                storeTUV(id, lang, tuv);
            } else {
                updateTUV(id, lang, tuv);
            }
            tuvCount++;
        }
        if (tuvCount > 0) {
            tu.removeChild("tuv");
            insertTU.setString(1, id);
            insertTU.setString(2, tu.toString());
            insertTU.setLong(3, position++);
            insertTU.executeUpdate();
        } else {
            discarded++;
        }
        processed++;
    }

    private void storeTUV(String id, String lang, Element tuv) throws SQLException {
        String lower = lang.toLowerCase().replace("-", "_");
        try (PreparedStatement insertTUV = conn.prepareStatement("INSERT INTO tuv (id, " + lower + "_pure, " + lower
                + "_tuv) VALUES (?, ?, ?)")) {
            insertTUV.setString(1, id);
            insertTUV.setString(2, TmxUtils.textOnly(tuv.getChild("seg")));
            insertTUV.setString(3, tuv.toString());
            insertTUV.executeUpdate();
        }
    }

    private void updateTUV(String id, String lang, Element tuv) throws SQLException {
        String lower = lang.toLowerCase().replace("-", "_");
        try (PreparedStatement updateTUV = conn.prepareStatement("UPDATE tuv SET " + lower + "_pure=?, " + lower
                + "_tuv=? WHERE id=?")) {
            updateTUV.setString(1, TmxUtils.textOnly(tuv.getChild("seg")));
            updateTUV.setString(2, tuv.toString());
            updateTUV.setString(3, id);
            updateTUV.executeUpdate();
        }
    }

    @Override
    public void storeHeader(Element header) {
        this.header = header;
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
            Language sortLanguage, boolean ascending)
            throws IOException, SQLException, SAXException, ParserConfigurationException {

        String sortOption = "position";
        if (sortLanguage != null) {
            String lower = sortLanguage.getCode().toLowerCase().replace("-", "_");
            sortOption = lower + "_pure " + (ascending ? "ASC" : "DESC") + ", position";
        }
        String limit = "";
        if (filterUntranslated || caseSensitive) {
            limit = " LIMIT -1 OFFSET " + start;
        } else {
            limit = " LIMIT " + count + " OFFSET " + start;
        }
        String where = "";
        if (filterText != null && !filterText.isEmpty()) {
            String lower = filterLanguage.getCode().toLowerCase().replace("-", "_");
            if (regExp) {
                where = " WHERE " + lower + "_pure REGEXP '" + filterText + "'";
            } else {
                where = " WHERE " + lower + "_pure LIKE '%" + filterText.replace("'", "''") + "%'";
            }
        }
        String sql = "SELECT tu.id, tu.position, tuv.* FROM tuv JOIN tu on tu.id = tuv.id" + where + " ORDER BY "
                + sortOption
                + limit;
        processed = 0l;
        List<TUnit> result = new Vector<>();
        try (Statement stmt = conn.createStatement()) {
            try (ResultSet rs = stmt.executeQuery(sql)) {
                while (rs.next()) {
                    if (filterUntranslated) {
                        boolean translated = false;
                        Iterator<String> it = languages.iterator();
                        while (it.hasNext()) {
                            String lang = it.next();
                            if (!lang.equals(filterSrcLanguage.getCode())) {
                                String lower = lang.toLowerCase().replace("-", "_");
                                String value = rs.getString(lower + "_pure");
                                if (value != null && !value.isEmpty()) {
                                    translated = true;
                                    break;
                                }
                            }
                        }
                        if (translated) {
                            continue;
                        }
                    }
                    if (caseSensitive) {
                        String lower = filterLanguage.getCode().toLowerCase().replace("-", "_");
                        String tuv = rs.getString(lower + "_tuv");
                        if (tuv == null) {
                            continue;
                        }
                        String text = TmxUtils.pureText(parseElement(tuv).getChild("seg"), true, filterText,
                                caseSensitive, regExp, filterLanguage != null ? filterLanguage.getCode() : null);
                        if (text.indexOf(TmxUtils.STYLE) == -1) {
                            continue;
                        }
                    }
                    String id = rs.getString(1);
                    Map<String, String> map = new HashMap<>();
                    Iterator<String> it = languages.iterator();
                    while (it.hasNext()) {
                        String lang = it.next();
                        String lower = lang.toLowerCase().replace("-", "_");
                        String tuv = rs.getString(lower + "_tuv");
                        if (tuv != null) {
                            tuv = TmxUtils.pureText(parseElement(tuv).getChild("seg"), true, filterText, caseSensitive,
                                    regExp, filterLanguage != null ? filterLanguage.getCode() : null);
                            map.put(lang, tuv);
                        } else {
                            map.put(lang, "");
                        }
                    }
                    result.add(new TUnit(1 + processed + start, id, map));
                    processed++;
                    if (processed >= count) {
                        break;
                    }
                }
            }
        }
        return result;
    }

    private String getPure(String id, String lang) throws SQLException {
        String result = "";
        String lower = lang.toLowerCase().replace("-", "_");
        try (PreparedStatement selectPure = conn.prepareStatement("SELECT " + lower + "_pure FROM tuv WHERE id = ?")) {
            selectPure.setString(1, id);
            try (ResultSet rs = selectPure.executeQuery()) {
                while (rs.next()) {
                    result = rs.getString(1);
                }
            }
        }
        return result;
    }

    @Override
    public Element getTuv(String id, String lang)
            throws SQLException, SAXException, IOException, ParserConfigurationException {
        String lower = lang.toLowerCase().replace("-", "_");
        Element result = null;
        try (PreparedStatement selectTUV = conn.prepareStatement("SELECT " + lower + "_tuv FROM tuv WHERE id = ?")) {
            selectTUV.setString(1, id);
            try (ResultSet rs = selectTUV.executeQuery()) {
                while (rs.next()) {
                    String tuv = rs.getString(1);
                    if (tuv != null && !tuv.isBlank()) {
                        result = parseElement(tuv);
                    }
                }
            }
        }
        return result;
    }

    private Element parseElement(String tuv) throws SAXException, IOException, ParserConfigurationException {
        Document doc = new SAXBuilder().build(new ByteArrayInputStream(tuv.getBytes(StandardCharsets.UTF_8)));
        return doc.getRootElement();
    }

    @Override
    public void close() throws IOException, SQLException {
        insertTU.close();
        selectTU.close();
        selectTUS.close();
        conn.close();
    }

    @Override
    public long getCount() throws SQLException {
        long result = 0l;
        try (Statement count = conn.createStatement()) {
            try (ResultSet rs = count.executeQuery("SELECT COUNT(*) FROM tu")) {
                while (rs.next()) {
                    result = rs.getLong(1);
                }
            }
        }
        return result;
    }

    @Override
    public long getDiscarded() {
        return discarded;
    }

    @Override
    public String saveData(String id, String lang, String value)
            throws IOException, SAXException, ParserConfigurationException, SQLException {
        Element tuv = getTuv(id, lang);
        String text = value;
        if (tuv != null) {
            Element seg = tuv.getChild("seg");
            TmxUtils.pureText(seg, true, null, false, false, lang);
            Map<String, String> tags = TmxUtils.getTags();
            Set<String> keys = tags.keySet();
            Iterator<String> it = keys.iterator();
            while (it.hasNext()) {
                String key = it.next();
                text = TextUtils.replaceAll(text, key, tags.get(key), false);
            }
            try {
                Document d = builder
                        .build(new ByteArrayInputStream(("<seg>" + text + "</seg>").getBytes(StandardCharsets.UTF_8)));
                seg.setContent(d.getRootElement().getContent());
            } catch (Exception ex) {
                seg.setText(text);
            }
            updateTUV(id, lang, tuv);
            conn.commit();
        } else {
            tuv = new Element("tuv");
            tuv.setAttribute("xml:lang", lang);
            tuv.setAttribute("creationdate", TmxUtils.tmxDate());
            Element seg = new Element("seg");
            seg.setText(text);
            tuv.addContent(seg);
            updateTUV(id, lang, tuv);
            conn.commit();
        }
        return TmxUtils.pureText(tuv.getChild("seg"), true, null, false, false, lang);
    }

    @Override
    public void writeFile(File file) throws IOException, SAXException, ParserConfigurationException, SQLException {
        saved = 0l;
        try (FileOutputStream out = new FileOutputStream(file)) {
            writeString(out, """
                    <?xml version=\"1.0\" ?>
                    <!DOCTYPE tmx PUBLIC \"-//LISA OSCAR:1998//DTD for Translation Memory eXchange//EN\" \"tmx14.dtd\">
                    <tmx version=\"1.4\">
                    """);

            writeString(out, TextUtils.padding(1, indentation) + header.toString() + "\n");
            writeString(out, TextUtils.padding(1, indentation) + "<body>\n");
            selectTUS.setLong(1, 0l);
            try (ResultSet rs = selectTUS.executeQuery()) {
                while (rs.next()) {
                    String id = rs.getString(1);
                    Element tu = getTu(id);
                    Iterator<String> langIt = languages.iterator();
                    int count = 0;
                    while (langIt.hasNext()) {
                        String lang = langIt.next();
                        Element tuv = getTuv(id, lang);
                        if (tuv != null) {
                            tu.addContent(tuv);
                            count++;
                        }
                    }
                    if (count == 0) {
                        continue;
                    }
                    Indenter.indent(tu, 3, indentation);
                    writeString(out, TextUtils.padding(2, indentation) + tu.toString() + "\n");
                    saved++;
                }
            }
            writeString(out, TextUtils.padding(1, indentation) + "</body>\n");
            writeString(out, "</tmx>");
        }
    }

    private void writeString(FileOutputStream out, String string) throws IOException {
        out.write(string.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public long getSaved() {
        return saved;
    }

    @Override
    public void commit() throws IOException, SQLException {
        conn.commit();
    }

    @Override
    public Element getTu(String id) throws IOException, SQLException, SAXException, ParserConfigurationException {
        Element result = null;
        selectTU.setString(1, id);
        try (ResultSet rs = selectTU.executeQuery()) {
            while (rs.next()) {
                String tu = rs.getString(1);
                result = parseElement(tu);
            }
        }
        return result;
    }

    @Override
    public void delete(List<String> selected) throws SQLException {
        Iterator<String> it = selected.iterator();
        while (it.hasNext()) {
            delete(it.next());
        }
    }

    private void delete(String id) throws SQLException {
        try (PreparedStatement deleteTU = conn.prepareStatement("DELETE FROM tu WHERE id = ?")) {
            deleteTU.setString(1, id);
            deleteTU.executeUpdate();
        }
        try (PreparedStatement deleteTUV = conn.prepareStatement("DELETE FROM tuv WHERE id = ?")) {
            deleteTUV.setString(1, id);
            deleteTUV.executeUpdate();
        }
        conn.commit();
    }

    @Override
    public void replaceText(String search, String replace, Language language, boolean regExp)
            throws SAXException, IOException, ParserConfigurationException, SQLException {
        processed = 0l;
        selectTUS.setLong(1, 0l);
        try (ResultSet rs = selectTUS.executeQuery()) {
            while (rs.next()) {
                String id = rs.getString(1);
                Element tuv = getTuv(id, language.getCode());
                if (tuv != null) {
                    Element seg = tuv.getChild("seg");
                    String segText = TmxUtils.textOnly(seg);
                    if (regExp) {
                        TmxUtils.replaceText(seg, search, replace, regExp);
                        if (!segText.equals(TmxUtils.textOnly(seg))) {
                            updateTUV(id, language.getCode(), tuv);
                        }
                    } else {
                        if (segText.indexOf(search) != -1) {
                            TmxUtils.replaceText(tuv.getChild("seg"), search, replace, regExp);
                            updateTUV(id, language.getCode(), tuv);
                        }
                    }
                }
                processed++;
            }
        }
        conn.commit();
    }

    @Override
    public long getProcessed() {
        return processed;
    }

    @Override
    public void insertUnit(String id) throws IOException, SQLException {
        Element tu = new Element("tu");
        tu.setAttribute("tuid", id);
        tu.setAttribute("creationdate", TmxUtils.tmxDate());
        tu.setAttribute("creationid", System.getProperty("user.name"));
        tu.setAttribute("creationtool", Constants.APPNAME);
        tu.setAttribute("creationtoolversion", Constants.VERSION);
        insertTU.setString(1, id);
        insertTU.setString(2, tu.toString());
        insertTU.setLong(3, position++);
        insertTU.executeUpdate();
        String sql = "INSERT INTO tuv (id) VALUES (?);";
        try (PreparedStatement insertTUV = conn.prepareStatement(sql)) {
            insertTUV.setString(1, id);
            insertTUV.executeUpdate();
        }
        conn.commit();
    }

    @Override
    public long removeUntranslated(Language language)
            throws IOException, SQLException, SAXException, ParserConfigurationException {
        long result = 0l;
        String srcLang = language.getCode();
        String lower = srcLang.toLowerCase().replace("-", "_");
        String sql = "SELECT * FROM tuv WHERE " + lower + "_pure NOT NULL";
        try (Statement stmt = conn.createStatement()) {
            try (ResultSet rs = stmt.executeQuery(sql)) {
                while (rs.next()) {
                    String id = rs.getString("id");
                    boolean translated = false;
                    Iterator<String> it = languages.iterator();
                    while (it.hasNext()) {
                        String lang = it.next();
                        if (lang.equals(srcLang)) {
                            continue;
                        }
                        lower = lang.toLowerCase().replace("-", "_");
                        String value = rs.getString(lower + "_pure");
                        if (value != null && !value.isBlank()) {
                            translated = true;
                            break;
                        }
                    }
                    if (!translated) {
                        delete(id);
                        result++;
                    }
                }
            }
        }
        conn.commit();
        return result;
    }

    @Override
    public void removeSameAsSource(Language language)
            throws IOException, SAXException, ParserConfigurationException, SQLException {
        String srclang = language.getCode();
        processed = 0l;
        selectTUS.setLong(1, 0l);
        try (ResultSet rs = selectTUS.executeQuery()) {
            while (rs.next()) {
                String id = rs.getString(1);
                Element srcTuv = getTuv(id, srclang);
                if (srcTuv != null) {
                    Element src = srcTuv.getChild("seg");
                    Iterator<String> langIt = languages.iterator();
                    int count = 0;
                    while (langIt.hasNext()) {
                        String lang = langIt.next();
                        if (!lang.equals(srclang)) {
                            Element tuv = getTuv(id, lang);
                            if (tuv != null) {
                                Element tgt = tuv.getChild("seg");
                                if (src.equals(tgt)) {
                                    clearTuv(id, lang);
                                } else {
                                    count++;
                                }
                            }
                        }
                    }
                    if (count == 0) {
                        delete(id);
                    }
                }
            }
        }
        conn.commit();
    }

    @Override
    public void addLanguage(Language language) throws IOException, SQLException {
        String lang = language.getCode();
        if (!languages.contains(lang)) {
            String lower = lang.toLowerCase().replace("-", "_");
            StringBuilder sb = new StringBuilder();
            sb.append("ALTER TABLE tuv ADD COLUMN ");
            sb.append(lower);
            sb.append("_pure TEXT;");
            StringBuilder sb2 = new StringBuilder();
            sb2.append("ALTER TABLE tuv ADD COLUMN ");
            sb2.append(lower);
            sb2.append("_tuv TEXT;");
            try (Statement addLang = conn.createStatement()) {
                addLang.execute(sb.toString());
                addLang.execute(sb2.toString());
            }
            conn.commit();
            languages.add(lang);
        }
    }

    @Override
    public void removeLanguage(Language language) throws IOException, SQLException {
        String lang = language.getCode();
        if (languages.contains(lang)) {
            String lower = lang.toLowerCase().replace("-", "_");
            StringBuilder sb = new StringBuilder();
            sb.append("ALTER TABLE tuv DROP COLUMN ");
            sb.append(lower);
            sb.append("_pure;");
            StringBuilder sb2 = new StringBuilder();
            sb2.append("ALTER TABLE tuv DROP COLUMN ");
            sb2.append(lower);
            sb2.append("_tuv;");
            try (Statement removeLang = conn.createStatement()) {
                removeLang.execute(sb.toString());
                removeLang.execute(sb2.toString());
            }
            conn.commit();
            languages.remove(lang);
        }
    }

    @Override
    public void removeTags() throws SAXException, IOException, ParserConfigurationException, SQLException {
        processed = 0l;
        selectTUS.setLong(1, 0l);
        try (ResultSet rs = selectTUS.executeQuery()) {
            while (rs.next()) {
                String id = rs.getString(1);
                Iterator<String> it = languages.iterator();
                while (it.hasNext()) {
                    String lang = it.next();
                    Element tuv = getTuv(id, lang);
                    if (tuv != null) {
                        Element seg = tuv.getChild("seg");
                        if (!seg.getChildren().isEmpty()) {
                            seg.setText(TmxUtils.textOnly(seg));
                            updateTUV(id, lang, tuv);
                        }
                    }
                }
                processed++;
            }
        }
        conn.commit();
    }

    @Override
    public void changeLanguage(Language oldLanguage, Language newLanguage)
            throws IOException, SAXException, ParserConfigurationException, SQLException {
        String oldCode = oldLanguage.getCode();
        if (!languages.contains(oldCode)) {
            return;
        }
        String newCode = newLanguage.getCode();
        if (languages.contains(newCode)) {
            return;
        }
        String lowerOld = oldCode.toLowerCase().replace("-", "_");
        String lowerNew = newCode.toLowerCase().replace("-", "_");
        StringBuilder sb = new StringBuilder();
        sb.append("ALTER TABLE tuv RENAME COLUMN ");
        sb.append(lowerOld);
        sb.append("_pure TO ");
        sb.append(lowerNew);
        sb.append("_pure;");
        StringBuilder sb2 = new StringBuilder();
        sb2.append("ALTER TABLE tuv RENAME COLUMN ");
        sb2.append(lowerOld);
        sb2.append("_tuv TO ");
        sb2.append(lowerNew);
        sb2.append("_tuv;");
        try (Statement changeLang = conn.createStatement()) {
            changeLang.execute(sb.toString());
            changeLang.execute(sb2.toString());
        }
        conn.commit();
        languages.remove(oldCode);
        languages.add(newCode);
    }

    @Override
    public void removeDuplicates() throws SAXException, IOException, ParserConfigurationException, SQLException {
        String order = " ORDER BY ";
        Iterator<String> it = languages.iterator();
        while (it.hasNext()) {
            String lang = it.next();
            String lower = lang.toLowerCase().replace("-", "_");
            order += lower + "_pure, ";
        }
        order = order.substring(0, order.length() - 2);
        String sql = "SELECT * FROM tuv" + order;
        Map<String, Element> lastSegments = new HashMap<>();
        try (Statement stmt = conn.createStatement()) {
            try (ResultSet rs = stmt.executeQuery(sql)) {
                while (rs.next()) {
                    String id = rs.getString("id");
                    Map<String, Element> segments = new HashMap<>();
                    it = languages.iterator();
                    while (it.hasNext()) {
                        String lang = it.next();
                        String lower = lang.toLowerCase().replace("-", "_");
                        String value = rs.getString(lower + "_tuv");
                        if (value != null) {
                            Element tuv = parseElement(value);
                            Element seg = tuv.getChild("seg");
                            segments.put(lang, seg);

                        }
                    }
                    if (segments.equals(lastSegments)) {
                        delete(id);
                    } else {
                        lastSegments = segments;
                    }
                }
            }
        }
        conn.commit();
    }

    @Override
    public void removeSpaces() throws SAXException, IOException, ParserConfigurationException, SQLException {
        processed = 0l;
        String sql = "SELECT * FROM tuv";
        try (Statement stmt = conn.createStatement()) {
            try (ResultSet rs = stmt.executeQuery(sql)) {
                while (rs.next()) {
                    String id = rs.getString("id");
                    Iterator<String> it = languages.iterator();
                    while (it.hasNext()) {
                        String lang = it.next();
                        String lower = lang.toLowerCase().replace("-", "_");
                        String pure = rs.getString(lower + "_pure");
                        if (pure != null && !pure.equals(pure.strip())) {
                            Element tuv = parseElement(rs.getString(lower + "_tuv"));
                            Element seg = tuv.getChild("seg");
                            seg.setContent(TmxUtils.stripSegment(seg).getContent());
                            updateTUV(id, lang, tuv);
                        }
                    }
                }
            }
        }
        conn.commit();
    }

    private void clearTuv(String id, String lang) throws SQLException {
        String lower = lang.toLowerCase().replace("-", "_");
        try (PreparedStatement deleteTUV = conn.prepareStatement("UPDATE tuv SET " + lower + "_pure = '', " + lower
                + "_tuv = '' WHERE id = ?")) {
            deleteTUV.setString(1, id);
            deleteTUV.executeUpdate();
        }
    }

    @Override
    public void consolidateUnits(Language language)
            throws IOException, SAXException, ParserConfigurationException, SQLException {
        String srcLang = language.getCode();
        String lower = srcLang.toLowerCase().replace("-", "_");
        String sql = "SELECT * FROM tuv WHERE " + lower + "_pure NOT NULL ORDER BY " + lower + "_pure";
        Map<String, Element> lastSegments = new HashMap<>();
        String lastId = "";
        boolean first = true;
        try (Statement stmt = conn.createStatement()) {
            try (ResultSet rs = stmt.executeQuery(sql)) {
                while (rs.next()) {
                    String id = rs.getString("id");
                    Map<String, Element> segments = new HashMap<>();
                    Iterator<String> it = languages.iterator();
                    while (it.hasNext()) {
                        String lang = it.next();
                        lower = lang.toLowerCase().replace("-", "_");
                        String value = rs.getString(lower + "_tuv");
                        if (value != null) {
                            segments.put(lang, parseElement(value));
                        }
                    }
                    if (first) {
                        lastSegments = segments;
                        lastId = id;
                        first = false;
                        continue;
                    }
                    if (segments.get(srcLang).getChild("seg").equals(lastSegments.get(srcLang).getChild("seg"))) {
                        it = languages.iterator();
                        while (it.hasNext()) {
                            String lang = it.next();
                            if (lang.equals(srcLang)) {
                                continue;
                            }
                            Element a = lastSegments.get(lang);
                            Element b = segments.get(lang);
                            if (a == null && b != null) {
                                lastSegments.put(lang, b);
                                updateTUV(lastId, lang, b);
                                clearTuv(id, lang);
                            }
                        }
                    } else {
                        lastSegments = segments;
                        lastId = id;
                    }
                }
            }
        }
        removeUntranslated(language);
    }

    @Override
    public void setTuAttributes(String id, List<String[]> attributes)
            throws SAXException, IOException, ParserConfigurationException, SQLException {
        Element tu = getTu(id);
        if (tu != null) {
            tu.setAttributes(new Vector<>());
            Iterator<String[]> it = attributes.iterator();
            while (it.hasNext()) {
                String[] pair = it.next();
                tu.setAttribute(pair[0], pair[1]);
            }
            updateTU(id, tu);
            conn.commit();
        }
    }

    private void updateTU(String id, Element tu) throws SQLException {
        try (PreparedStatement updateTU = conn.prepareStatement("UPDATE tu SET tu = ? WHERE id = ?")) {
            updateTU.setString(1, tu.toString());
            updateTU.setString(2, id);
            updateTU.executeUpdate();
        }
    }

    @Override
    public void setTuvAttributes(String id, String lang, List<String[]> attributes)
            throws SAXException, IOException, ParserConfigurationException, SQLException {
        Element tuv = getTuv(id, lang);
        if (tuv != null) {
            tuv.setAttributes(new Vector<>());
            Iterator<String[]> it = attributes.iterator();
            while (it.hasNext()) {
                String[] pair = it.next();
                tuv.setAttribute(pair[0], pair[1]);
            }
            updateTUV(id, lang, tuv);
            conn.commit();
        }
    }

    @Override
    public void setTuProperties(String id, List<String[]> properties)
            throws SAXException, IOException, ParserConfigurationException, SQLException {
        Element tu = getTu(id);
        if (tu != null) {
            List<Element> content = new Vector<>();
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
            content.addAll(tu.getChildren("note"));
            tu.setChildren(content);
            updateTU(id, tu);
            conn.commit();
        }
    }

    @Override
    public void setTuvProperties(String id, String lang, List<String[]> properties)
            throws SAXException, IOException, ParserConfigurationException, SQLException {
        Element tuv = getTuv(id, lang);
        if (tuv != null) {
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
            updateTUV(id, lang, tuv);
            conn.commit();
        }
    }

    @Override
    public void setTuNotes(String id, List<String> notes)
            throws SAXException, IOException, ParserConfigurationException, SQLException {
        Element tu = getTu(id);
        if (tu != null) {
            List<Element> content = new Vector<>();
            content.addAll(tu.getChildren("prop"));
            Iterator<String> it = notes.iterator();
            while (it.hasNext()) {
                String note = it.next();
                if (note.isEmpty()) {
                    continue;
                }
                Element not = new Element("note");
                not.setText(note);
                content.add(not);
            }
            tu.setChildren(content);
            updateTU(id, tu);
            conn.commit();
        }
    }

    @Override
    public void setTuvNotes(String id, String lang, List<String> notes)
            throws SAXException, IOException, ParserConfigurationException, SQLException {
        Element tuv = getTuv(id, lang);
        if (tuv != null) {
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
            updateTUV(id, lang, tuv);
            conn.commit();
        }
    }

    @Override
    public void exportDelimited(String file)
            throws IOException, SAXException, ParserConfigurationException, SQLException {
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
                selectTUS.setLong(1, 0l);
                try (ResultSet rs = selectTUS.executeQuery()) {
                    while (rs.next()) {
                        StringBuilder line = new StringBuilder();
                        String tuid = rs.getString(1);
                        Iterator<String> langIt = languages.iterator();
                        while (langIt.hasNext()) {
                            String lang = langIt.next();
                            String pure = getPure(tuid, lang);
                            // Element tuv = getTuv(tuid, lang);
                            String text = " ";
                            if (!pure.isEmpty()) {
                                text = TmxUtils.cleanLines(pure);
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
    public long getExported() {
        return exported;
    }

    @Override
    public void setIndentation(int indentation) {
        this.indentation = indentation;
    }

    @Override
    public void exportExcel(String file) throws IOException, SAXException, ParserConfigurationException, SQLException {
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

        List<Map<String, String>> rows = new Vector<>();
        Map<String, String> firstRow = new HashMap<>();
        Iterator<String> langIt = languages.iterator();
        while (langIt.hasNext()) {
            String lang = langIt.next();
            firstRow.put(langsMap.get(lang), lang);
        }
        rows.add(firstRow);

        String sql = "SELECT id, position FROM tu ORDER BY position";
        try (Statement stmt = conn.createStatement()) {
            try (ResultSet rs = stmt.executeQuery(sql)) {
                while (rs.next()) {
                    String tuid = rs.getString(1);
                    Map<String, String> rowMap = new HashMap<>();
                    langIt = languages.iterator();
                    while (langIt.hasNext()) {
                        String lang = langIt.next();
                        Element tuv = getTuv(tuid, lang);
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
        }
        Sheet sheet = new Sheet("Sheet1", cols, rows);
        ExcelWriter writer = new ExcelWriter();
        writer.writeFile(file, sheet);
    }

}
