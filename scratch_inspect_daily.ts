import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wdjwvvukhirdkykwtich.supabase.co';
const supabaseAnonKey = 'sb_publishable_yFrwDH1QXNdpsCj_JitRmQ_VF6nQ6VB';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function dumpFirst() {
  const { data, error } = await supabase
    .from('surtax_daily_data')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('First row keys:', Object.keys(data[0] || {}));
  console.log('First row data summary:');
  if (data[0] && data[0].data) {
      console.log('Data is array:', Array.isArray(data[0].data));
  }
}

dumpFirst();
