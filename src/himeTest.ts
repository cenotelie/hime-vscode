'use strict';

/*******************************************************************************
* Copyright (c) 2017 Association Cénotélie (cenotelie.fr)
* This program is free software: you can redistribute it and/or modify
* it under the terms of the GNU Lesser General Public License as
* published by the Free Software Foundation, either version 3
* of the License, or (at your option) any later version.
*
* This program is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU Lesser General Public License for more details.
*
* You should have received a copy of the GNU Lesser General
* Public License along with this program.
* If not, see <http://www.gnu.org/licenses/>.
******************************************************************************/

import * as VSCode from "vscode";
import * as OS from "os";
import * as Path from "path";
import * as FS from "fs";
import * as Hime from "./hime";

/**
 * Register commands for this extension
 * @param context  The extension's content
 */
export function registerCommand(context: VSCode.ExtensionContext) {
    let assetsPath = Path.resolve(context.extensionPath, "assets");

    // register UI for the compilation operation
    let virtualDocProvider = new MyDocProvider();
    let registration = VSCode.workspace.registerTextDocumentContentProvider('hime-test', virtualDocProvider);
    context.subscriptions.push(registration);

    // register command
    let disposable = VSCode.commands.registerCommand("hime.test", (fileUri: string, grammar: string) => {
        let virtualDocUri = VSCode.Uri.parse("hime-test://authority/grammar-test/" + Math.random().toString());
        return VSCode.commands.executeCommand("vscode.previewHtml", virtualDocUri, VSCode.ViewColumn.Two, grammar + " Test").then((success) => {
            Hime.compileGrammar(context, fileUri, grammar, new MyObserver(assetsPath, virtualDocUri, virtualDocProvider), ["-o:assembly"]);
        }, (reason) => {
            VSCode.window.showErrorMessage(reason);
        });
    });
    context.subscriptions.push(disposable);

    let disposable2 = VSCode.commands.registerCommand("hime.doTryParse", (virtualDocUri: string, input: string) => {
        virtualDocProvider.doTryParse(VSCode.Uri.parse(virtualDocUri), input);
    });
    context.subscriptions.push(disposable2);
}

/**
 * An observer of a compilation operation
 */
class MyObserver implements Hime.ProcessObserver {
    /**
     * Path to the assets
     */
    private assetsPath: string;
    /**
     * The URI for the corresponding virtual document
     */
    public virtualDocUri: VSCode.Uri;
    /**
     * The document provider to notify for updates
     */
    private documentProvider: MyDocProvider;
    /**
     * The compilation messages
     */
    private messages: string[];
    /**
     * Whether the operation finished
     */
    private isFinished: boolean;
    /**
     * Whether errors have been emitted by the compilation operation
     */
    private isOnError: boolean;
    /**
     * The current state of this operation
     */
    private state: string;

    /**
     * Initializes this observer
     * @param assetsPath       Path to the assets
     * @param virtualDocUri    The URI for the corresponding virtual document
     * @param documentProvider The document provider to notify for updates
     */
    constructor(assetsPath: string, virtualDocUri: VSCode.Uri, documentProvider: MyDocProvider) {
        this.assetsPath = assetsPath;
        this.virtualDocUri = virtualDocUri;
        this.documentProvider = documentProvider;
        this.messages = [];
        this.isFinished = false;
        this.isOnError = false;
        this.state = "building";
    }

    public onLog(message: string): void {
        this.messages = this.messages.concat(message);
        this.isOnError = this.isOnError || message.indexOf("[ERROR]") == 0;
        this.documentProvider.update(this);
    }

    public onFinished(): void {
        this.isFinished = true;
        this.state = this.isOnError ? "builderror" : "ready";
        this.documentProvider.update(this);
    }

    /**
     * Gets the HTML document for the corresponding operation
     * @return The HTML document
     */
    public getDocument(): string {
        let document = FS.readFileSync(this.assetsPath + "/pagePlayground.html", "utf8");
        document = document.replace("var ROOT = \"\";", "var ROOT = \"file://" + this.assetsPath + "/\";");
        document = document.replace("var DOCID = \"\";", "var DOCID = \"" + this.virtualDocUri.toString() + "\";");
        document = document.replace("var STATE = \"\";", "var STATE = \"" + this.state + "\";");
        document = document.replace("var BUILD = [];", "var BUILD = " + JSON.stringify(this.messages) + ";");
        document = document.replace("var COMMAND = \"\";", "var COMMAND = \"\";");
        return document;
    }

    /**
     * Tries to parse the specified input
     * @param input The input to parse
     */
    public doTryParse(input: string): void {
        if (this.state != "ready")
            return;
        
    }
}

interface IHash {
    [details: string]: MyObserver;
}

class MyDocProvider implements VSCode.TextDocumentContentProvider {
    /**
     * The event emitter for updates
     */
    private _onDidChange = new VSCode.EventEmitter<VSCode.Uri>();
    /**
     * The compilation tasks going on
     */
    private tasks: IHash = {};

    get onDidChange(): VSCode.Event<VSCode.Uri> {
        return this._onDidChange.event;
    }

    /**
     * When a compilation operation has been updated
     * @param observer The updated observer 
     */
    public update(observer: MyObserver) {
        this.tasks[observer.virtualDocUri.toString()] = observer;
        this._onDidChange.fire(observer.virtualDocUri);
    }

    public provideTextDocumentContent(uri: VSCode.Uri): string {
        let observer = this.tasks[uri.toString()];
        if (observer == null)
            return "<html lang='en'><body>Unknown compilation operation!</body></html>"
        return observer.getDocument();
    }

    /**
     * Tries to parse the input for a generated parser
     * @param uri   The URI of the corresponding virtual document
     * @param input The input to try to parse
     */
    public doTryParse(uri: VSCode.Uri, input: string) {
        let observer = this.tasks[uri.toString()];
        if (observer == null)
            return;
        observer.doTryParse(input);
    }
}