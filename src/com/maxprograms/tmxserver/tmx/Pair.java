/*******************************************************************************
 * Copyright (c) 2018-2021 Maxprograms.
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
