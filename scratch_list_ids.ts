import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ztwcavsuirjyswlswcbz.supabase.co';
const supabaseAnonKey = 'sb_publishable_loULoGIajyiA4vmSzRdg3g_40DYjIIC';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listIds() {
  const { data, error } = await supabase
    .from('surtax_data')
    .select('id');

  if (error) {
    console.error('Error fetching IDs:', error);
    return;
  }

  console.log('IDs in surtax_data:', data.map(item => item.id));
}

listIds();
