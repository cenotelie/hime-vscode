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
 * The base URI for playground virtual documents
 */
let PLAYGROUND_URI = "hime-test://authority/playground/";
/**
 * Namespace for generated code
 */
let NMSPCE = "Hime.Generated";

/**
 * Register commands for this extension
 * @param context  The extension's content
 */
export function registerCommand(context: VSCode.ExtensionContext) {
    let assetsPath = Path.resolve(context.extensionPath, "assets");

    // register UI for the compilation operation
    let provider = new PlaygroundProvider();
    let registration = VSCode.workspace.registerTextDocumentContentProvider('hime-test', provider);
    context.subscriptions.push(registration);

    // register command
    let disposable = VSCode.commands.registerCommand("hime.test", (fileUri: string, grammar: string) => {
        let playgroundId = Hime.randomString();
        let virtualDocUri = VSCode.Uri.parse(PLAYGROUND_URI + playgroundId);
        let targetPath = Path.resolve(OS.tmpdir(), playgroundId);
        FS.mkdirSync(targetPath);
        let playground = new Playground(context, provider, playgroundId, grammar);
        provider.register(playground);
        return VSCode.commands.executeCommand("vscode.previewHtml", virtualDocUri, VSCode.ViewColumn.Two, grammar + " Test").then((success) => {
            Hime.compileGrammar(context, fileUri, grammar, playground, ["-o:assembly", "-a:public", "-n", NMSPCE, "-p", targetPath]);
        }, (reason) => {
            VSCode.window.showErrorMessage(reason);
        });
    });
    context.subscriptions.push(disposable);

    let disposable2 = VSCode.commands.registerCommand("hime.doTryParse", (playgroundId: string, input: string) => {
        provider.doTryParse(playgroundId, input);
    });
    context.subscriptions.push(disposable2);
}

/**
 * Represents a playground for testing a grammar
 */
class Playground implements Hime.ProcessObserver {
    /**
     * The extension's content
     */
    private context: VSCode.ExtensionContext;
    /**
     * The parent document provider
     */
    private parent: PlaygroundProvider;
    /**
     * The unique identifier of this playground
     */
    public identifier: string;
    /**
     * The name of the grammar to test
     */
    private grammar: string;
    /**
     * The current state of this operation
     */
    private state: string;
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
     * The input that is being parsed
     */
    private input: string;
    /**
     * The parse result for the input
     */
    private result: Hime.ParseResult;

    /**
     * Gets the URI for the corresponding virtual document
     */
    public get virtualDocUri(): VSCode.Uri {
        return VSCode.Uri.parse(PLAYGROUND_URI + this.identifier);
    }

    /**
     * Gets the path to the extension's assets
     */
    private get assetsPath(): string {
        return Path.resolve(this.context.extensionPath, "assets");
    }

    /**
     * Gets the path to the target binaries for this folder
     */
    private get targetPath(): string {
        return Path.resolve(OS.tmpdir(), this.identifier);
    }


    /**
     * Initializes this observer
     * @param context     The extension's content
     * @param parent      The parent document provider
     * @param identifier  The unique identifier of this playground
     * @param grammar     The name of the grammar to test
     */
    constructor(context: VSCode.ExtensionContext, parent: PlaygroundProvider, identifier: string, grammar: string) {
        this.context = context;
        this.parent = parent;
        this.identifier = identifier;
        this.grammar = grammar;
        this.state = "building";
        this.messages = [];
        this.isFinished = false;
        this.isOnError = false;
        this.input = "";
        this.result = null;
    }

    public onLog(message: string): void {
        this.messages = this.messages.concat(message);
        this.isOnError = this.isOnError || message.indexOf("[ERROR]") == 0;
        this.parent.update(this);
    }

    public onFinished(): void {
        this.isFinished = true;
        this.state = this.isOnError ? "builderror" : "ready";
        this.parent.update(this);
    }

    /**
     * Gets the HTML document for the corresponding operation
     * @return The HTML document
     */
    public getDocument(): string {
        let document = FS.readFileSync(this.assetsPath + "/pagePlayground.html", "utf8");
        let data = {
            assetsPath: "file://" + this.assetsPath + "/",
            playgroundId: this.identifier,
            state: this.state,
            messages: this.messages,
            input: this.input,
            result: this.result
        };
        return document.replace("var DATA = null;", "var DATA = " + JSON.stringify(data) + ";");
    }

    /**
     * Tries to parse the specified input
     * @param input The input to parse
     */
    public doTryParse(input: string): void {
        if (this.state != "ready")
            return;
        this.state = "parsing";
        this.input = input;
        this.parent.update(this);
        Hime.parseInput(this.context, Path.resolve(this.targetPath, this.grammar + ".dll"), NMSPCE + "." + this.grammar + "Parser", input).then((result) => {
            this.state = "ready";
            this.result = result;
            this.parent.update(this);
        }, (reason) => {
            VSCode.window.showErrorMessage(reason);
        });
    }
}


/**
 * Dictionary of playgrounds
 */
interface IHash {
    [details: string]: Playground;
}

/**
 * Implementation of a provider of virtual documents for playgrounds
 */
class PlaygroundProvider implements VSCode.TextDocumentContentProvider {
    /**
     * The event emitter for updates
     */
    private _onDidChange = new VSCode.EventEmitter<VSCode.Uri>();
    /**
     * The known playgrounds by URI of their virtual documents
     */
    private playgrounds: IHash = {};

    get onDidChange(): VSCode.Event<VSCode.Uri> {
        return this._onDidChange.event;
    }

    /**
     * Registers a new playground
     * @param playground The playground to register
     */
    public register(playground: Playground) {
        this.playgrounds[PLAYGROUND_URI + playground.identifier] = playground;
    }

    /**
     * When the status of a playground has been updated
     * @param playground The updated playground
     */
    public update(playground: Playground) {
        this._onDidChange.fire(playground.virtualDocUri);
    }

    public provideTextDocumentContent(uri: VSCode.Uri): string {
        let observer = this.playgrounds[uri.toString()];
        if (observer == null)
            return "<html lang='en'><body>Unknown playground!</body></html>"
        return observer.getDocument();
    }

    /**
     * Tries to parse the input for a generated parser within a  playground
     * @param playgroundId   The identifier of the requesting playground
     * @param input The input to try to parse
     */
    public doTryParse(playgroundId: string, input: string) {
        let playground = this.playgrounds[PLAYGROUND_URI + playgroundId];
        if (playground == null)
            return;
        playground.doTryParse(input);
    }
}