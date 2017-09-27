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
import * as Himecc from "./Himecc";

/**
 * Register commands for this extension
 * @param context  The extension's content
 */
export function registerCommand(context: VSCode.ExtensionContext) {
    let disposable = VSCode.commands.registerCommand("hime.compile", (fileUri: string, grammar: string) => {
        Himecc.compileGrammar(context, fileUri, grammar, new MyObserver(), []);
    });
    context.subscriptions.push(disposable);
}

class MyObserver implements Himecc.CompilationObserver {
    onLog(message: string): void {
        
    }
    onFinished(): void {
        
    }
}