/*****************************************************************************
Copyright (c) 2018-2019 - Maxprograms,  http://www.maxprograms.com/

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
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.StringTokenizer;
import java.util.logging.Level;
import java.util.logging.Logger;

import com.maxprograms.xml.XMLUtils;

public class TMXCleaner {

	protected static final Logger LOGGER = Logger.getLogger(TMXCleaner.class.getName());

	public static void clean(String name) throws IOException {
		String encoding = getXMLEncoding(name);
		try (InputStreamReader input = new InputStreamReader(new FileInputStream(name), encoding)) {
			try (BufferedReader buffer = new BufferedReader(input)) {
				try (FileOutputStream output = new FileOutputStream(name + ".tmp")) {
					String line = buffer.readLine();
					while (line != null) {
						line = checkEntities(line);
						line = XMLUtils.validChars(line) + "\n";
						output.write(line.getBytes(encoding));
						line = buffer.readLine();
					}
				}
			}
		}
		String backup = name + ".bak";
		if (name.indexOf(".") != -1 && name.lastIndexOf(".") < name.length()) {
			backup = name.substring(0, name.lastIndexOf(".")) + ".~" + name.substring(name.lastIndexOf(".") + 1);
		}
		File f = new File(backup);
		if (f.exists()) {
			Files.delete(Paths.get(f.toURI()));
		}
		File original = new File(name);
		if (!original.renameTo(f)) {
			throw new IOException("Error creating backup");
		}
		File ok = new File(name + ".tmp");
		original = null;
		original = new File(name);
		if (!ok.renameTo(original)) {
			throw new IOException("Error renaming cleaned file");
		}
	}

	private static String checkEntities(String string) {
		String result = string;
		int index = result.indexOf("&#");
		if (index == -1) {
			return result;
		}
		while (index != -1) {
			int end = result.indexOf(";", index);
			if (end != -1) {
				String start = result.substring(0, index);
				String entity = result.substring(index, end + 1);
				String rest = result.substring(end + 1);
				result = start + replaceEntity(entity) + rest;
			}
			index = result.indexOf("&#", index + 1);
		}
		return result;
	}

	private static String replaceEntity(String entity) {
		String code = entity.substring(3, entity.length() - 1);
		int c = Integer.valueOf(code, 16).intValue();
		if (!(c >= '\u007F' && c <= '\u0084') || (c >= '\u0086' && c <= '\u009F') || (c >= '\uFDD0' && c <= '\uFDDF')) {
			return "";
		}
		return ((char) c) + "";
	}

	private static String getXMLEncoding(String fileName) {
		// return UTF-8 as default
		String result = StandardCharsets.UTF_8.name();
		try {
			// check if there is a BOM (byte order mark)
			// at the start of the document
			byte[] array = new byte[2];
			try (FileInputStream inputStream = new FileInputStream(fileName)) {
				int bytes = inputStream.read(array);
				if (bytes == -1) {
					throw new IOException("Error reading BOM from " + fileName);
				}
			}
			byte[] lt = "<".getBytes();
			byte[] feff = { -1, -2 };
			byte[] fffe = { -2, -1 };
			if (array[0] != lt[0]) {
				// there is a BOM, now check the order
				if (array[0] == fffe[0] && array[1] == fffe[1]) {
					return StandardCharsets.UTF_16BE.name();
				}
				if (array[0] == feff[0] && array[1] == feff[1]) {
					return StandardCharsets.UTF_16LE.name();
				}
			}
			// check declared encoding
			String line = "";
			try (FileReader input = new FileReader(fileName); BufferedReader buffer = new BufferedReader(input)) {
				line = buffer.readLine();
			}
			if (line.startsWith("<?")) {
				line = line.substring(2, line.indexOf("?>"));
				line = line.replaceAll("\'", "\"");
				StringTokenizer tokenizer = new StringTokenizer(line);
				while (tokenizer.hasMoreTokens()) {
					String token = tokenizer.nextToken();
					if (token.startsWith("encoding")) {
						result = token.substring(token.indexOf("\"") + 1, token.lastIndexOf("\""));
					}
				}
			}
		} catch (Exception e) {
			LOGGER.log(Level.SEVERE, e.getMessage(), e);
		}
		if (result.equalsIgnoreCase("utf-8")) {
			result = StandardCharsets.UTF_8.name();
		}
		return result;
	}

}
