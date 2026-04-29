#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v firebase &>/dev/null; then
  echo "Installing firebase-tools globally..."
  npm install -g firebase-tools
fi

echo ""
echo "=== Firebase login ==="
firebase login

echo ""
echo "=== Available Firebase projects ==="
firebase projects:list

echo ""
read -rp "Enter your Firebase project ID: " PROJECT_ID

cat > .firebaserc <<EOF
{
  "projects": {
    "default": "${PROJECT_ID}"
  }
}
EOF
echo "Wrote .firebaserc"

echo ""
echo "=== Web apps in project ==="
firebase apps:list WEB --project "$PROJECT_ID" || true

echo ""
read -rp "Enter existing App ID (or press Enter to create new): " APP_ID

if [ -z "${APP_ID}" ]; then
  echo "Creating new web app 'ytshuffle'..."
  firebase apps:create WEB ytshuffle --project "$PROJECT_ID"
  echo ""
  echo "=== Web apps (after creation) ==="
  firebase apps:list WEB --project "$PROJECT_ID"
  read -rp "Enter the App ID from above: " APP_ID
fi

echo ""
echo "=== Writing .env ==="
SDK_JSON=$(firebase apps:sdkconfig WEB "$APP_ID" --project "$PROJECT_ID" --json)

node -e "
const d = JSON.parse(process.argv[1]).result.sdkConfig
const lines = [
  'VITE_FIREBASE_API_KEY=' + d.apiKey,
  'VITE_FIREBASE_AUTH_DOMAIN=' + d.authDomain,
  'VITE_FIREBASE_PROJECT_ID=' + d.projectId,
  'VITE_FIREBASE_STORAGE_BUCKET=' + (d.storageBucket ?? ''),
  'VITE_FIREBASE_MESSAGING_SENDER_ID=' + (d.messagingSenderId ?? ''),
  'VITE_FIREBASE_APP_ID=' + d.appId,
  'VITE_FIREBASE_MEASUREMENT_ID=' + (d.measurementId ?? ''),
]
process.stdout.write(lines.join('\n') + '\n')
" "$SDK_JSON" > .env

echo "Wrote .env"
grep -q '\.env' .gitignore 2>/dev/null || echo '.env' >> .gitignore

echo ""
echo "=== Deploying Firestore rules ==="
firebase deploy --only firestore:rules --project "$PROJECT_ID"

echo ""
echo "================================================================"
echo "DONE. Two manual steps still required in Firebase console:"
echo "  https://console.firebase.google.com/project/${PROJECT_ID}"
echo ""
echo "  1. Authentication → Sign-in method → Enable Google"
echo "  2. Firestore Database → Create database (if not already done)"
echo "================================================================"
