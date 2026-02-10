import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CreateSubUserRequest {
  username: string;
  password: string;
  full_name: string;
  role?: string;
}

interface UpdateSubUserRequest {
  sub_user_id: string;
  username?: string;
  password?: string;
  full_name?: string;
  role?: string;
}

interface AuthenticateRequest {
  admin_email: string;
  username: string;
  password: string;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const serviceRoleKey =
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing SERVICE_ROLE_KEY secret' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      serviceRoleKey
    );

    const url = new URL(req.url);
    const path = url.pathname;

    if (path.endsWith('/create') && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Non autorisé' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Non autorisé' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body: CreateSubUserRequest = await req.json();
      const { username, password, full_name, role = 'employee' } = body;

      if (!username || !password || !full_name) {
        return new Response(
          JSON.stringify({ error: 'Username, password et nom complet requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: existing } = await supabaseAdmin
        .from('sub_users')
        .select('id')
        .eq('parent_user_id', user.id)
        .eq('username', username)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ error: 'Ce nom d\'utilisateur existe déjà' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const password_hash = await hashPassword(password);

      const { data: subUser, error: insertError } = await supabaseAdmin
        .from('sub_users')
        .insert({
          parent_user_id: user.id,
          username,
          password_hash,
          full_name,
          role,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la création de l\'utilisateur', details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data: subUser }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path.endsWith('/update') && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Non autorisé' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Non autorisé' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body: UpdateSubUserRequest = await req.json();
      const { sub_user_id, username, password, full_name, role } = body;

      if (!sub_user_id) {
        return new Response(
          JSON.stringify({ error: 'ID du sous-utilisateur requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: subUser } = await supabaseAdmin
        .from('sub_users')
        .select('parent_user_id')
        .eq('id', sub_user_id)
        .maybeSingle();

      if (!subUser || subUser.parent_user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Sous-utilisateur non trouvé ou non autorisé' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (username) {
        const { data: existing } = await supabaseAdmin
          .from('sub_users')
          .select('id')
          .eq('parent_user_id', user.id)
          .eq('username', username)
          .neq('id', sub_user_id)
          .maybeSingle();

        if (existing) {
          return new Response(
            JSON.stringify({ error: 'Ce nom d\'utilisateur existe déjà' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      const updateData: any = {};
      if (username) updateData.username = username;
      if (full_name) updateData.full_name = full_name;
      if (role) updateData.role = role;
      if (password) updateData.password_hash = await hashPassword(password);
      updateData.updated_at = new Date().toISOString();

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('sub_users')
        .update(updateData)
        .eq('id', sub_user_id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la mise à jour', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data: updated }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (path.endsWith('/authenticate') && req.method === 'POST') {
      const body: AuthenticateRequest = await req.json();
      const { admin_email, username, password } = body;

      if (!admin_email || !username || !password) {
        return new Response(
          JSON.stringify({ error: 'Email, username et mot de passe requis' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: adminUser, error: adminError } = await supabaseAdmin.auth.admin.listUsers();

      if (adminError) {
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la recherche de l\'admin' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const admin = adminUser.users.find(u => u.email === admin_email);

      if (!admin) {
        return new Response(
          JSON.stringify({ error: 'Email admin introuvable' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('username')
        .eq('id', admin.id)
        .maybeSingle();

      if (adminProfile?.username === username) {
        const { data: session, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email: admin_email,
          password,
        });

        if (signInError) {
          return new Response(
            JSON.stringify({ error: 'Mot de passe incorrect' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            data: {
              session: session.session,
              user: session.user,
              is_admin: true,
              sub_user: null,
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: subUser } = await supabaseAdmin
        .from('sub_users')
        .select('*')
        .eq('parent_user_id', admin.id)
        .eq('username', username)
        .eq('is_active', true)
        .maybeSingle();

      if (!subUser) {
        return new Response(
          JSON.stringify({ error: 'Utilisateur introuvable' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const isPasswordValid = await verifyPassword(password, subUser.password_hash);

      if (!isPasswordValid) {
        return new Response(
          JSON.stringify({ error: 'Mot de passe incorrect' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabaseAdmin
        .from('sub_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', subUser.id);

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: admin.email!,
      });

      if (linkError || !linkData) {
        console.error('Generate link error:', linkError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la création de la session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const hashed_token = linkData.properties?.hashed_token;

      if (!hashed_token) {
        console.error('No hashed_token in linkData:', linkData);
        return new Response(
          JSON.stringify({ error: 'Token manquant', debug: JSON.stringify(linkData) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
        token_hash: hashed_token,
        type: 'magiclink',
      });

      if (sessionError || !sessionData?.session) {
        console.error('Verify OTP error:', sessionError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la vérification du token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            admin_email,
            admin_id: admin.id,
            session: sessionData.session,
            user: sessionData.user,
            sub_user: {
              id: subUser.id,
              username: subUser.username,
              full_name: subUser.full_name,
              role: subUser.role,
            },
            is_admin: false,
            authenticated: true,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Route non trouvée' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
