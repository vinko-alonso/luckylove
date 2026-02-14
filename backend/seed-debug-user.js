import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EMAIL = 'base@luckylove.dev';
const PASSWORD = 'Base1234!';
const CONNECT_CODE = 'BASE123';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const { data: listData, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) throw listError;

  const normalized = EMAIL.toLowerCase();
  const existing = listData?.users?.find(u => u.email?.toLowerCase() === normalized);

  let userId = existing?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: normalized,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
  }

  // Asegura perfil
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({
      user_id: userId,
      email: EMAIL,
      connect_code: CONNECT_CODE,
      alias: 'Base',
    });

  if (profileError) throw profileError;

  console.log('Debug user OK:', userId);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});