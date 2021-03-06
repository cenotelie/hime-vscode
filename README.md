# Hime Language Support

Adds support for the [Hime grammar language](https://cenotelie.fr/hime).

## Install and Prerequisites

Open up VS Code, hit `F1`, type `ext`, select Install Extension, type `hime-language`, hit enter and reload window to enable. 

> **Warning**: This extension requires a local installation of Java.
> Java can be installed from [Oracle](http://www.oracle.com/technetwork/java/javase/downloads/index.html),
> or from the [OpenJDK](http://openjdk.java.net/install/) project.

> **Note**: For the support of grammar compilation and testing only, this extension also requires a local installation of the .Net Framework on Windows, which should be pre-installed with  any modern distribution.
> For other OS, this extension requires a location installation of either [Mono](http://www.mono-project.com/download/) or [.Net Core Runtime 2.0.0](https://www.microsoft.com/net/download/core).

This extension looks for a local installation a Java using (in this order):

* The `hime.java` configuration of VSCode.
* The `JAVA_HOME` environment variable.
* The `PATH` environment variable.

## Features

* Syntax highlighting for the grammars.
* Detection of grammar symbols (terminals, variables, etc.) and navigation.
* Syntactic verification and other diagnostics for common issues.
* Grammar compilation from within VS Code.
* Test grammar with a the playground within VS Code.

![Hime language in action](https://cenotelie.fr/hime/captures/demo1.gif)

![Grammar playground](https://cenotelie.fr/hime/captures/demo2.gif)

## Settings

`hime.java { string }`

* The path to a location installation of Java.
* If set, this specification of Java will be used before others.

`hime.lsp.server { integrated | remote }`

* Defaults to `integrated`.
* This setting specifies which language server to use:
    * `integrated`: use of the language server embedded within this extension.
    * `remote`: connect to a remote language server (on `localhost`). The port can be configured with `hime.lsp.server.port`.

`hime.lsp.server.port { integer }`

* Specifies the port to be used to connect to a remote language server.
* This setting is only used when `hime.lsp.server` is set to `remote`.

## License

The source code to this extension is the property of the [Association Cénotélie](https://cenotelie.fr). It is available in [hime-vscode](https://bitbucket.org/cenotelie/hime-vscode) and licensed under the GNU Lesser General Public License Version 3 by the [Association Cénotélie](https://cenotelie.fr).

This extension embeds a compiled version of the Hime Language Server. The source code to the language server is available on [hime-language-server](https://bitbucket.org/cenotelie/hime-language-server) and licensed under the GNU Lesser General Public License Version 3 by the [Association Cénotélie](https://cenotelie.fr).

This extension also embeds a compiled version of the Hime Parser Generator. The source code to the generator is available on [hime](https://bitbucket.org/cenotelie/hime) and licensed under the GNU Lesser General Public License Version 3 by the [Association Cénotélie](https://cenotelie.fr).