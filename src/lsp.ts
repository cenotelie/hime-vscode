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

import * as vscode from "vscode";
import * as path from "path";
import * as childProcess from "child_process";
import {
  LanguageClient,
  LanguageClientOptions,
  StreamInfo
} from "vscode-languageclient";

/**
 * Creates a new language client for this extension
 * @param context  The extension's content
 * @return The language client
 */
export function createLanguageClient(
  context: vscode.ExtensionContext
): LanguageClient {
  let clientOptions: LanguageClientOptions = {
    documentSelector: ["hime"],
    synchronize: {
      fileEvents: [vscode.workspace.createFileSystemWatcher("**/*.gram")]
    },
    outputChannelName: "Hime"
  };
  let client = new LanguageClient(
    "hime-language",
    "Hime Language Server",
    () => serverLaunchProcess(context, client),
    clientOptions
  );
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
function serverLaunchProcess(
  context: vscode.ExtensionContext,
  client: LanguageClient
): Promise<StreamInfo> {
  return new Promise((resolve, reject) => {
    let executable = path.resolve(
      context.extensionPath,
      "bin",
      "hime_langserv"
    );
    let options = {cwd: vscode.workspace.rootPath};
    let process = childProcess.spawn(executable, [], options);
    if (process == null) {
      reject("[ERROR] Failed to launch the server");
      return;
    }
    client.outputChannel.appendLine(
      "[INFO] Launched server as process " + process.pid
    );
    resolve({
      writer: process.stdin,
      reader: process.stdout
    });
  });
}
