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
import * as ChildProcess from "child_process";
import { Readable } from 'stream';
import * as Net from "net";
import { LanguageClient, LanguageClientOptions, StreamInfo } from "vscode-languageclient";

/**
 * Creates a new language client for this extension
 * @param context  The extension's content
 * @return The language client
 */
export function createLanguageClient(context: VSCode.ExtensionContext): LanguageClient {
    let clientOptions: LanguageClientOptions = {
        documentSelector: ["hime"],
        synchronize: {
            fileEvents: [
                VSCode.workspace.createFileSystemWatcher("**/*.gram"),
            ]
        }, outputChannelName: "Hime"
    };
    function createServer(): Promise<StreamInfo> {
        let serverType = VSCode.workspace.getConfiguration("hime").get("lsp.server");
        if (serverType == "remote") {
            let port = VSCode.workspace.getConfiguration("hime").get("lsp.server.port") as number;
            if (port == null)
                port = 8000;
            return serverConnect(context, client, port);
        }
        return serverLaunchProcess(context, client);
    }
    let client = new LanguageClient('hime-language', 'Hime Language Server', createServer, clientOptions);
    let disposable = client.start();
    context.subscriptions.push(disposable);
    return client;
}

/**
 * Spawns a new LSP server and connect to it through the standard streams
 * @param context The current context
 * @param client  The language client
 * @return The promise for a StreamInfo
 */
function serverLaunchProcess(context: VSCode.ExtensionContext, client: LanguageClient): Promise<StreamInfo> {
    return new Promise((resolve, reject) => {
        client.outputChannel.appendLine("[INFO] Creating a new hime language server with a new process ...");
        let java = resolveJava();
        if (java == null) {
            reject("[ERROR] Failed to find Java executable");
            return;
        }
        resolveJavaGetVersion(java).then(version => {
            client.outputChannel.appendLine("[INFO] Will use Java: " + java + " (version " + version + ")");
            let jarPath = Path.resolve(context.extensionPath, "target", "bin", "server.jar");
            let options = { cwd: VSCode.workspace.rootPath };
            client.outputChannel.appendLine("[INFO] Launching server as " + java + " -jar " + jarPath);
            let process = ChildProcess.spawn(java, ["-jar", jarPath], options);
            if (process == null) {
                reject("[ERROR] Failed to launch the server");
                return;
            }
            client.outputChannel.appendLine("[INFO] Launched server as process " + process.pid);
            resolve({
                writer: process.stdin,
                reader: process.stdout
            });
        }, message => {
            reject(message);
        }).catch(error => {
            reject("[ERROR] " + error);
        });
    });
}

/**
 * Connects to a running language server on the specified port
 * @param context The current context
 * @param client  The language client
 * @param port The port to connect to
 * @return The stream to communicate with the server
 */
function serverConnect(context: VSCode.ExtensionContext, client: LanguageClient, port: number): Promise<StreamInfo> {
    return new Promise((resolve, reject) => {
        client.outputChannel.appendLine("[INFO] Connecting to hime language server on port " + port + " ...");
        let socket = Net.connect(port);
        resolve({
            writer: socket,
            reader: socket
        });
    });
}

/**
 * Attach a process stream to a channel
 * @param readable      The process stream
 * @param outputChannel The channel
 */
function serverAttachStream(readable: Readable, channel: VSCode.OutputChannel): void {
    readable.on('data', chunk => {
        const chunkAsString = typeof chunk === 'string' ? chunk : chunk.toString();
        channel.append(chunkAsString);
    });
}

/**
 * Resolves the Java executable
 * @return The full path to the executable if it is found, null otherwise
 */
function resolveJava(): string {
    // the executable name
    let execName = (process.platform === "win32" ? "java.exe" : "java");

    // is the hime.java setting defined?
    let settingJavaHome = VSCode.workspace.getConfiguration("hime").get("java") as string;
    if (settingJavaHome != null) {
        let result = resolveJavaInDirectory(settingJavaHome, execName);
        if (result != null)
            return result;
    }

    // look in JAVA_HOME variable
    let envJavaHome = process.env["JAVA_HOME"];
    if (envJavaHome != null) {
        let result = resolveJavaInDirectory(envJavaHome, execName);
        if (result != null)
            return result;
    }

    // look in PATH variable
    let envPath = process.env["PATH"];
    if (envPath != null) {
        let directories = envPath.split(Path.delimiter);
        for (let i = 0; i != directories.length; i++) {
            let result = resolveJavaInDirectory(directories[i], execName);
            if (result != null)
                return result;
        }
    }
    return null;
}

/**
 * Gets the java version of the specified Java executable
 * @param execName The executable Java
 * @return A promise for the version
 */
function resolveJavaGetVersion(execName: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let result = ChildProcess.execFile(execName, ["-version"], {}, (error, stdout, stderr) => {
            if (error != null)
                reject(error);
            let lines = stderr.split(OS.EOL);
            if (lines.length == 0) {
                reject("[ERROR] Failed to determine version of " + execName);
                return;
            }
            let matches = lines[0].match("version \"([^\"]+)\"");
            if (matches == null) {
                reject("[ERROR] Failed to determine version of " + execName);
                return;
            }
            if (matches.length < 2) {
                reject("[ERROR] Failed to determine version of " + execName);
                return;
            }
            resolve(matches[1]);
        });
    });
}

/**
 * Tries to resolves the Java executable in the specified directory
 * @param directory The directory to investigate
 * @param execName  The executable name to look for
 * @return The full path to the executable if it is found, null otherwise
 */
function resolveJavaInDirectory(directory: string, execName: string): string {
    let fullPath = Path.join(directory, execName);
    if (FS.existsSync(fullPath))
        return fullPath;
    fullPath = Path.join(directory, "bin", execName);
    if (FS.existsSync(fullPath))
        return fullPath;
    return null;
}