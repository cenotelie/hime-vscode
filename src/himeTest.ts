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
import * as Path from "path";
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
            Hime.compileGrammar(context, fileUri, grammar, new MyObserver(assetsPath, virtualDocUri, virtualDocProvider), []);
        }, (reason) => {
            VSCode.window.showErrorMessage(reason);
        });
    });
    context.subscriptions.push(disposable);
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
    }

    public onLog(message: string): void {
        this.messages = this.messages.concat(message);
        this.isOnError = this.isOnError || message.indexOf("[ERROR]") == 0;
        this.documentProvider.update(this);
    }

    public onFinished(): void {
        this.isFinished = true;
        this.documentProvider.update(this);
    }

    /**
     * Gets the HTML document for the corresponding operation
     * @return The HTML document
     */
    public getDocument(): string {
        var content = "<html lang='en'><body style='width: 100%;'>";
        for (var index in this.messages) {
            let message = this.messages[index];
            content += "<img width='30px' src='file://";
            content += this.assetsPath + "/message-";
            if (message.indexOf("[INFO]") == 0)
                content += "info";
            else if (message.indexOf("[WARNING]") == 0)
                content += "warning";
            else if (message.indexOf("[ERROR]") == 0)
                content += "error";
            content += ".svg'/><span>";
            content += message;
            content += "</span><br/>";
        }
        content += "<br/>";
        if (!this.isFinished) {
            content += "<img width='50px' src='file://";
            content += this.assetsPath + "/spinner.gif";
            content += "'/> Compilation is ongoing ...";
        } else if (this.isOnError) {
            content += "<img width='50px' src='file://";
            content += this.assetsPath + "/result-failed.svg";
            content += "'/> Compilation failed!";
        } else {
            content += "<img width='50px' src='file://";
            content += this.assetsPath + "/result-ok.svg";
            content += "'/> OK";
        }
        content += "</body></html>";
        return content;
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
}