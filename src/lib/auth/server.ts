import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { cache } from 'react';

export const createServerSupabaseClient = cache(() => {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
});

export const getServerSession = cache(async () => {
  const supabase = createServerSupabaseClient();
  
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Server session error:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to get server session:', error);
    return null;
  }
});

export const getServerUser = cache(async () => {
  const supabase = createServerSupabaseClient();
  
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Server user error:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Failed to get server user:', error);
    return null;
  }
});

export const requireAuth = async () => {
  const session = await getServerSession();
  
  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
};

export const requireUser = async () => {
  const user = await getServerUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
};
