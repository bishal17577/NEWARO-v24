#!/bin/bash
set -e
cd "$(dirname "$0")"
echo "NEWARO v22 setup"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install the current LTS version from https://nodejs.org/ and run this file again."
  read -r -p "Press Enter to close..."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "Installing dependencies. Internet access is required for the first run..."
  if command -v bun >/dev/null 2>&1 && [ -f bun.lock ]; then
    bun install
  else
    npm install
  fi
fi
echo "Running NEWARO on the local server..."
npm run dev
