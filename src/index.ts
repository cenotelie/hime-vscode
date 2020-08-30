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
import * as lsp from "./lsp";

// import * as HimeCompile from "./himeCompile";
// import * as HimeTest from "./himeTest";

export function activate(context: vscode.ExtensionContext): void {
  let _client = lsp.createLanguageClient(context);
  // registerCommand(context, client.outputChannel);
  // HimeTest.registerCommand(context);
}

export function deactivate(): void {}
