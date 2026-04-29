#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
export AWS_PROFILE="${AWS_PROFILE:-colin}"

LAMBDAS=(
  "youtubeGetChannel:getPlaylist.js"
  "youtubeGetPlaylistContents:getPlaylistContents.js"
  "youtubeGetPlaylistFromHandle:getPlaylistFromHandle.js"
)

if [[ -f "$HOME/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$HOME/.env"
  set +a
fi

if [[ -z "${YOUTUBE_API_KEY:-}" ]]; then
  echo "Error: YOUTUBE_API_KEY not set (add it to ~/.env)" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Compiling TypeScript..."
npx tsc -p "$SCRIPT_DIR/tsconfig.json"

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

for entry in "${LAMBDAS[@]}"; do
  FUNCTION_NAME="${entry%%:*}"
  SOURCE_JS="${entry##*:}"
  ZIP="$TMPDIR/$FUNCTION_NAME.zip"

  cp "$SCRIPT_DIR/dist/$SOURCE_JS" "$TMPDIR/index.mjs"
  (cd "$TMPDIR" && zip -q "$ZIP" index.mjs)
  rm "$TMPDIR/index.mjs"

  if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &>/dev/null; then
    echo "Updating $FUNCTION_NAME..."
    aws lambda update-function-code \
      --function-name "$FUNCTION_NAME" \
      --zip-file "fileb://$ZIP" \
      --region "$REGION" \
      --query '{FunctionName:FunctionName,LastModified:LastModified,CodeSize:CodeSize}' \
      --output table
  else
    echo "Error: $FUNCTION_NAME does not exist — create it manually in the AWS console first" >&2
    exit 1
  fi
done

echo "Syncing configuration..."
for entry in "${LAMBDAS[@]}"; do
  FUNCTION_NAME="${entry%%:*}"
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --region "$REGION" \
    --timeout 30 \
    --environment "Variables={YOUTUBE_API_KEY=$YOUTUBE_API_KEY}" \
    --query 'FunctionName' \
    --output text
done

echo "Done."
