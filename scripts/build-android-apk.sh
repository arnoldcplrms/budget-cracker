#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_PATH="$PROJECT_ROOT/android/app/build/outputs/apk/release/app-release.apk"

cd "$PROJECT_ROOT/android"
./gradlew assembleRelease

echo
echo "APK generated:"
echo "$APK_PATH"
