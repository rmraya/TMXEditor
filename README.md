# TMXEditor

![TMXEditor logo](https://www.maxprograms.com/images/tmxeditor_s.png)

TMXEditor is an open source desktop application designed for editing TMX (Translation Memory eXchange) files on macOS, Linux or Microsoft Windows.

TMX is a standard XML-based format used for exchanging Translation Memories used by CAT (Computer Assisted Translation) tools. TMXEditor allows editing the content of multilingual TMX files.

## Convert Excel to TMX with TMXEditor

<a href="https://www.maxprograms.com/tutorials/CSVtoTMX.mp4"><img src="https://www.maxprograms.com/images/CSVtoTMX.png"></a>

## Licenses

TMXEditor is available in two modes:

- Source Code
- Yearly Subscriptions for installers and support

### Source Code

Source code of TMXEditor is free. Anyone can download the source code, compile, modify and use it at no cost in compliance with the accompanying license terms.

You can subscribe to [Maxprograms Support](https://groups.io/g/maxprograms/) at Groups.io and request peer assistance for the source code version there.

### Subscriptions

Ready to use installers and technical support for TMXEditor are available as yearly subscriptions at [Maxprograms Online Store](https://www.maxprograms.com/store/buy.html).

The version of TMXEditor included in the official installers from [TMXEditor's Home Page](https://www.maxprograms.com/products/tmxeditor.html) can be used at no cost for 7 days requesting a free Evaluation Key.

Subscription version includes unlimited email support at tech@maxprograms.com

### Differences sumary

Differences | Source Code | Subscription Based
-|----------- | -------------
Ready To Use Installers| No | Yes
Notarized macOS launcher| No | Yes
Signed launcher and installer for Windows | No | Yes
Associate app with `.tmx` extension | No | Yes
Restricted Features | None | None
Technical Support |  Peer support at  [Groups.io](https://groups.io/g/maxprograms/)| - Direct email at tech@maxprograms.com  <br> - Peer support at [Groups.io](https://groups.io/g/maxprograms/)

## Related Projects

- [OpenXLIFF Filters](https://github.com/rmraya/OpenXLIFF)
- [TMXValidator](https://github.com/rmraya/TMXValidator)

## Requirements

- JDK 17 or newer is required for compiling and building. Get it from [Adoptium](https://adoptium.net/).
- Apache Ant 1.10.10 or newer. Get it from [https://ant.apache.org/](https://ant.apache.org/)
- Node.js 16.13.0 LTS or newer. Get it from [https://nodejs.org/](https://nodejs.org/)
- TypeScript 4.8.4. get it from [https://www.typescriptlang.org/](https://www.typescriptlang.org/)

## Building

- Checkout this repository.
- Point your `JAVA_HOME` environment variable to JDK 17
- Run `ant` to compile the Java code
- Run `npm install` to download and install NodeJS dependencies
- Run `npm start` to launch TMXEditor

### Steps for building

``` bash
  git clone https://github.com/rmraya/TMXEditor.git
  cd TMXEditor
  ant
  npm install
  npm start
```

This video shows how to build and launch TMXEditor: [https://maxprograms.com/tutorials/TMXEditor_build.mp4](https://maxprograms.com/tutorials/TMXEditor_build.mp4)

Compile once and then simply run `npm start` to start TMXEditor
