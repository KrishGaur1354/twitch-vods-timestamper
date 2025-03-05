# Clean up existing dist directory
if (Test-Path dist) {
    Remove-Item -Path dist -Recurse -Force
}

# Create directories
New-Item -ItemType Directory -Force -Path dist/chrome/icons
New-Item -ItemType Directory -Force -Path dist/firefox/icons
New-Item -ItemType Directory -Force -Path dist/edge/icons

# Create square icons using ImageMagick
magick convert icons/ascii-art.png -resize 48x48^ -gravity center -extent 48x48 dist/temp_48.png
magick convert icons/ascii-art.png -resize 128x128^ -gravity center -extent 128x128 dist/temp_128.png

# Copy square icons to each distribution
Copy-Item dist/temp_48.png dist/chrome/icons/ascii-art-48.png
Copy-Item dist/temp_128.png dist/chrome/icons/ascii-art-128.png
Copy-Item dist/temp_48.png dist/firefox/icons/ascii-art-48.png
Copy-Item dist/temp_128.png dist/firefox/icons/ascii-art-128.png
Copy-Item dist/temp_48.png dist/edge/icons/ascii-art-48.png
Copy-Item dist/temp_128.png dist/edge/icons/ascii-art-128.png

# Clean up temporary files
Remove-Item dist/temp_48.png
Remove-Item dist/temp_128.png

# Copy common files to Chrome version
Copy-Item src/content.js dist/chrome/
Copy-Item src/content-styles.css dist/chrome/
Copy-Item src/background.js dist/chrome/
Copy-Item src/manifest.json dist/chrome/

# Copy common files to Firefox version
Copy-Item src/content.js dist/firefox/
Copy-Item src/content-styles.css dist/firefox/
Copy-Item src/background.js dist/firefox/
Copy-Item firefox/manifest.json dist/firefox/

# Copy common files to Edge version
Copy-Item src/content.js dist/edge/
Copy-Item src/content-styles.css dist/edge/
Copy-Item src/background.js dist/edge/
Copy-Item edge/manifest.json dist/edge/

# Create zip files
Push-Location dist/chrome
tar -a -c -f ../twitch-timestamper-chrome.zip *
Pop-Location

Push-Location dist/firefox
tar -a -c -f ../twitch-timestamper-firefox.zip *
Pop-Location

Push-Location dist/edge
tar -a -c -f ../twitch-timestamper-edge.zip *
Pop-Location

Write-Host "Extension packages created:"
Write-Host "- dist/twitch-timestamper-chrome.zip"
Write-Host "- dist/twitch-timestamper-firefox.zip"
Write-Host "- dist/twitch-timestamper-edge.zip" 