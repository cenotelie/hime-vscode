#!/bin/bash

SCRIPT="$(readlink -f "$0")"
RELENG="$(dirname "$SCRIPT")"
ROOT="$(dirname "$RELENG")"

VERSION=$(grep "version" "$ROOT/package.json" | grep -o -E "([[:digit:]]+\\.[[:digit:]]+\\.[[:digit:]])+")
HASH=$(git rev-parse HEAD)

SERVER_VERSION="1.0.3"
SERVER_FILE="$HOME/.m2/repository/fr/cenotelie/hime/hime-language-server/$SERVER_VERSION/hime-language-server-$SERVER_VERSION-jar-with-dependencies.jar"
DIST_VERSION="3.5.1"

# Prepare outputs
rm -f "$OOT/hime-language-$VERSION.vsix"
rm -rf "$ROOT/target"
mkdir "$ROOT/target"
mkdir "$ROOT/target/bin"

if [ -r "$SERVER_FILE" ]; then
    cp "$SERVER_FILE" "$ROOT/target/bin/server.jar"
else
    echo "Cannot find local build of the server, will try from maven.org"
    curl -L -o "$ROOT/target/bin/server.jar" "https://repo1.maven.org/maven2/fr/cenotelie/hime/hime-language-server/$SERVER_VERSION/hime-language-server-$SERVER_VERSION-jar-with-dependencies.jar"
    if [ ! -f "$ROOT/target/bin/server.jar" ]; then
        echo "Failed to download from maven.org"
        exit 1
    fi
fi

curl -L -o "$ROOT/target/hime-dist.zip" "https://cenotelie.fr/releases/hime-v$DIST_VERSION.zip"
unzip "$ROOT/target/hime-dist.zip" -d "$ROOT/target"
mv "$ROOT/target/hime-$DIST_VERSION/net461"    "$ROOT/target/bin/net461"
mv "$ROOT/target/hime-$DIST_VERSION/netcore20" "$ROOT/target/bin/netcore20"
mv "$ROOT/target/hime-$DIST_VERSION/himecc"    "$ROOT/target/bin/himecc"
mv "$ROOT/target/hime-$DIST_VERSION/parseit"   "$ROOT/target/bin/parseit"
chmod +x "$ROOT/target/bin/himecc"
chmod +x "$ROOT/target/bin/parseit"
rm "$ROOT/target/hime-dist.zip"
rm -rf "$ROOT/target/hime-$DIST_VERSION"
rm -f "$ROOT/target/bin/net461/"*.pdb
rm -f "$ROOT/target/bin/net461/"*.xml
rm -f "$ROOT/target/bin/netcore20/"*.pdb
rm -f "$ROOT/target/bin/netcore20/"*.xml

# Inject commit hash into package.json
sed -i "s/\"commit\": \".*\"/\"commit\": \"$HASH\"/" "$ROOT/package.json"

pushd "$ROOT"

npm install
npm run build
vsce package

popd

# cleanup
# rm -rf "$ROOT/target"
git checkout -- package.json
