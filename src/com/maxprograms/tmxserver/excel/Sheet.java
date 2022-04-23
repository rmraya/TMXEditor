/*******************************************************************************
 * Copyright (c) 2018-2022 Maxprograms.
 *
 * This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License 1.0
 * which accompanies this distribution, and is available at
 * https://www.eclipse.org/org/documents/epl-v10.html
 *
 * Contributors:
 *     Maxprograms - initial API and implementation
 *******************************************************************************/

package com.maxprograms.tmxserver.excel;

import java.util.List;
import java.util.Map;
import java.util.Set;

public class Sheet {
    
    private String name;
    private Set<String> cols;
    private List<Map<String, String>> data;

    public Sheet(String name, Set<String> cols, List<Map<String, String>> data) {
        this.name = name;
        this.cols = cols;
        this.data = data;
    }

    public String getName() {
        return name;
    }

    public Set<String> getColumns() {
        return cols;
    }
    
    public int rowsCount() {
        return data.size();
    }

    public Map<String, String> getRow(int index) {
        return data.get(index);
    }
}
