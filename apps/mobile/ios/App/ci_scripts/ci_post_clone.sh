#!/usr/bin/env bash

set -x

export HOMEBREW_NO_INSTALL_CLEANUP=TRUE
# Install CocoaPods
echo "📦 Install CocoaPods"
brew install cocoapods
brew install node@18
brew link node@18

# Install dependencies
npm config set maxsockets 3
npm i 
# or `pnpm install --frozen-lockfile` or `yarn install --frozen-lockfile` or bun install
npm run build
# or npm run build
npm run sync:ios
