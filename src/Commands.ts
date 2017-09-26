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

import * as Path from "path";
import * as FS from "fs";
import * as ChildProcess from "child_process";
import * as VSCode from "vscode";

/**
 * Register commands for this extension
 * @param context  The extension's content
 * @param output   The output channel to write to
 */
export function registerCommands(context: VSCode.ExtensionContext, output: VSCode.OutputChannel) {
    let disposable = VSCode.commands.registerCommand("hime.compile", (fileUri: string, grammar: string) => {
        compileGrammar(context, output, fileUri, grammar);
    });
    context.subscriptions.push(disposable);
}

/**
 * Compiles a grammar
 * @param context The extension's content
 * @param output  The output channel to write to
 * @param fileUri The URI to the file that contains the grammar
 * @param grammar The name of the grammar to compile
 */
function compileGrammar(context: VSCode.ExtensionContext, output: VSCode.OutputChannel, fileUri: string, grammar: string) {
    let himecc = Path.resolve(context.extensionPath, "target", "bin", "himecc.exe");
    let options = { cwd: VSCode.workspace.rootPath };
    var child: ChildProcess.ChildProcess = null;
    if (process.platform === "win32") {
        child = ChildProcess.spawn(himecc, [fileUri, "-g", grammar], options);
    } else {
        let mono = resolveMono();
        if (mono == null) {
            output.appendLine("[ERROR] Failed to find required Mono installation");
            return;
        }
        child = ChildProcess.spawn(mono, [himecc, fileUri, "-g", grammar], options);
    }
}

/**
 * Resolves the Mono executable
 * @return The full path to the executable if it is found, null otherwise
 */
function resolveMono(): string {
    // is the hime.mono setting defined?
    let settingMono = VSCode.workspace.getConfiguration("hime").get("mono") as string;
    if (settingMono != null && FS.existsSync(settingMono)) {
        return settingMono;
    }

    // the executable name
    let execName = (process.platform === "win32" ? "mono.exe" : "mono");
    // look in PATH variable
    let envPath = process.env["PATH"];
    if (envPath != null) {
        let directories = envPath.split(Path.delimiter);
        for (let i = 0; i != directories.length; i++) {
            let result = resolveMonoInDirectory(directories[i], execName);
            if (result != null)
                return result;
        }
    }
    return null;
}

/**
 * Tries to resolves the Mono executable in the specified directory
 * @param directory The directory to investigate
 * @param execName  The executable name to look for
 * @return The full path to the executable if it is found, null otherwise
 */
function resolveMonoInDirectory(directory: string, execName: string): string {
    let fullPath = Path.join(directory, execName);
    if (FS.existsSync(fullPath))
        return fullPath;
    fullPath = Path.join(directory, "bin", execName);
    if (FS.existsSync(fullPath))
        return fullPath;
    return null;
}