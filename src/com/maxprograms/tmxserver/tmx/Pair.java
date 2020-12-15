/*****************************************************************************
Copyright (c) 2018-2020 - Maxprograms,  http://www.maxprograms.com/

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

public class Pair implements Comparable<Pair> {

	private String id;
	private String text;

	public Pair(String id, String text) {
		this.id = id;
		this.text = text;
	}

	@Override
	public int compareTo(Pair o) {
		return text.compareTo(o.getText());
	}

	public String getId() {
		return id;
	}

	public String getText() {
		return text;
	}

	@Override
	public boolean equals(Object obj) {
		if (obj instanceof Pair) {
			Pair p = (Pair) obj;
			if (id != null && text != null) {
				return id.equals(p.getId()) && text.equals(p.getText());
			}
		}
		return false;
	}

	@Override
	public int hashCode() {
		return 17 * id.hashCode() * text.hashCode();
	}

	@Override
	public String toString() {
		return id.concat(" => ").concat(text);
	}
}
