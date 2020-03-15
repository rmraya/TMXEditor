# TMXEditor

![TMXEditor logo](https://www.maxprograms.com/images/tmxeditor_s.png)

TMXEditor is an open source desktop application designed for editing TMX (Translation Memory eXchange) files on macOS, Linux or Microsoft Windows.

TMX is a standard XML-based format used for exchanging Translation Memories used by CAT (Computer Assisted Translation) tools. TMXEditor allows editing the content of multilingual TMX files.

## Licenses

TMXEditor is available in two modes:

- Personal Use of Source Code
- Yearly Subscriptions

### Open Source

Source code of TMXEditor is free for personal use. Anyone can download the source code, compile, modify and use it at no cost in compliance with the accompanying license terms.

You can subscribe to [Maxprograms Support](https://groups.io/g/maxprograms/) at Groups.io and request peer assistance for the open source version there.

### Subscriptions

Ready to use installers and technical support for TMXEditor are available as yearly subscriptions at [Maxprograms Online Store](https://www.maxprograms.com/store/buy.html).

The version of TMXEditor included in the official installers from [TMXEditor's Home Page](https://www.maxprograms.com/products/tmxeditor.html) can be used at no cost for 7 days requesting a free Evaluation Key.

Subscription Keys are issued to be used by one person in one computer. They cannot be shared or transferred to a different machine.

Subscription version includes unlimited email support at tech@maxprograms.com

## Related Projects

- [OpenXLIFF Filters](https://github.com/rmraya/OpenXLIFF)
- [TMXValidator](https://github.com/rmraya/TMXValidator)

## Requirements

- JDK 11 or newer is required for compiling and building. Get it from [AdoptOpenJDK](https://adoptopenjdk.net/).
- Apache Ant 1.10.7 or newer. Get it from [https://ant.apache.org/](https://ant.apache.org/)
- Node.js 12.14.0 LTS or newer. Get it from [https://nodejs.org/](https://nodejs.org/)
- TypeScript 3.8.3 or newer. Get it from [https://www.typescriptlang.org/](https://www.typescriptlang.org/)

## Building

- Checkout this repository.
- Point your `JAVA_HOME` environment variable to JDK 11
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
