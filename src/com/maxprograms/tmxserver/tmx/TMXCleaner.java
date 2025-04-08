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
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.util.logging.Logger;

import com.maxprograms.xml.XMLUtils;

public class TMXCleaner {

	protected static final Logger LOGGER = Logger.getLogger(TMXCleaner.class.getName());

	private TMXCleaner() {
		// empty for security
	}

	public static void clean(String name) throws IOException {
		String encoding = XMLUtils.getXMLEncoding(name);
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
		if (name.indexOf('.') != -1 && name.lastIndexOf('.') < name.length()) {
			backup = name.substring(0, name.lastIndexOf('.')) + ".~" + name.substring(name.lastIndexOf('.') + 1);
		}
		File f = new File(backup);
		Files.deleteIfExists(f.toPath());
		File original = new File(name);
		if (!original.renameTo(f)) {
			throw new IOException(Messages.getString("TMXCleaner.0"));
		}
		File ok = new File(name + ".tmp");
		original = null;
		original = new File(name);
		if (!ok.renameTo(original)) {
			throw new IOException(Messages.getString("TMXCleaner.1"));
		}
	}

	private static String checkEntities(String string) {
		String result = string;
		int index = result.indexOf("&#");
		if (index == -1) {
			return result;
		}
		while (index != -1) {
			int end = result.indexOf(';', index);
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

}
