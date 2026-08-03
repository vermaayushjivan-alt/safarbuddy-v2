'use client';

import { createClient } from '@/lib/supabase/client';

export async function getClientSession() {
  const supabase = createClient();
  
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Client session error:', error);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to get client session:', error);
    return null;
  }
}

export async function getClientUser() {
  const supabase = createClient();
  
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('Client user error:', error);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Failed to get client user:', error);
    return null;
  }
}

export async function refreshClientSession() {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      console.error('Client refresh error:', error);
      return null;
    }

    return data.session;
  } catch (error) {
    console.error('Failed to refresh client session:', error);
    return null;
  }
}

export async function clientSignOut() {
  const supabase = createClient();
  
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Client sign out error:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Failed to sign out:', error);
    return false;
  }
}
