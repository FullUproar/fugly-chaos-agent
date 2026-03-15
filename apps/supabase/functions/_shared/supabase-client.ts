import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Admin client with service role key — bypasses RLS for edge function writes
export function getAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// Get the authenticated user's ID from the request JWT
export async function getAuthUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user } } = await client.auth.getUser();
  return user?.id ?? null;
}
