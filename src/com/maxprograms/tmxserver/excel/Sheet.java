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
