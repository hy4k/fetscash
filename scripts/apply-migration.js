#!/usr/bin/env node
/**
 * Apply a SQL migration file to Supabase using the SERVICE_ROLE key.
 *
 * Usage:
 *   VITE_SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/apply-migration.js migrations/002_bank_gst_multicurrency.sql
 *
 * The service role key is required because CREATE TABLE / CREATE FUNCTION
 * cannot be executed with the anon key through the REST API.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const file = process.argv[2];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

if (!file) {
  console.error('❌ Migration file path required');
  process.exit(1);
}

const sqlPath = path.isAbsolute(file) ? file : path.join(__dirname, '..', file);
const sql = fs.readFileSync(sqlPath, 'utf-8');

const projectRef = supabaseUrl.replace(/^https:\/\//, '').replace(/\.supabase\.co$/, '');
const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

async function run() {
  console.log(`Applying migration: ${file}`);
  const res = await fetch(managementUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error('❌ Migration failed:', res.status, text);
    process.exit(1);
  }
  console.log('✅ Migration applied successfully');
  console.log(text ? text.slice(0, 500) : '');
}

run().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
