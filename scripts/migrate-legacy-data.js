#!/usr/bin/env node

/**
 * Legacy Data Migration Script
 * Migrates data from CSV files to Supabase
 *
 * Usage: node migrate-legacy-data.js <user-id>
 * Example: node migrate-legacy-data.js "550e8400-e29b-41d4-a716-446655440000"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const userId = process.argv[2];

// Validation
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables are required');
  process.exit(1);
}

if (!userId) {
  console.error('❌ Error: User ID is required as first argument');
  console.error('Usage: node migrate-legacy-data.js <user-id>');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ====== HELPER FUNCTIONS ======

function parseDate(dateStr) {
  // Format: "11-03-2026" or "11-03-2026                    "
  const cleaned = dateStr.trim();
  const [day, month, year] = cleaned.split('-');
  return `${year}-${month}-${day}`;
}

function addDays(dateStr, days) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function inferCountry(address, orgName) {
  const addr = address.toLowerCase();
  const name = orgName.toLowerCase();

  if (addr.includes('united states') || addr.includes('kansas') || addr.includes('delaware') || name.includes('llc') || name.includes('incorporated')) {
    return 'USA';
  }
  if (addr.includes('netherlands') || addr.includes('amsterdam')) {
    return 'Other';
  }
  if (addr.includes('india') || addr.includes('kerala') || addr.includes('karnataka') || addr.includes('haryana') || addr.includes('gurgaon')) {
    return 'India';
  }
  if (addr.includes('united kingdom') || addr.includes('london')) {
    return 'UK';
  }
  if (addr.includes('canada')) {
    return 'Canada';
  }
  return 'Other';
}

function getCurrency(country) {
  switch (country) {
    case 'India':
      return 'INR';
    case 'USA':
      return 'USD';
    case 'UK':
      return 'GBP';
    case 'Canada':
      return 'CAD';
    default:
      return 'USD';
  }
}

function generateExamCode(productName) {
  const codeMap = {
    'TOEFL': 'TOEFL',
    'GRE': 'GRE',
    'ICMA': 'ICMA',
    'MRCA': 'MRCA',
    'PSI Exam': 'PSI',
    'CMA US Mock': 'CMA',
    'ACCA': 'ACCA',
    'IELTS': 'IELTS',
    'TOEIC': 'TOEIC',
  };

  for (const [key, code] of Object.entries(codeMap)) {
    if (productName.includes(key)) return code;
  }

  return productName.substring(0, 8).toUpperCase();
}

function parseAmount(amountStr) {
  // Remove currency symbols and commas: "₹ 1,804.86" or "1,804.86"
  return parseFloat(amountStr.replace(/[₹$,\s]/g, ''));
}

function formatServiceMonth(dateStr) {
  const date = new Date(dateStr);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function isPastDue(invoiceDateStr, today = new Date()) {
  const invoiceDate = new Date(invoiceDateStr);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 30);
  return dueDate < today;
}

// ====== MAIN MIGRATION ======

async function migrateLegacyData() {
  console.log('\n🚀 Starting Legacy Data Migration...\n');

  try {
    // Read CSV files
    console.log('📖 Reading CSV files...');
    const dataDir = path.join(__dirname, '..', 'data-import', 'legacy');

    const clientsData = fs.readFileSync(path.join(dataDir, 'Clients.csv'), 'utf-8');
    const invoicesData = fs.readFileSync(path.join(dataDir, 'Invoice.csv'), 'utf-8');
    const itemsData = fs.readFileSync(path.join(dataDir, 'InvoiceItems.csv'), 'utf-8');
    const productsData = fs.readFileSync(path.join(dataDir, 'Products.csv'), 'utf-8');

    const clients = parse(clientsData, { columns: true, skip_empty_lines: true });
    const invoices = parse(invoicesData, { columns: true, skip_empty_lines: true });
    const items = parse(itemsData, { columns: true, skip_empty_lines: true });
    const products = parse(productsData, { columns: true, skip_empty_lines: true });

    console.log(`✅ Parsed ${clients.length} clients`);
    console.log(`✅ Parsed ${invoices.length} invoices`);
    console.log(`✅ Parsed ${items.length} line items`);
    console.log(`✅ Parsed ${products.length} products\n`);

    // ====== STEP 1: MIGRATE EXAM TYPES ======
    console.log('📚 Migrating Exam Types...');
    const examTypeMap = new Map();

    for (const product of products) {
      const code = generateExamCode(product['Product Name']);
      const rate = parseAmount(product['Sale Rate']);
      const taxRateStr = product['Tax Rate'].replace(/\s*%\s*/, '');
      const taxRate = taxRateStr ? parseFloat(taxRateStr) : 0;

      const examType = {
        id: uuidv4(),
        user_id: userId,
        code,
        name: product['Product Name'],
        description: product['Product Name'],
        default_rate_inr: rate,
        default_rate_usd: Math.round(rate / 83),
        status: 'active',
      };

      examTypeMap.set(product['Product Name'], examType.id);

      const { error } = await supabase.from('exam_types').insert([examType]);
      if (error) {
        if (!error.message.includes('duplicate')) {
          console.warn(`⚠️  ${code}: ${error.message}`);
        }
      }
    }
    console.log(`✅ Processed ${examTypeMap.size} exam types\n`);

    // ====== STEP 2: MIGRATE CUSTOMERS ======
    console.log('👥 Migrating Customers...');
    const customerMap = new Map();

    for (const client of clients) {
      const country = inferCountry(client.Address, client['Organization Name']);
      const currency = getCurrency(country);

      const customer = {
        id: uuidv4(),
        user_id: userId,
        name: client['Organization Name'],
        contact_person: client['Contact Person'] || client['Organization Name'],
        email: client.Email || `${client['Organization Name'].replace(/\s+/g, '').toLowerCase()}@example.com`,
        phone: client['Contact Number'] !== '-' ? client['Contact Number'] : undefined,
        address: client.Address,
        country,
        payment_terms: 30,
        currency,
        gst_number: client['Tax ID'] !== '-' ? client['Tax ID'] : undefined,
        status: 'active',
      };

      customerMap.set(client['Organization Name'], customer.id);

      const { error } = await supabase.from('customers').insert([customer]);
      if (error) {
        if (!error.message.includes('duplicate')) {
          console.warn(`⚠️  ${customer.name}: ${error.message}`);
        }
      }
    }
    console.log(`✅ Processed ${customerMap.size} customers\n`);

    // ====== STEP 3: MIGRATE INVOICES ======
    console.log('📄 Migrating Invoices...');
    let invoiceCount = 0;
    const today = new Date();

    for (const inv of invoices) {
      const customerId = customerMap.get(inv['Organization Name']);
      if (!customerId) {
        console.warn(`⚠️  Skipping ${inv['Invoice No.']} - customer not found`);
        continue;
      }

      const invoiceItems = items.filter(item => item['Invoice No.'] === inv['Invoice No.']);
      if (invoiceItems.length === 0) {
        console.warn(`⚠️  Skipping ${inv['Invoice No.']} - no line items`);
        continue;
      }

      const invoiceDate = parseDate(inv['Created Date']);
      const dueDate = addDays(invoiceDate, 30);
      const totalAmount = parseAmount(inv['Gross Amount']);
      const gstAmount = parseAmount(inv['Tax Amount']);
      const subtotal = totalAmount - gstAmount;

      const customer = clients.find(c => c['Organization Name'] === inv['Organization Name']);
      const country = customer ? inferCountry(customer.Address, customer['Organization Name']) : 'Other';
      const currency = getCurrency(country);
      const status = isPastDue(invoiceDate, today) ? 'overdue' : 'sent';

      const serviceLines = invoiceItems.map(item => ({
        description: item['Add Item'],
        quantity: parseAmount(item.Qty),
        rate: parseAmount(item.Rate),
        amount: parseAmount(item.Amount),
        currency,
      }));

      const invoice = {
        id: uuidv4(),
        user_id: userId,
        invoice_number: inv['Invoice No.'],
        customer_id: customerId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        service_month: formatServiceMonth(invoiceDate),
        currency,
        subtotal,
        gst_rate: gstAmount > 0 ? 18 : 0,
        gst_amount: gstAmount,
        total_amount: totalAmount,
        status,
        paid_amount: 0,
        service_lines: serviceLines,
      };

      const { error } = await supabase.from('invoices').insert([invoice]);
      if (error) {
        if (!error.message.includes('duplicate')) {
          console.warn(`⚠️  ${inv['Invoice No.']}: ${error.message}`);
        }
      } else {
        invoiceCount++;
      }
    }
    console.log(`✅ Migrated ${invoiceCount} invoices\n`);

    // ====== VALIDATION ======
    console.log('🔍 Validating Migration...');

    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: examTypeCount } = await supabase
      .from('exam_types')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: invoiceTotal, data: invoiceList } = await supabase
      .from('invoices')
      .select('total_amount, status')
      .eq('user_id', userId)
      .order('invoice_date', { ascending: false });

    console.log(`✅ Customers: ${customerCount} records`);
    console.log(`✅ Exam Types: ${examTypeCount} records`);
    console.log(`✅ Invoices: ${invoiceTotal} records`);

    if (invoiceList && invoiceList.length > 0) {
      const totalInvoiced = invoiceList.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
      const overdueCount = invoiceList.filter(inv => inv.status === 'overdue').length;
      const sentCount = invoiceList.filter(inv => inv.status === 'sent').length;

      console.log(`\n💰 Financial Summary:`);
      console.log(`   Total Invoiced: ₹${totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
      console.log(`   Outstanding: ₹${totalInvoiced.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
      console.log(`   Overdue: ${overdueCount} invoices`);
      console.log(`   Sent: ${sentCount} invoices\n`);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Refresh browser (F5)');
    console.log('   2. Check Invoices tab');
    console.log('   3. View dashboard summary');
    console.log('   4. Build Phase 3: Reports & Analytics\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Execute
migrateLegacyData().then(() => process.exit(0)).catch(error => {
  console.error(error);
  process.exit(1);
});
