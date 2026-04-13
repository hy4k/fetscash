import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Types
interface LegacyClient {
  'Organization Name': string;
  'Contact Number': string;
  Email: string;
  Address: string;
  'Contact Person': string;
  'Tax ID': string;
  'Total Invoices': string;
}

interface LegacyInvoice {
  'Invoice No.': string;
  'Organization Name': string;
  'Created Date': string;
  Amount: string;
  'Tax Amount': string;
  'Gross Amount': string;
}

interface LegacyInvoiceItem {
  'Invoice No.': string;
  'Client Name': string;
  'Add Item': string;
  Qty: string;
  Rate: string;
  Tax: string;
  'Tax Amount': string;
  Amount: string;
  Description: string;
  'Product Code': string;
}

interface LegacyProduct {
  'Product Name': string;
  'HSN Code': string;
  'Sale Rate': string;
  'Tax Rate': string;
}

// ====== HELPER FUNCTIONS ======

function parseDate(dateStr: string): string {
  // Format: "11-03-2026" or "11-03-2026                    "
  const cleaned = dateStr.trim();
  const [day, month, year] = cleaned.split('-');
  return `${year}-${month}-${day}`; // Convert to YYYY-MM-DD
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function inferCountry(address: string, orgName: string): 'India' | 'USA' | 'UK' | 'Canada' | 'Other' {
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

function getCurrency(country: 'India' | 'USA' | 'UK' | 'Canada' | 'Other'): 'INR' | 'USD' | 'EUR' | 'GBP' | 'CAD' {
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
      return 'USD'; // Default for international
  }
}

function generateExamCode(productName: string): string {
  // Generate a code from product name
  const codeMap: { [key: string]: string } = {
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

function parseAmount(amountStr: string): number {
  // Remove currency symbols and commas: "₹ 1,804.86" or "1,804.86"
  return parseFloat(amountStr.replace(/[₹$,\s]/g, ''));
}

function formatServiceMonth(dateStr: string): string {
  const date = new Date(dateStr);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function isPastDue(invoiceDateStr: string, today: Date = new Date()): boolean {
  const invoiceDate = new Date(invoiceDateStr);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + 30);
  return dueDate < today;
}

// ====== MAIN MIGRATION FUNCTION ======

async function migrateLegacyData(userId: string) {
  console.log('\n🚀 Starting Legacy Data Migration...\n');

  try {
    // Read CSV files
    console.log('📖 Reading CSV files...');
    const clientsData = readFileSync('./data-import/legacy/Clients.csv', 'utf-8');
    const invoicesData = readFileSync('./data-import/legacy/Invoice.csv', 'utf-8');
    const itemsData = readFileSync('./data-import/legacy/InvoiceItems.csv', 'utf-8');
    const productsData = readFileSync('./data-import/legacy/Products.csv', 'utf-8');

    const clients: LegacyClient[] = parse(clientsData, { columns: true, skip_empty_lines: true });
    const invoices: LegacyInvoice[] = parse(invoicesData, { columns: true, skip_empty_lines: true });
    const items: LegacyInvoiceItem[] = parse(itemsData, { columns: true, skip_empty_lines: true });
    const products: LegacyProduct[] = parse(productsData, { columns: true, skip_empty_lines: true });

    console.log(`✅ Parsed ${clients.length} clients`);
    console.log(`✅ Parsed ${invoices.length} invoices`);
    console.log(`✅ Parsed ${items.length} line items`);
    console.log(`✅ Parsed ${products.length} products\n`);

    // ====== STEP 1: MIGRATE EXAM TYPES ======
    console.log('📚 Migrating Exam Types...');
    const examTypeMap = new Map<string, string>(); // product name → exam_type id

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
        default_rate_usd: Math.round(rate / 83), // Approximate conversion
        status: 'active' as const,
      };

      examTypeMap.set(product['Product Name'], examType.id);

      const { error } = await supabase.from('exam_types').insert([examType]);
      if (error) console.warn(`⚠️  Failed to insert ${code}:`, error.message);
    }
    console.log(`✅ Migrated ${examTypeMap.size} exam types\n`);

    // ====== STEP 2: MIGRATE CUSTOMERS ======
    console.log('👥 Migrating Customers...');
    const customerMap = new Map<string, string>(); // organization name → customer id

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
        payment_terms: 30, // Default to 30 days
        currency,
        gst_number: client['Tax ID'] !== '-' ? client['Tax ID'] : undefined,
        status: 'active' as const,
      };

      customerMap.set(client['Organization Name'], customer.id);

      const { error } = await supabase.from('customers').insert([customer]);
      if (error) console.warn(`⚠️  Failed to insert customer ${customer.name}:`, error.message);
    }
    console.log(`✅ Migrated ${customerMap.size} customers\n`);

    // ====== STEP 3: MIGRATE INVOICES WITH LINE ITEMS ======
    console.log('📄 Migrating Invoices...');
    let invoiceCount = 0;
    const today = new Date();

    for (const inv of invoices) {
      const customerId = customerMap.get(inv['Organization Name']);
      if (!customerId) {
        console.warn(`⚠️  Skipping invoice ${inv['Invoice No.']} - customer not found`);
        continue;
      }

      // Get invoice items
      const invoiceItems = items.filter(item => item['Invoice No.'] === inv['Invoice No.']);
      if (invoiceItems.length === 0) {
        console.warn(`⚠️  Skipping invoice ${inv['Invoice No.']} - no line items`);
        continue;
      }

      // Calculate amounts
      const invoiceDate = parseDate(inv['Created Date']);
      const dueDate = addDays(invoiceDate, 30);
      const totalAmount = parseAmount(inv['Gross Amount']);
      const gstAmount = parseAmount(inv['Tax Amount']);
      const subtotal = totalAmount - gstAmount;

      // Infer currency and status
      const customer = clients.find(c => c['Organization Name'] === inv['Organization Name']);
      const country = customer ? inferCountry(customer.Address, customer['Organization Name']) : 'Other';
      const currency = getCurrency(country);
      const status = isPastDue(invoiceDate, today) ? 'overdue' : 'sent';

      // Create service lines
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
        paid_amount: 0, // No payment records in legacy
        service_lines: serviceLines,
      };

      const { error } = await supabase.from('invoices').insert([invoice]);
      if (error) {
        console.warn(`⚠️  Failed to insert invoice ${inv['Invoice No.']}:`, error.message);
      } else {
        invoiceCount++;
      }
    }
    console.log(`✅ Migrated ${invoiceCount} invoices\n`);

    // ====== STEP 4: VALIDATION ======
    console.log('🔍 Validating Migration...');

    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: examTypeCount } = await supabase
      .from('exam_types')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: invoiceCount: invoiceTotal, data: invoiceList } = await supabase
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
      console.log(`   Overdue Invoices: ${overdueCount}`);
      console.log(`   Sent Invoices: ${sentCount}\n`);
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('📝 Next Steps:');
    console.log('   1. Refresh the dashboard to see historical data');
    console.log('   2. View invoice aging report');
    console.log('   3. Build Phase 3: Reports & Analytics');
    console.log('   4. Reconcile with bank statements (Phase 4)\n');

    return { success: true, customerCount, examTypeCount, invoiceCount: invoiceTotal };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// ====== EXECUTION ======
const userId = process.argv[2] || 'test-user-id';
console.log(`\n📊 Legacy Data Migration Tool`);
console.log(`📅 User ID: ${userId}\n`);

migrateLegacyData(userId)
  .then(result => {
    console.log('Migration Summary:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration Error:', error);
    process.exit(1);
  });
