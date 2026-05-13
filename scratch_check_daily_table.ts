import { createClient } from '@supabase/supabase-js';

// Credentials from surtax-daily/src/lib/supabase.ts
const supabaseUrl = 'https://wdjwvvukhirdkykwtich.supabase.co';
const supabaseAnonKey = 'sb_publishable_yFrwDH1QXNdpsCj_JitRmQ_VF6nQ6VB';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function dumpAll() {
  const { data, error } = await supabase
    .from('surtax_daily_data')
    .select('*');

  if (error) {
    console.error('Error fetching all data from daily project:', error);
    return;
  }

  console.log('Rows in surtax_daily_data:');
  data.forEach(row => {
    console.log(`Row ID: ${row.id}`);
    // Check if it has the expected structure
    if (row.data) {
        console.log(`  Data type: ${typeof row.data}`);
        if (Array.isArray(row.data)) {
            const hasData = row.data.some((m: any) => (m.revenues?.length > 0 || m.purchases?.length > 0 || m.ads?.length > 0));
            console.log(`  Has Data: ${hasData}`);
        }
    }
  });
}

dumpAll();
