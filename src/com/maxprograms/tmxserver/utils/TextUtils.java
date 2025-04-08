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

package com.maxprograms.tmxserver.utils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TextUtils {

	private static Pattern pattern;
	private static String lastTarget;

	private TextUtils() {
		// empty for security
	}

	public static String cleanString(String string) {
		if (string == null) {
			return "";
		}
		return string.replace("&", "&amp;").replace("<", "&lt;");
	}

	public static String cleanQuote(String string) {
		return string.replace("\"", "&quot;");
	}

	public static String replaceAll(String string, String target, String replacement, boolean regExp) {
		String source = string;
		if (regExp) {
			if (pattern == null || !target.equals(lastTarget)) {
				pattern = Pattern.compile(target);
				lastTarget = target;
			}
			Matcher matcher = pattern.matcher(string);
			StringBuffer sb = new StringBuffer();
			while (matcher.find()) {
				matcher.appendReplacement(sb, replacement);
			}
			matcher.appendTail(sb);
			return sb.toString();
		}
		int start = source.indexOf(target);
		while (start != -1) {
			source = source.substring(0, start) + replacement + source.substring(start + target.length());
			start += replacement.length();
			start = source.indexOf(target, start);
		}
		return source;
	}

	public static String[] split(String string, String separator) {
		List<String> parts = new ArrayList<>();
		String text = string;
		int index = text.indexOf(separator);
		while (index != -1) {
			parts.add(text.substring(0, index));
			text = text.substring(index + separator.length());
			index = text.indexOf(separator);
		}
		parts.add(text);
		return parts.toArray(new String[parts.size()]);
	}

	public static String padding(int level, int numSpaces) {
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < (level * numSpaces); i++) {
			sb.append(' ');
		}
		return sb.toString();
	}
}
