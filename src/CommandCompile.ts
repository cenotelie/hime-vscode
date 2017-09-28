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
import * as Himecc from "./Himecc";

/**
 * Register commands for this extension
 * @param context  The extension's content
 * @param output   The output channel to use
 */
export function registerCommand(context: VSCode.ExtensionContext, output: VSCode.OutputChannel) {
    // register command
    let disposable = VSCode.commands.registerCommand("hime.compile", (fileUri: string, grammar: string) => {
        VSCode.window.withProgress({
                location: VSCode.ProgressLocation.Window,
                title: "Comiling grammar " + grammar
            },
            progress => {
                return new Promise((resolve, reject) => {
                    Himecc.compileGrammar(context, fileUri, grammar, new MyObserver(output, progress, resolve), []);
                    resolve();
                });
            }
        );
    });
    context.subscriptions.push(disposable);
}

/**
 * An observer of a compilation operation
 */
class MyObserver implements Himecc.CompilationObserver {
    /**
     * The output channel for the operation
     */
    private output: VSCode.OutputChannel;
    /**
     * The progress report for the UI
     */
    private progress: VSCode.Progress<{message?: string}>;
    /**
     * The resolve callback to callat the end
     */
    private resolve: (value?: {} | Thenable<{}>) => void;
    /**
     * Whether errors have been emitted by the compilation operation
     */
    private isOnError: boolean;

    /**
     * Initializes this observer
     * @param output   The output channel for the operation
     * @param progress The progress report for the UI
     * @param resolve  The resolve callback to callat the end
     */
    constructor(output: VSCode.OutputChannel, progress: VSCode.Progress<{message?: string}>, resolve: (value?: {} | Thenable<{}>) => void) {
        this.output = output;
        this.progress = progress;
        this.resolve = resolve;
        this.isOnError = false;
    }

    public onLog(message: string): void {
        this.isOnError = this.isOnError || message.indexOf("[ERROR]") == 0;
        this.output.append(message);
        this.progress.report({message: message});
    }

    public onFinished(): void {
        this.resolve({
            message: this.isOnError ? "Failed!" : "OK!"
        });
    }
}