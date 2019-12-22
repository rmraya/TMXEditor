/*****************************************************************************
Copyright (c) 2018-2019 - Maxprograms,  http://www.maxprograms.com/

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to compile, 
modify and use the Software without restrictions in the computer where the 
Software has been compiled.

Redistribution of this Software in any form (source code or executable 
binaries) requires prior written permission from Maxprograms. 

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*****************************************************************************/
package com.maxprograms.tmxserver.utils;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class TextUtils {

	private static Pattern pattern;
	private static String lastTarget;

	public static String cleanString(String string) {
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
