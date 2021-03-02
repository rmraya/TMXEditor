/*****************************************************************************
Copyright (c) 2018-2021 - Maxprograms,  http://www.maxprograms.com/

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

package com.maxprograms.tmxserver.excel;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import javax.xml.parsers.ParserConfigurationException;

import com.maxprograms.xml.Document;
import com.maxprograms.xml.Element;
import com.maxprograms.xml.SAXBuilder;

import org.xml.sax.SAXException;

public class ExcelReader {

    private SAXBuilder builder;
    private List<String> strings;
    private List<Sheet> sheets;

    public ExcelReader() {
        builder = new SAXBuilder();
    }

    public List<Sheet> parseFile(String file) throws IOException, SAXException, ParserConfigurationException {
        sheets = new ArrayList<>();
        strings = new ArrayList<>();

        File folder = new File(new File(System.getProperty("java.io.tmpdir")), "ExcelReader");
        if (folder.exists()) {
            removeFolder(folder);
        }
        Files.createDirectories(folder.toPath());

        try (ZipInputStream in = new ZipInputStream(new FileInputStream(file))) {
            ZipEntry entry = null;
            while ((entry = in.getNextEntry()) != null) {
                File tmp = new File(folder, entry.getName());
                if (!tmp.getParentFile().exists()) {
                    Files.createDirectories(tmp.getParentFile().toPath());
                }
                if (entry.isDirectory()) {
                    Files.createDirectories(tmp.toPath());
                } else {
                    try (FileOutputStream output = new FileOutputStream(tmp.getAbsolutePath())) {
                        byte[] buf = new byte[1024];
                        int len;
                        while ((len = in.read(buf)) != -1) {
                            output.write(buf, 0, len);
                        }
                    }
                }
            }
        }

        String workbook = getWorkBook(folder);
        String sharedStrings = getSharedStrings(workbook);

        parseStrings(sharedStrings);

        List<String[]> sheetLocations = getSheetNames(workbook);
        for (int i = 0; i < sheetLocations.size(); i++) {
            parseSheet(folder, sheetLocations.get(i)[0], sheetLocations.get(i)[1]);
        }

        removeFolder(folder);
        return sheets;
    }

    private String getWorkBook(File folder) throws SAXException, IOException, ParserConfigurationException {
        File relsFile = new File(folder, "/_rels/.rels");
        Document doc = builder.build(relsFile);
        Element root = doc.getRootElement();
        List<Element> relationships = root.getChildren("Relationship");
        Iterator<Element> it = relationships.iterator();
        while (it.hasNext()) {
            Element relationship = it.next();
            if (relationship.getAttributeValue("Type").endsWith("/officeDocument")) {
                File workbook = new File(folder, relationship.getAttributeValue("Target"));
                return workbook.getAbsolutePath();
            }
        }
        return null;
    }

    private String getSharedStrings(String workbookFile)
            throws SAXException, IOException, ParserConfigurationException {
        File workbook = new File(workbookFile);
        Document doc = builder.build(new File(workbook.getParentFile(), "_rels/workbook.xml.rels"));
        Element root = doc.getRootElement();
        List<Element> relationships = root.getChildren("Relationship");
        Iterator<Element> it = relationships.iterator();
        while (it.hasNext()) {
            Element relationship = it.next();
            if (relationship.getAttributeValue("Type").endsWith("/sharedStrings")) {
                File shared = new File(workbook.getParentFile(), relationship.getAttributeValue("Target"));
                return shared.getAbsolutePath();
            }
        }
        return null;
    }

    private List<String[]> getSheetNames(String workbookFile)
            throws SAXException, IOException, ParserConfigurationException {
        List<String[]> result = new ArrayList<>();
        File workbook = new File(workbookFile);
        Map<String, String> map = new HashMap<>();
        Document doc = builder.build(new File(workbook.getParentFile(), "_rels/workbook.xml.rels"));
        Element root = doc.getRootElement();
        List<Element> relationships = root.getChildren("Relationship");
        Iterator<Element> it = relationships.iterator();
        while (it.hasNext()) {
            Element relationship = it.next();
            map.put(relationship.getAttributeValue("Id"), relationship.getAttributeValue("Target"));
        }

        doc = builder.build(workbookFile);
        root = doc.getRootElement();
        Element sheetsList = root.getChild("sheets");
        List<Element> children = sheetsList.getChildren("sheet");
        it = children.iterator();
        while (it.hasNext()) {
            Element sheet = it.next();
            if (!"hidden".equals(sheet.getAttributeValue("state"))) {
                String location = map.get(sheet.getAttributeValue("r:id"));
                String name = sheet.getAttributeValue("name");
                result.add(new String[] { location, name });
            }
        }
        return result;
    }

    private void parseStrings(String stringsFile) throws SAXException, IOException, ParserConfigurationException {
        Document doc = builder.build(stringsFile);
        Element root = doc.getRootElement();
        List<Element> children = root.getChildren("si");
        Iterator<Element> it = children.iterator();
        while (it.hasNext()) {
            Element child = it.next();
            String text = parseSi(child);
            strings.add(text);
        }
    }

    private String parseSi(Element e) {
        StringBuilder sb = new StringBuilder();
        List<Element> children = e.getChildren();
        for (int i = 0; i < children.size(); i++) {
            sb.append(getText(children.get(i)));
        }
        return sb.toString();
    }

    private String getText(Element e) {
        if ("t".equals(e.getName())) {
            return e.getText();
        }
        List<Element> children = e.getChildren();
        for (int i = 0; i < children.size(); i++) {
            String text = getText(children.get(i));
            if (!text.isEmpty()) {
                return text;
            }
        }
        return "";
    }

    private void parseSheet(File folder, String location, String name)
            throws SAXException, IOException, ParserConfigurationException {
        List<Map<String, String>> data = new ArrayList<>();
        Set<String> cols = new TreeSet<>();
        Document doc = builder.build(new File(folder, "xl/" + location));
        Element root = doc.getRootElement();
        Element sheetData = root.getChild("sheetData");
        List<Element> rows = sheetData.getChildren("row");
        Iterator<Element> it = rows.iterator();
        while (it.hasNext()) {
            Element row = it.next();
            Map<String, String> rowMap = new HashMap<>();
            String rowId = row.getAttributeValue("r");
            List<Element> cells = row.getChildren("c");
            Iterator<Element> ct = cells.iterator();
            while (ct.hasNext()) {
                Element c = ct.next();
                String text = "";
                String type = c.getAttributeValue("t");
                if ("s".equals(type)) {
                    Element v = c.getChild("v");
                    int index = Integer.parseInt(v.getText());
                    text = strings.get(index);
                } else if ("inlineStr".equals(type)) {
                    text = getText(c);
                } else if ("n".equals(type) || type.isEmpty()) {
                    Element value = c.getChild("v");
                    if (value != null) {
                        text = value.getText();
                    }
                }
                if (text.isEmpty()) {
                    continue;
                }
                String cellId = c.getAttributeValue("r");
                String colId = cellId.substring(0, cellId.length() - rowId.length());
                rowMap.put(colId, text);
                if (!rowMap.isEmpty()) {
                    cols.add(colId);
                }
            }
            data.add(rowMap);
        }
        sheets.add(new Sheet(name, cols, data));
    }

    protected static void removeFolder(File folder) throws IOException {
        if (folder.isDirectory()) {
            File[] list = folder.listFiles();
            for (int i = 0; i < list.length; i++) {
                removeFolder(list[i]);
            }
        }
        Files.delete(folder.toPath());
    }
}
