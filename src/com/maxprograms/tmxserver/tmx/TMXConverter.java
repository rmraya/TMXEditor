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
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;

import com.maxprograms.tmxserver.Constants;
import com.maxprograms.tmxserver.utils.TextUtils;

public class TMXConverter {

	private static FileOutputStream output;

	private TMXConverter() {
		// empty for security
	}

	public static void csv2tmx(String csvFile, String tmxFile, List<String> languages, String charSet,
			String columsSeparator, String textDelimiter) throws IOException {
		
		output = new FileOutputStream(tmxFile);
		
		writeString("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n"); 
        writeString("<!DOCTYPE tmx PUBLIC \"-//LISA OSCAR:1998//DTD for Translation Memory eXchange//EN\" \"tmx14.dtd\" >\n"); //$NON-NLS-1$
        writeString("<tmx version=\"1.4\">\n"); 
		writeString("  <header \n" + 
				"      creationtool=\"TMXEditor\" \n" + 
				"      creationtoolversion=\"" + 
				Constants.VERSION +
				"\"  \n" + 
				"      srclang=\"*all*\" \n" + 
				"      adminlang=\"en\"  \n" + 
				"      datatype=\"csv\" \n" + 
				"      o-tmf=\"csv\" \n" + 
				"      segtype=\"block\"\n" + 
				"  />\n"); 
		writeString("  <body>\n");
		
		byte[] feff = {-1,-2};           // UTF-16BE
		byte[] fffe = {-2,-1};           // UTF-16LE
		byte[] efbbbf = {-17,-69, -65};  // UTF-8
		
		long id = System.currentTimeMillis();
		String today = TmxUtils.tmxDate();
		
		boolean firstLine = true;
		try (InputStreamReader input = new InputStreamReader(new FileInputStream(csvFile),charSet)) {
			try (BufferedReader buffer = new BufferedReader(input)) {
				String line = ""; 
				while ((line = buffer.readLine()) != null) {
					if (firstLine) {
						byte[] array = line.getBytes(charSet);
						if (charSet.equals(StandardCharsets.UTF_16LE.name()) && (array[0] == fffe[0] && array[1] == fffe[1])) {
							line = line.substring(1);
						} 
						if (charSet.equals(StandardCharsets.UTF_16BE.name()) && (array[0] == feff[0] && array[1] == feff[1])) {
							line = line.substring(1);
						}
						if (charSet.equals(StandardCharsets.UTF_8.name()) && (array[0] == efbbbf[0] && array[1] == efbbbf[1] && array[2] == efbbbf[2])) {
							line = line.substring(1);
						}
						firstLine = false;
					}
		            writeString("    <tu creationtool=\"TMXEditor\" creationtoolversion=\"" 
		                    + Constants.VERSION 
		                    + "\" tuid=\"" + (id++) + "\" creationdate=\""+ today +"\">\n");  
					String[] parts = TextUtils.split(line,columsSeparator); 
					for (int i=0 ; i<parts.length ; i++) {
						String cell = parts[i];
						if (!textDelimiter.isEmpty()) {
							cell = cell.substring(1);
							cell = cell.substring(0, cell.length()-1);
						}
						writeString("      <tuv xml:lang=\"" + languages.get(i) + "\" creationdate=\""+ today +"\">\n        <seg>" 
		                        + TextUtils.cleanString(cell) + "</seg>\n      </tuv>\n");
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
}
