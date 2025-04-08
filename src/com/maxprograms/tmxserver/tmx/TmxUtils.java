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

package com.maxprograms.tmxserver.tmx;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.Locale;

import javax.xml.parsers.ParserConfigurationException;

import org.json.JSONException;
import org.json.JSONObject;
import org.xml.sax.SAXException;

import com.maxprograms.tmxserver.utils.TextUtils;
import com.maxprograms.xml.Attribute;
import com.maxprograms.xml.Element;
import com.maxprograms.xml.SAXBuilder;
import com.maxprograms.xml.TextNode;
import com.maxprograms.xml.XMLNode;

public class TmxUtils {

	public static final String STYLE = "class='highlighted'";
	public static final String SPACE = "class='spaces'";

	private static int maxTag;
	private static int tag;
	private static HashMap<String, String> tags;

	private static SAXBuilder builder;
	private static Pattern pattern;
	private static String lastFilterText;

	private static File workDir;
	private static Map<String, Locale> localesCache = new HashMap<>();

	private TmxUtils() {
		// empty for security
	}

	public static String replaceTags(String string) {
		String source = string.replace("&nbsp;", "\u00A0").replace("<br>", "\n");
		int index = source.indexOf("<img ");
		int tagNumber = 0;
		List<String> currentTags = new ArrayList<>();
		while (index >= 0) {
			String start = source.substring(0, index);
			String rest = source.substring(index + 1);
			int end = rest.indexOf('>');
			String tag = '<' + rest.substring(0, end) + ">";
			currentTags.add(tag);
			source = start + "[[" + tagNumber++ + "]]" + rest.substring(end + 1);
			index = source.indexOf("<img ");
		}
		for (int i = 0; i < currentTags.size(); i++) {
			String tag = currentTags.get(i);
			int start = tag.indexOf("title=\"");
			int end = tag.indexOf("\"", start + 7);
			String code = tag.substring(start + 7, end);
			source = source.replace("[[" + i + "]]", restoreAngles(code));
		}
		return source;
	}

	public static String pureText(Element seg, boolean clearTags, String filterText, boolean caseSensitive,
			boolean regExp, String filterLanguage) throws IOException {
		if (seg == null) {
			return "";
		}
		if (clearTags) {
			if (tags != null) {
				tags.clear();
				tags = null;
			}
			tags = new HashMap<>();
			tag = 1;
		}
		Locale locale = null;
		if (filterLanguage != null) {
			if (!localesCache.containsKey(filterLanguage)) {
				locale = Locale.forLanguageTag(filterLanguage);
				localesCache.put(filterLanguage, locale);
			}
			locale = localesCache.get(filterLanguage);
		}
		List<XMLNode> list = seg.getContent();
		Iterator<XMLNode> it = list.iterator();
		StringBuilder text = new StringBuilder();
		while (it.hasNext()) {
			XMLNode o = it.next();
			if (o.getNodeType() == XMLNode.TEXT_NODE) {
				if (filterText == null) {
					text.append(TextUtils.cleanString(((TextNode) o).getText()));
				} else {
					if (regExp) {
						if (pattern == null || !filterText.equals(lastFilterText)) {
							pattern = Pattern.compile(filterText);
							lastFilterText = filterText;
						}
						String s = ((TextNode) o).getText();
						Matcher matcher = pattern.matcher(s);
						if (matcher.find()) {
							StringBuilder sb = new StringBuilder();
							do {
								int start = matcher.start();
								int end = matcher.end();
								sb.append(TextUtils.cleanString(s.substring(0, start)));
								sb.append("<span " + STYLE + ">");
								sb.append(TextUtils.cleanString(s.substring(start, end)));
								sb.append("</span>");
								s = s.substring(end);
								matcher = pattern.matcher(s);
							} while (matcher.find());
							sb.append(TextUtils.cleanString(s));
							text.append(sb.toString());
						} else {
							text.append(TextUtils.cleanString(s));
						}
					} else {
						String s = TextUtils.cleanString(((TextNode) o).getText());
						String t = TextUtils.cleanString(filterText);
						if (caseSensitive) {
							if (s.indexOf(t) != -1) {
								text.append(highlight(s, t, caseSensitive, filterLanguage));
							} else {
								text.append(s);
							}
						} else {
							if (s.toLowerCase(locale).indexOf(t.toLowerCase(locale)) != -1) {
								text.append(highlight(s, t, caseSensitive, filterLanguage));
							} else {
								text.append(s);
							}
						}
					}
				}
			} else if (o.getNodeType() == XMLNode.ELEMENT_NODE) {
				Element e = (Element) o;
				String type = e.getName();
				if (type.equals("sub") || type.equals("hi")) {
					checkSVG();
					String header = getHeader(e);
					tags.put("[[" + tag + "]]", header);
					text.append("<img src='");
					text.append(getWorkFolder().toURI().toURL().toString());
					text.append("images/");
					text.append(tag++);
					text.append(".svg' align='bottom' alt='' title=\"");
					text.append(unquote(cleanAngles(header)));
					text.append("\"/>");
					text.append(pureText(e, false, filterText, caseSensitive, regExp, filterLanguage));
					checkSVG();
					String tail = getTail(e);
					tags.put("[[" + tag + "]]", tail);
					text.append("<img src='");
					text.append(getWorkFolder().toURI().toURL().toString());
					text.append("images/");
					text.append(tag++);
					text.append(".svg' align='bottom' alt='' title=\"");
					text.append(unquote(cleanAngles(tail)));
					text.append("\"/>");
				} else {
					checkSVG();
					String element = e.toString();
					tags.put("[[" + tag + "]]", element);
					text.append("<img src='");
					text.append(getWorkFolder().toURI().toURL().toString());
					text.append("images/");
					text.append(tag++);
					text.append(".svg' align='bottom' alt='' title=\"");
					text.append(unquote(cleanAngles(element)));
					text.append("\"/>");
				}
			}
		}
		return highlightSpaces(text.toString());
	}

