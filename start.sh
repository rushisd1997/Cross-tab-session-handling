#!/bin/sh
# Starts the project on macOS or Linux. Run: sh start.sh
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found. Install the LTS version from https://nodejs.org and try again."
  exit 1
fi

node scripts/check-node.js || exit 1

if [ ! -d node_modules ]; then
  echo "Installing packages. This needs internet access and takes a few minutes the first time."
  npm ci || { echo "Install failed. Check your internet connection and try again."; exit 1; }
fi

npm start
