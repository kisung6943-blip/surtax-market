import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ztwcavsuirjyswlswcbz.supabase.co';
const supabaseAnonKey = 'sb_publishable_loULoGIajyiA4vmSzRdg3g_40DYjIIC';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function dumpAll() {
  const { data, error } = await supabase
    .from('surtax_data')
    .select('*');

  if (error) {
    console.error('Error fetching all data:', error);
    return;
  }

  data.forEach(row => {
    console.log(`Row ID: ${row.id}`);
    if (row.data) {
        if (Array.isArray(row.data)) {
            const hasData = row.data.some((m: any) => (m.revenues?.length > 0 || m.purchases?.length > 0 || m.ads?.length > 0));
            console.log(`  Type: Array, Has Data: ${hasData}`);
        } else {
            console.log(`  Type: ${typeof row.data}`);
        }
    } else {
        console.log('  Data is null or undefined');
    }
  });
}

dumpAll();
