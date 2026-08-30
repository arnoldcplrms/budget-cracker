#!/usr/bin/env bash
set -euo pipefail

SDK_ROOT="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"
ADB="$SDK_ROOT/platform-tools/adb"
EMULATOR="$SDK_ROOT/emulator/emulator"
AVD="${1:-${EXPO_ANDROID_AVD:-Pixel_7_API_34}}"
LOG_FILE="${TMPDIR:-/tmp}/budget-cracker-emulator.log"

if [[ ! -x "$ADB" ]]; then
  echo "Android adb not found at: $ADB" >&2
  echo "Set ANDROID_SDK_ROOT to your Android SDK directory." >&2
  exit 1
fi

if [[ ! -x "$EMULATOR" ]]; then
  echo "Android emulator not found at: $EMULATOR" >&2
  exit 1
fi

if ! "$EMULATOR" -list-avds | grep -Fxq "$AVD"; then
  echo "Android AVD not found: $AVD" >&2
  echo "Available AVDs:" >&2
  "$EMULATOR" -list-avds >&2
  exit 1
fi

if ! "$ADB" devices | awk '$1 ~ /^emulator-/ && $2 == "device" { found = 1 } END { exit !found }'; then
  echo "Starting Android emulator: $AVD"
  nohup "$EMULATOR" -avd "$AVD" -no-snapshot-load >"$LOG_FILE" 2>&1 &
fi

echo "Waiting for Android to boot..."
"$ADB" wait-for-device

for _ in $(seq 1 90); do
  if [[ "$($ADB shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
    break
  fi
  sleep 2
done

if [[ "$($ADB shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" != "1" ]]; then
  echo "Android emulator did not finish booting. Check: $LOG_FILE" >&2
  exit 1
fi

echo "Emulator ready. Starting Budget Cracker..."
exec npx expo run:android
