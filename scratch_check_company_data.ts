import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ztwcavsuirjyswlswcbz.supabase.co';
const supabaseAnonKey = 'sb_publishable_loULoGIajyiA4vmSzRdg3g_40DYjIIC';
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
    console.log(`Data found in Supabase for ${id}:`);
    rawData.forEach((m: any) => {
      console.log(`Month ${m.month}: ${m.revenues?.length || 0} revs, ${m.purchases?.length || 0} purs, ${m.ads?.length || 0} ads`);
    });
  } else {
    console.log(`No data found for ${id}`);
  }
}

checkData('surtax_market_data_company_1778021612050');
