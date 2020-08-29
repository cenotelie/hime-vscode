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
import * as ChildProcess from "child_process";
import * as VSCode from "vscode";

/**
 * An observer for an external process
 */
export interface ProcessObserver {
  /**
   * When a log message appears on the standard output of the observed process
   * @param message The message that appeared on the log
   */
  onLog(message: string): void;
  /**
   * When the process finished
   */
  onFinished(): void;
}

/**
 * Represents the output of a parser
 */
export interface ParseResult {
  /**
   * The list of errors
   */
  errors: ParseError[];
  /**
   * The produced AST, if any
   */
  root?: ASTNode;
}

/**
 * Represents an error in a parser
 */
export interface ParseError {
  /**
   * The error's type
   */
  type: string;
  /**
   * The error's position in the input text
   */
  position: TextPosition;
  /**
   * The error's length in the input (in number of characters)
   */
  length: number;
  /**
   * The error's message
   */
  message: string;
}

/**
 * Represents a node in an Abstract Syntax Tree
 */
export interface ASTNode {
  /**
   * The grammar symbol associated to this element
   */
  symbol: Symbol;
  /**
   * The value of this element, if any
   */
  value?: string;
  /**
   * The position in the input text of this element, if any
   */
  position?: TextPosition;
  /**
   * The span in the input text of this element, if any
   */
  span?: TextSpan;
  /**
   * The children of this node
   */
  children: ASTNode[];
}

/**
 * Represents a grammar symbol (terminal, variable or virtual)
 */
export interface Symbol {
  /**
   * The symbol's unique identifier
   */
  id: number;
  /**
   * The symbol's name
   */
  name: string;
}

/**
 * Represents a position in term of line and column in a text input
 */
export interface TextPosition {
  /**
   * The line number (starts at 1)
   */
  line: number;
  /**
   * The column number (starts at 1)
   */
  column: number;
}

/**
 * Represents a span of text in an input as a starting index and length
 */
export interface TextSpan {
  /**
   * The starting index
   */
  index: number;
  /**
   * The length
   */
  length: number;
}

/**
 * Compiles a grammar
 * @param context    The extension's content
 * @param fileUri    The URI to the file that contains the grammar
 * @param grammar    The name of the grammar to compile
 * @param observer   The observer for the compilation operation
 * @param parameters The additional compilation parameters
 */
export function compileGrammar(
  context: VSCode.ExtensionContext,
  fileUri: string,
  grammar: string,
  observer: ProcessObserver,
  parameters: string[]
) {
  let file = fileUri.substring("file://".length);
  let options = {cwd: VSCode.workspace.rootPath};
  var child: ChildProcess.ChildProcess = null;
  if (process.platform === "win32") {
    child = ChildProcess.spawn(
      Path.resolve(
        context.extensionPath,
        "target",
        "bin",
        "net461",
        "himecc.exe"
      ),
      [file, "-g", grammar].concat(parameters),
      options
    );
  } else {
    child = ChildProcess.spawn(
      Path.resolve(context.extensionPath, "target", "bin", "himecc"),
      [file, "-g", grammar].concat(parameters),
      options
    );
  }
  if (child == null) {
    VSCode.window.showErrorMessage("Hime: Failed to launch himecc");
    return;
  }
  child.stdout.on("data", function (data) {
    const chunkAsString = typeof data === "string" ? data : data.toString();
    observer.onLog(chunkAsString);
  });
  child.stderr.on("data", function (data) {
    const chunkAsString = typeof data === "string" ? data : data.toString();
    observer.onLog(chunkAsString);
  });
  child.on("close", function (code) {
    observer.onFinished();
  });
}

/**
 * Parses a piece of input using a compiled parser
 * @param context      The extension's content
 * @param assemblyFile The URI to the assembly containing the compiled parser
 * @param parserQName  The qualified name of the parser type in the assembly
 * @param input        The piece of input to parse
 * @return             The result of the parsing
 */
export function parseInput(
  context: VSCode.ExtensionContext,
  assemblyFile: string,
  parserQName: string,
  input: string
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    let options = {cwd: VSCode.workspace.rootPath};
    var child: ChildProcess.ChildProcess = null;
    if (process.platform === "win32") {
      child = ChildProcess.spawn(
        Path.resolve(
          context.extensionPath,
          "target",
          "bin",
          "net461",
          "parseit.exe"
        ),
        [assemblyFile, parserQName],
        options
      );
    } else {
      child = ChildProcess.spawn(
        Path.resolve(context.extensionPath, "target", "bin", "parseit"),
        [assemblyFile, parserQName],
        options
      );
    }
    if (child == null) {
      reject("Hime: Failed to launch parseit");
      return;
    }
    let content = [];
    child.stdout.on("data", function (data) {
      const chunkAsString = typeof data === "string" ? data : data.toString();
      content.push(chunkAsString);
    });
    child.on("close", function (code) {
      let result = JSON.parse(content.join(""));
      resolve(result);
    });
    child.stdin.setDefaultEncoding("utf-8");
    child.stdin.write(input + "\n");
    child.stdin.end();
  });
}

let CHARACTERS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Creates a random string that can be used as an identifier
 * @returns The generated string
 */
export function randomString(): string {
  var result = "";
  for (var i = 0; i != 20; i++) {
    let index = Math.floor(Math.random() * CHARACTERS.length);
    result += CHARACTERS[index].toString();
  }
  return result;
}

/**
 * Escapes the input string for serialization in JSON
 * @param value The input string to escape
 */
export function escapeString(value: string): string {
  var builder = [];
  for (var i = 0; i != value.length; i++) {
    var c = value[i];
    if (c == '"') builder.push('\\"');
    else if (c == "\\") builder.push("\\\\");
    else if (c == "\u0000") builder.push("\\0");
    else if (c == "\u0007") builder.push("\\a");
    else if (c == "\t") builder.push("\\t");
    else if (c == "\r") builder.push("\\r");
    else if (c == "\n") builder.push("\\n");
    else if (c == "\b") builder.push("\\b");
    else if (c == "\f") builder.push("\\f");
    else builder.push(c);
  }
  return builder.join("");
}
