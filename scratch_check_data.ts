import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ztwcavsuirjyswlswcbz.supabase.co';
const supabaseAnonKey = 'sb_publishable_loULoGIajyiA4vmSzRdg3g_40DYjIIC';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData() {
  const { data, error } = await supabase
    .from('surtax_data')
    .select('data')
    .eq('id', 'market_ledger_es')
    .single();

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (data && data.data) {
    const rawData = data.data;
    console.log('Data found in Supabase:');
    rawData.forEach((m: any) => {
      console.log(`Month ${m.month}: ${m.revenues?.length || 0} revs, ${m.purchases?.length || 0} purs, ${m.ads?.length || 0} ads`);
    });
  } else {
    console.log('No data found for market_ledger_es');
  }
}

checkData();
