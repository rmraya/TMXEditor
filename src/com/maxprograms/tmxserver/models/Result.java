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
package com.maxprograms.tmxserver.models;

import java.io.Serializable;
import java.util.List;

public class Result<D> implements Serializable {

	private static final long serialVersionUID = -6274351278821214205L;

	public static final String SUCCESS = "Success";
	public static final String ERROR = "Error";
	public static final String CANCELLED = "Cancelled";
	public static final String EMAIL_ERROR = "Email Error";
	public static final String NOT_REGISTERED = "NOT REGISTERED";
	public static final String COMPLETED = "Completed";

	private List<D> data = null;
	private String result = "";
	private String msg = "";

	public void setData(List<D> values) {
		data = values;
	}

	public void setResult(String value) {
		result = value;
	}

	public void setMessage(String value) {
		msg = value;
	}

	public List<D> getData() {
		return data;
	}

	public String getResult() {
		return result;
	}

	public String getMessage() {
		return msg;
	}

}