	private static String highlightSpaces(String string) {
		if (string.strip().equals(string)) {
			return string;
		}
		String result = string;
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < result.length(); i++) {
			char c = result.charAt(i);
			if (c == ' ' || c == '\u00A0' || c == '\t' || c == '\n' || c == '\r') {
				sb.append(c);
			} else {
				break;
			}
		}
		if (!sb.isEmpty()) {
			result = "<span " + SPACE + ">" + sb.toString() + "</span>" + result.substring(sb.length());
		}
		sb = new StringBuilder();
		for (int i = result.length() - 1; i >= 0; i--) {
			char c = result.charAt(i);
			if (c == ' ' || c == '\u00A0' || c == '\t' || c == '\n' || c == '\r') {
				sb.append(c);
			} else {
				break;
			}
		}
		if (!sb.isEmpty()) {
			result = result.substring(0, result.length() - sb.length()) + "<span " + SPACE + ">" + sb.toString()
					+ "</span>";
		}
		return result;
	}

	public static JSONObject readJSON(File json) throws IOException, JSONException {
		StringBuilder builder = new StringBuilder();
		try (FileReader reader = new FileReader(json, StandardCharsets.UTF_8)) {
			try (BufferedReader buffer = new BufferedReader(reader)) {
				String line = "";
				while ((line = buffer.readLine()) != null) {
					if (!builder.isEmpty()) {
						builder.append('\n');
					}
					builder.append(line);
				}
			}
		}
		return new JSONObject(builder.toString());
	}

	protected static String highlight(String string, String target, boolean caseSensitive, String filterLanguage) {
		String result = string;
		int start = -1;
		Locale locale = null;
		if (filterLanguage != null) {
			localesCache.computeIfAbsent(filterLanguage, l -> Locale.forLanguageTag(l));
			locale = localesCache.get(filterLanguage);
		}
		String replacement = "<span " + STYLE + ">" + target + "</span>";
		if (caseSensitive) {
			start = result.indexOf(target);
		} else {
			start = result.toLowerCase(locale).indexOf(target.toLowerCase(locale));
			replacement = "<span " + STYLE + ">" + result.substring(start, start + target.length()) + "</span>";
		}
		while (start != -1) {
			result = result.substring(0, start) + replacement + result.substring(start + target.length());
			start = start + replacement.length();
			if (caseSensitive) {
				start = result.indexOf(target, start);
			} else {
				start = result.toLowerCase(locale).indexOf(target.toLowerCase(locale), start);
				if (start != -1) {
					replacement = "<span " + STYLE + ">" + result.substring(start, start + target.length()) + "</span>";
				}
			}
		}
		return result;
	}

	public static String tmxDate() {
		Calendar calendar = Calendar.getInstance(TimeZone.getTimeZone("GMT"));
		String sec = (calendar.get(Calendar.SECOND) < 10 ? "0" : "") + calendar.get(Calendar.SECOND);
		String min = (calendar.get(Calendar.MINUTE) < 10 ? "0" : "") + calendar.get(Calendar.MINUTE);
		String hour = (calendar.get(Calendar.HOUR_OF_DAY) < 10 ? "0" : "") + calendar.get(Calendar.HOUR_OF_DAY);
		String mday = (calendar.get(Calendar.DATE) < 10 ? "0" : "") + calendar.get(Calendar.DATE);
		String mon = (calendar.get(Calendar.MONTH) < 9 ? "0" : "") + (calendar.get(Calendar.MONTH) + 1);
		String longyear = "" + calendar.get(Calendar.YEAR);
		return longyear + mon + mday + "T" + hour + min + sec + "Z";
	}

	private static void checkSVG() throws IOException {
		if (tag <= maxTag) {
			return;
		}
		File folder = new File(getWorkFolder(), "images");
		if (!folder.exists()) {
			Files.createDirectories(folder.toPath());
			File tagColors = new File(folder, "tagColors.json");
			JSONObject colors = new JSONObject();
			colors.put("background", "#009688");
			colors.put("foreground", "#ffffff");
			try (FileOutputStream out = new FileOutputStream(tagColors)) {
				out.write(colors.toString(2).getBytes(StandardCharsets.UTF_8));
			}
		}
		File f = new File(folder, tag + ".svg");
		if (!f.exists()) {
			File colorsFile = new File(folder, "tagColors.json");
			if (!colorsFile.exists()) {
				JSONObject colors = new JSONObject();
				colors.put("background", "#009688");
				colors.put("foreground", "#ffffff");
				try (FileOutputStream out = new FileOutputStream(colorsFile)) {
					out.write(colors.toString(2).getBytes(StandardCharsets.UTF_8));
				}
			}
			JSONObject colors = readJSON(colorsFile);
			int width = 16;
			if (tag >= 10) {
				width = 22;
			}
			if (tag >= 100) {
				width = 28;
			}
			String svg = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
					+ "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"" + (width + 1)
					+ "px\" height=\"17px\" version=\"1.1\">\n" + "   <g>\n"
					+ "      <rect style=\"fill:" + colors.getString("background") + "\" width=\"" + width
					+ "px\" height=\"16px\" x=\"1\" y=\"1\" rx=\"3\" ry=\"3\" />\n"
					+ "      <text style=\"font-size:12px;font-style:normal;font-weight:normal;text-align:center;font-family:Sans;\"  x=\"6\" y=\"14\" fill=\""
					+ colors.getString("foreground") + "\" fill-opacity=\"1\">\n"
					+ "         <tspan>" + tag + "</tspan>\n" + "      </text>\n" + "   </g>\n" + "</svg>";
			try (FileOutputStream out = new FileOutputStream(f)) {
				out.write(svg.getBytes(StandardCharsets.UTF_8));
			}
			maxTag = tag;
		}
	}

	private static String unquote(String string) {
		return string.replace("\"", "\u200B\u2033");
	}

	private static String cleanAngles(String string) {
		String res = string.replace("&", "&amp;");
		res = res.replace("<", "\u200B\u2039");
		res = res.replace(">", "\u200B\u203A");
		return res;
	}

	private static String restoreAngles(String string) {
		String res = string.replace("\u200B\u2039", "<");
		res = res.replace("\u200B\u203A", ">");
		res = res.replace("\u200B\u2033", "\"");
		return res.replace("&amp;", "&");
	}

	private static String getTail(Element e) {
		return "</" + e.getName() + ">";
	}

	private static String getHeader(Element e) {
		StringBuilder result = new StringBuilder();
		result.append('<');
		result.append(e.getName());
		List<Attribute> atts = e.getAttributes();
		Iterator<Attribute> it = atts.iterator();
		while (it.hasNext()) {
			Attribute a = it.next();
			result.append(' ');
			result.append(a.getName());
			result.append("=\"");
			result.append(unquote(TextUtils.cleanString(a.getValue())));
			result.append("\"");
		}
		result.append('>');
		return result.toString();
	}

	public static void resetTags() {
		maxTag = 0;
	}

	public static Map<String, String> getTags() {
		return tags;
	}

	public static String textOnly(Element seg) {
		List<XMLNode> list = seg.getContent();
		Iterator<XMLNode> it = list.iterator();
		StringBuilder text = new StringBuilder();
		while (it.hasNext()) {
			XMLNode o = it.next();
			if (o.getNodeType() == XMLNode.TEXT_NODE) {
				text.append(((TextNode) o).getText());
			} else if (o.getNodeType() == XMLNode.ELEMENT_NODE) {
				Element e = (Element) o;
				String type = e.getName();
				if (type.equals("sub") || type.equals("hi")) {
					text.append(textOnly(e));
				}
			}
		}
		return text.toString();
	}

	public static File getWorkFolder() throws IOException {
		if (workDir != null) {
			return workDir;
		}
		String os = System.getProperty("os.name").toLowerCase();
		if (os.startsWith("mac")) {
			workDir = new File(System.getProperty("user.home") + "/Library/Application Support/TMXEditor/");
		} else if (os.startsWith("windows")) {
			workDir = new File(System.getenv("AppData") + "\\TMXEditor\\");
		} else {
			workDir = new File(System.getProperty("user.home") + "/.tmxeditor/");
		}
		if (!workDir.exists()) {
			Files.createDirectories(workDir.toPath());
		}
		return workDir;
	}

	public static void deleteFiles(File file) throws IOException {
		if (file.isDirectory()) {
			File[] list = file.listFiles();
			for (int i = 0; i < list.length; i++) {
				deleteFiles(list[i]);
			}
		}
		Files.delete(file.toPath());
	}

	public static void replaceText(Element element, String search, String replace, boolean regExp) {
		List<XMLNode> newContent = new ArrayList<>();
		List<XMLNode> content = element.getContent();
		Iterator<XMLNode> it = content.iterator();
		while (it.hasNext()) {
			XMLNode node = it.next();
			if (node.getNodeType() == XMLNode.TEXT_NODE) {
				TextNode text = (TextNode) node;
				text.setText(TextUtils.replaceAll(text.getText(), search, replace, regExp));
				newContent.add(text);
			}
			if (node.getNodeType() == XMLNode.ELEMENT_NODE) {
				Element e = (Element) node;
				String type = e.getName();
				if (type.equals("sub") || type.equals("hi")) {
					replaceText((Element) node, search, replace, regExp);
				}
				newContent.add(node);
			}
		}
		element.setContent(newContent);
	}

	public static Element stripSegment(Element seg) throws SAXException, IOException, ParserConfigurationException {
		String text = textContent(seg);
		char[] array = text.toCharArray();
		for (int i = 0; i < array.length; i++) {
			char c = array[i];
			if (c == '\u00A0' || Character.isWhitespace(c)) {
				array[i] = ' ';
			} else {
				break;
			}
		}
		for (int i = array.length - 1; i >= 0; i--) {
			char c = array[i];
			if (c == '\u00A0' || Character.isWhitespace(c)) {
				array[i] = ' ';
			} else {
				break;
			}
		}
		text = "<seg>" + new String(array).strip() + "</seg>";
		if (builder == null) {
			builder = new SAXBuilder();
		}
		return builder.build(new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8))).getRootElement();
	}

	private static String textContent(Element element) {
		StringBuilder sb = new StringBuilder();
		List<XMLNode> content = element.getContent();
		Iterator<XMLNode> it = content.iterator();
		while (it.hasNext()) {
			XMLNode node = it.next();
			if (node.getNodeType() == XMLNode.TEXT_NODE) {
				TextNode t = (TextNode) node;
				sb.append(TextUtils.cleanString(t.getText()));
			}
			if (node.getNodeType() == XMLNode.ELEMENT_NODE) {
				Element e = (Element) node;
				sb.append(e.toString());
			}
		}
		return sb.toString();
	}

	public static String cleanLines(String string) {
		String result = string.replace('\n', ' ');
		return result.replace('\t', ' ');
	}

	public static String highlightExpression(String string, String expression) {
		String result = string;
		if (pattern == null || !expression.equals(lastFilterText)) {
			pattern = Pattern.compile(expression);
			lastFilterText = expression;
		}
		Matcher matcher = pattern.matcher(result);
		if (matcher.find()) {
			StringBuilder sb = new StringBuilder();
			do {
				int start = matcher.start();
				int end = matcher.end();
				sb.append(result.substring(0, start));
				sb.append("<span " + STYLE + ">");
				sb.append(result.substring(start, end));
				sb.append("</span>");
				result = result.substring(end);
				matcher = pattern.matcher(result);
			} while (matcher.find());
			sb.append(result);
			return sb.toString();
		}
		return result;
	}

}
