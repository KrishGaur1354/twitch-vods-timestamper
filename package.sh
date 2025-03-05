#!/bin/bash

# Create directories
mkdir -p dist/chrome
mkdir -p dist/firefox

# Copy common files to Chrome version
cp src/content.js dist/chrome/
cp src/content-styles.css dist/chrome/
cp src/background.js dist/chrome/
cp src/manifest.json dist/chrome/
cp -r icons dist/chrome/

# Copy common files to Firefox version
cp src/content.js dist/firefox/
cp src/content-styles.css dist/firefox/
cp src/background.js dist/firefox/
cp firefox/manifest.json dist/firefox/
cp -r icons dist/firefox/

# Create zip files
cd dist/chrome
zip -r ../twitch-timestamper-chrome.zip ./*
cd ../firefox
zip -r ../twitch-timestamper-firefox.zip ./*
cd ../..

echo "Extension packages created:"
echo "- dist/twitch-timestamper-chrome.zip"
echo "- dist/twitch-timestamper-firefox.zip" 