# TMXEditor

TMXEditor is an open source desktop application for viewing and editing TMX (Translation Memory eXchange) files.

It supports multilingual translation memories and is designed to handle very large TMX files, including files with millions of translation units.

TMXEditor is actively maintained and used in real-world translation workflows.

## Who is this for

For translators and engineers working with large TMX files who need reliable editing, validation, and conversion tools without size limitations.

## Features

- Open and edit TMX files
- Handle very large TMX files (millions of translation units)
- Validate TMX structure and content
- Merge and split TMX files
- Manage languages in multilingual memories
- Convert Excel or CSV data to TMX

## Convert Excel or CSV to TMX

A common use case is building translation memories from existing data: TMXEditor can convert spreadsheet data (Excel or CSV) into TMX format, allowing you to build translation memories from existing data.

<a href="https://www.maxprograms.com/tutorials/CSVtoTMX.mp4"><img src="https://www.maxprograms.com/images/CSVtoTMX.png"></a>

## Quick Start

- Download ready-to-use installers from the [TMXEditor Home Page](https://maxprograms.com/products/tmxeditor.html)
- Or build from source following the instructions below

## Licenses

TMXEditor is open source. Prebuilt installers and support are available via subscription.

TMXEditor is available in two modes:

- Source Code
- Yearly Subscriptions for installers and support

### Source Code

Source code of TMXEditor is free. Anyone can download the source code, compile, modify and use it at no cost in compliance with the accompanying license terms.

You can subscribe to [Maxprograms Support](https://groups.io/g/maxprograms/) at Groups.io and request peer assistance for the source code version there.

### Subscriptions

Ready to use installers and technical support for TMXEditor are available as yearly subscriptions at [Maxprograms Online Store](https://www.maxprograms.com/store/buy.html).

The version of TMXEditor included in the official installers from [TMXEditor's Home Page](https://www.maxprograms.com/products/tmxeditor.html) can be used at no cost for 7 days requesting a free Evaluation Key.

Subscription Keys cannot be shared or transferred to different machines.

Installers may occasionally be updated before the corresponding source code changes appear in this repository. Source code updates are published later, once they are ready for release. This timing difference is expected and does not affect the availability or completeness of the open source code.

Subscription version includes unlimited email support at <tech@maxprograms.com>

### Differences sumary

Differences | Source Code | Subscription Based
-|----------- | -------------
Ready To Use Installers| No | Yes
Notarized macOS launcher| No | Yes
Signed launcher and installer for Windows | No | Yes
Associate app with `.tmx` extension | No | Yes
Restricted Features | None | None
Technical Support |  Peer support at  [Groups.io](https://groups.io/g/maxprograms/)| - Direct email at <tech@maxprograms.com>  <br> - Peer support at [Groups.io](https://groups.io/g/maxprograms/)

## Related Projects

- [XMLJava](https://github.com/rmraya/XMLJava)
- [TMXValidator](https://github.com/rmraya/TMXValidator)

## Requirements

- JDK 21 or newer is required for compiling and building. Get it from [Adoptium](https://adoptium.net/).
- Gradle 9.2 or newer. Get it from [https://gradle.org/](https://gradle.org/)
- Node.js 24.13.0 LTS or newer. Get it from [https://nodejs.org/](https://nodejs.org/)

## Building

Building from source is only required if you want to modify the application.

- Checkout this repository
- Point your `JAVA_HOME` environment variable to JDK 21
- Run `gradle` to compile the Java code
- Run `npm install` to download and install NodeJS dependencies
- Run `npm start` to launch TMXEditor

### Steps for building

``` bash
  git clone https://github.com/rmraya/TMXEditor.git
  cd TMXEditor
  gradle
  npm install
  npm start
```

Compile once and then simply run `npm start` to start TMXEditor
