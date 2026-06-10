#!/bin/bash
export PATH="$HOME/node/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")/frontend"
echo " Abrindo interface..."
npm run dev
