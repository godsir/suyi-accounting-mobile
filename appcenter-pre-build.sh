#!/usr/bin/env bash

# AppCenter pre-build script for Ionic Capacitor iOS

echo "AppCenter pre-build script started"

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the web assets
echo "Building web assets..."
npm run build

# Sync Capacitor
echo "Syncing Capacitor..."
npx cap sync ios

echo "AppCenter pre-build script completed"