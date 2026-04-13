#!/bin/bash

# Legacy Data Migration Runner
# Usage: ./run-migration.sh <user-id>

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$PROJECT_DIR/scripts"

echo ""
echo "================================"
echo "📊 Legacy Data Migration Runner"
echo "================================"
echo ""

# Check if user ID is provided
if [ -z "$1" ]; then
  echo "❌ Error: User ID is required"
  echo "Usage: $0 <user-id>"
  echo "Example: $0 \"550e8400-e29b-41d4-a716-446655440000\""
  exit 1
fi

USER_ID="$1"

echo "✅ User ID: $USER_ID"
echo "📁 Working Directory: $PROJECT_DIR"
echo ""

# Load environment variables
if [ -f "$PROJECT_DIR/.env" ]; then
  echo "📝 Loading environment variables from .env..."
  export $(cat "$PROJECT_DIR/.env" | grep -v '^#' | xargs)
elif [ -f "$PROJECT_DIR/.env.example" ]; then
  echo "⚠️  .env file not found, using .env.example..."
  export $(cat "$PROJECT_DIR/.env.example" | grep -v '^#' | xargs)
else
  echo "❌ Error: Environment file not found"
  exit 1
fi

# Verify required environment variables
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set"
  exit 1
fi

echo "✅ Supabase Configuration:"
echo "   URL: ${VITE_SUPABASE_URL:0:40}..."
echo "   Key: ${VITE_SUPABASE_ANON_KEY:0:40}..."
echo ""

# Check if csv-parse is installed
cd "$PROJECT_DIR"
if ! npm list csv-parse > /dev/null 2>&1; then
  echo "📦 Installing csv-parse..."
  npm install csv-parse --save
fi

# Run migration
echo "🚀 Starting Migration..."
echo ""

npx ts-node --project tsconfig.json "$SCRIPT_DIR/migrate-legacy-data.ts" "$USER_ID"

MIGRATION_STATUS=$?

echo ""
if [ $MIGRATION_STATUS -eq 0 ]; then
  echo "✅ Migration completed successfully!"
  echo ""
  echo "📊 Next Steps:"
  echo "   1. Refresh the app (browser F5)"
  echo "   2. Navigate to Invoices tab to see historical data"
  echo "   3. Check the dashboard for account summary"
  echo ""
else
  echo "❌ Migration failed with status $MIGRATION_STATUS"
  exit $MIGRATION_STATUS
fi
