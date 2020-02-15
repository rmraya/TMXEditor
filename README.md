# TMXEditor

![TMXEditor logo](https://www.maxprograms.com/images/tmxeditor_s.png)

TMXEditor is an open source desktop application designed for editing TMX (Translation Memory eXchange) files on macOS, Linux or Microsoft Windows.

TMX is a standard XML-based format used for exchanging Translation Memories used by CAT (Computer Assisted Translation) tools. TMXEditor allows editing the content of multilingual TMX files.

## Licenses

TMXEditor is available in two modes:

- Personal Use of Source Code
- Commercial Installers

Source code of TMXEditor is free for personal use. You can download the source code, modify, compile and use it without limitations in your own computers. You cannot redistribute a version that you compiled or your modifications to the code.

Ready to use commercial installers are available at [TMXEditor Home Page](https://www.maxprograms.com/products/tmxeditor.html). You can try the commercial version for 30 days at no cost.

Commercial versions of TMXEditor can be installed in as many computers as desired. TMXEditor licenses are designed for use in one computer at a time and can be transferred from one computer to another in just a few seconds.

You can subscribe to [Maxprograms Support](https://groups.io/g/maxprograms/) at Groups.io and request peer assistance for the open source version there.

Commercial version includes unlimited email support at tech@maxprograms.com

## Requirements

- JDK 11 or newer is required for compiling and building. Get it from [AdoptOpenJDK](https://adoptopenjdk.net/).
- Apache Ant 1.10.7 or newer. Get it from [https://ant.apache.org/](https://ant.apache.org/)
- Node.js 12.14.0 LTS or newer. Get it from [https://nodejs.org/](https://nodejs.org/)
- TypeScript 3.7.5 or newer. Get it from [https://www.typescriptlang.org/](https://www.typescriptlang.org/)

## Building

- Checkout this repository.
- Point your `JAVA_HOME` environment variable to JDK 11
- Run `ant` to compile the Java code
- Run `npm install` to download and install NodeJS dependencies
- Run `npm start` to launch TMXEditor

### Steps for building:

``` bash
  git clone https://github.com/rmraya/TMXEditor.git
  cd TMXEditor
  ant
  npm install
  npm start
```

This video shows how to build and launch TMXEditor: [https://maxprograms.com/tutorials/TMXEditor_build.mp4](https://maxprograms.com/tutorials/TMXEditor_build.mp4)


Compile once and then simply run `npm start` to start TMXEditor
