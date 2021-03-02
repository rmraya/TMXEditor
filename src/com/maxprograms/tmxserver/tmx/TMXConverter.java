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
package com.maxprograms.tmxserver.tmx;

import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import com.maxprograms.tmxserver.Constants;
import com.maxprograms.tmxserver.excel.Sheet;
import com.maxprograms.tmxserver.utils.TextUtils;

public class TMXConverter {

	private static FileOutputStream output;

	private TMXConverter() {
		// empty for security
	}

	public static void csv2tmx(String csvFile, String tmxFile, List<String> languages, String charSet,
			String columnsSeparator, String textDelimiter, boolean fixQuotes, boolean optionalDelims)
			throws IOException {

		output = new FileOutputStream(tmxFile);

		writeString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
		writeString(
				"<!DOCTYPE tmx PUBLIC \"-//LISA OSCAR:1998//DTD for Translation Memory eXchange//EN\" \"tmx14.dtd\" >\n");
		writeString("<tmx version=\"1.4\">\n");
		writeString("  <header creationtool=\"" + Constants.APPNAME + "\" creationtoolversion=\"" + Constants.VERSION
				+ "\" srclang=\"*all*\" adminlang=\"en\" datatype=\"csv\" o-tmf=\"csv\" segtype=\"block\" />\n");
		writeString("  <body>\n");

		byte[] feff = { -1, -2 }; // UTF-16BE
		byte[] fffe = { -2, -1 }; // UTF-16LE
		byte[] efbbbf = { -17, -69, -65 }; // UTF-8

		long id = System.currentTimeMillis();
		String today = TmxUtils.tmxDate();

		boolean firstLine = true;
		try (InputStreamReader input = new InputStreamReader(new FileInputStream(csvFile), charSet)) {
			try (BufferedReader buffer = new BufferedReader(input)) {
				String line = "";
				while ((line = buffer.readLine()) != null) {
					if (firstLine) {
						byte[] array = line.getBytes(charSet);
						if (charSet.equals(StandardCharsets.UTF_16LE.name())
								&& (array[0] == fffe[0] && array[1] == fffe[1])) {
							line = line.substring(1);
						}
						if (charSet.equals(StandardCharsets.UTF_16BE.name())
								&& (array[0] == feff[0] && array[1] == feff[1])) {
							line = line.substring(1);
						}
						if (charSet.equals(StandardCharsets.UTF_8.name())
								&& (array[0] == efbbbf[0] && array[1] == efbbbf[1] && array[2] == efbbbf[2])) {
							line = line.substring(1);
						}
						firstLine = false;
					}
					writeString("    <tu creationtool=\"" + Constants.APPNAME + "\" creationtoolversion=\""
							+ Constants.VERSION + "\" tuid=\"" + (id++) + "\" creationdate=\"" + today + "\">\n");

					if (fixQuotes) {
						line = TextUtils.replaceAll(line, "\"\"", "@?@", false);
					}

					String[] parts = getParts(line, columnsSeparator, textDelimiter, optionalDelims);
					if (parts.length != languages.size()) {
						throw new IOException("Wrong number of columns. Review optional delimiters.");
					}
					for (int i = 0; i < parts.length; i++) {
						String cell = parts[i];
						if (fixQuotes) {
							cell = TextUtils.replaceAll(cell, "@?@", "\"", false);
						}
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

						writeString("      <tuv xml:lang=\"" + languages.get(i) + "\" creationdate=\"" + today
								+ "\">\n        <seg>" + TextUtils.cleanString(cell) + "</seg>\n      </tuv>\n");
					}
					writeString("    </tu>\n");
				}
			}
		}
		writeString("  </body>\n");
		writeString("</tmx>");
		output.close();
	}

	private static void writeString(String input) throws IOException {
		output.write(input.getBytes(StandardCharsets.UTF_8));
	}

	public static String[] getParts(String line, String columnsSeparator, String textDelimiter,
			boolean optionalDelims) {

		if (optionalDelims) {
			List<String> list = new ArrayList<>();
			StringBuilder string = new StringBuilder();
			boolean inDelimited = false;
			for (int i = 0; i < line.length(); i++) {
				char c = line.charAt(i);
				if (textDelimiter.equals("" + c)) {
					inDelimited = !inDelimited;
				}
				if (columnsSeparator.equals("" + c)) {
					if (!inDelimited) {
						list.add(string.toString());
						string = new StringBuilder();
					} else {
						string.append(c);
					}
					continue;
				}
				string.append(c);
			}
			if (string.length() != 0) {
				list.add(string.toString());
			}
			return list.toArray(new String[list.size()]);
		} else {
			String[] parts = TextUtils.split(line, columnsSeparator);
			if (parts.length > 1) {
				List<String> merged = new ArrayList<>();
				for (int i = 0; i < parts.length; i++) {
					String a = parts[i];
					if (!a.endsWith(textDelimiter)) {
						while (i < parts.length - 1) {
							String b = parts[i + 1];
							if (!b.startsWith(textDelimiter)) {
								String c = columnsSeparator + b;
								a = a + c;
								i++;
							} else {
								break;
							}
						}
					}
					merged.add(a);
				}
				if (parts.length != merged.size()) {
					parts = merged.toArray(new String[merged.size()]);
				}
			}
			return parts;
		}
	}

	public static void excel2tmx(String tmxFile, Sheet sheet, List<String> langs) throws IOException {
		output = new FileOutputStream(tmxFile);
		writeString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
		writeString(
				"<!DOCTYPE tmx PUBLIC \"-//LISA OSCAR:1998//DTD for Translation Memory eXchange//EN\" \"tmx14.dtd\" >\n");
		writeString("<tmx version=\"1.4\">\n");
		writeString("  <header creationtool=\"" + Constants.APPNAME + "\" creationtoolversion=\"" + Constants.VERSION
				+ "\" srclang=\"*all*\" adminlang=\"en\" datatype=\"excel\" o-tmf=\"excel\" segtype=\"block\" />\n");
		writeString("  <body>\n");

		long id = System.currentTimeMillis();
		String today = TmxUtils.tmxDate();
		List<String> columns = new ArrayList<>();
		columns.addAll(sheet.getColumns());

		for (int i = 0; i < sheet.rowsCount(); i++) {
			Map<String, String> row = sheet.getRow(i);
			if (row.size() < 2) {
				continue;
			}
			writeString("    <tu creationtool=\"" + Constants.APPNAME + "\" creationtoolversion=\"" + Constants.VERSION
					+ "\" tuid=\"" + (id++) + "\" creationdate=\"" + today + "\">\n");
			for (int j = 0; j < columns.size(); j++) {
				String cell = row.get(columns.get(j));
				writeString("      <tuv xml:lang=\"" + langs.get(j) + "\" creationdate=\"" + today
						+ "\">\n        <seg>" + TextUtils.cleanString(cell) + "</seg>\n      </tuv>\n");
			}
			writeString("    </tu>\n");
		}
		writeString("  </body>\n");
		writeString("</tmx>");
		output.close();
	}
}
