#!/bin/bash

SCRIPT="$(readlink -f "$0")"
RELENG="$(dirname "$SCRIPT")"
ROOT="$(dirname "$RELENG")"

VERSION=$(grep "version" "$ROOT/package.json" | grep -o -E "([[:digit:]]+\\.[[:digit:]]+\\.[[:digit:]])+")
HASH=$(hg -R "$ROOT" --debug id -i)

SERVER_VERSION="1.0.0-SNAPSHOT"
SERVER_FILE="$HOME/.m2/repository/fr/cenotelie/hime/hime-language-server/$SERVER_VERSION/hime-language-server-$SERVER_VERSION-jar-with-dependencies.jar"


# Prepare outputs
rm -f "$OOT/hime-language-$VERSION.vsix"
rm -rf "$ROOT/target"
mkdir "$ROOT/target"

if [ -r "$SERVER_FILE" ]; then
    cp "$SERVER_FILE" "$ROOT/target/server.jar"
else
    echo "Cannot find local build of the server, will try from maven.org"
    curl -o "$ROOT/target/server.jar" "https://repo1.maven.org/maven2/fr/cenotelie/hime/hime-language-server/$SERVER_VERSION/hime-language-server-$SERVER_VERSION-jar-with-dependencies.jar"
    if [ ! -f "$ROOT/target/server.jar" ]; then
        echo "Failed to download from maven.org"
        exit 1
    fi
fi

# Inject commit hash into package.json
sed -i "s/\"commit\": \".*\"/\"commit\": \"$HASH\"/" "$ROOT/package.json"

pushd "$ROOT"

npm install
vsce package

popd

# cleanup
rm -rf "$ROOT/target"
hg -R "$ROOT" revert -C package.json