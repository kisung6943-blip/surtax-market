import { createClient } from '@supabase/supabase-js';

// Credentials from surtax-daily/src/lib/supabase.ts
const supabaseUrl = 'https://wdjwvvukhirdkykwtich.supabase.co';
const supabaseAnonKey = 'sb_publishable_yFrwDH1QXNdpsCj_JitRmQ_VF6nQ6VB';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkData(id: string) {
  const { data, error } = await supabase
    .from('surtax_data')
    .select('data')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching data for ${id}:`, error);
    return;
  }

  if (data && data.data) {
    const rawData = data.data;
    console.log(`Data found in Supabase (Daily Project) for ${id}:`);
    rawData.forEach((m: any) => {
      if (m.revenues?.length > 0 || m.purchases?.length > 0 || m.ads?.length > 0) {
        console.log(`Month ${m.month}: ${m.revenues?.length || 0} revs, ${m.purchases?.length || 0} purs, ${m.ads?.length || 0} ads`);
      }
    });
  } else {
    console.log(`No data found for ${id}`);
  }
}

checkData('market_ledger_es');
checkData('surtax_market_data_es');
