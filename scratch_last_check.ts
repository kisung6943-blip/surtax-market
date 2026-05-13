import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ztwcavsuirjyswlswcbz.supabase.co';
const supabaseAnonKey = 'sb_publishable_loULoGIajyiA4vmSzRdg3g_40DYjIIC';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSpecific(id: string) {
  const { data, error } = await supabase
    .from('surtax_data')
    .select('data')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error:`, error);
    return;
  }

  console.log(`Data for ${id}:`, JSON.stringify(data.data).substring(0, 500));
}

checkSpecific('surtax_market_data_company_1778021612050');
