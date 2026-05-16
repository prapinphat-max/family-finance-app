import { createClient } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Hook: useSupabaseQuery - ใช้สำหรับ fetch data
export function useSupabaseQuery(table, userId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: result, error: err } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', userId);
        
        if (err) throw err;
        setData(result || []);
      } catch (err) {
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    if (userId) fetchData();
  }, [table, userId]);

  return { data, loading, error };
}

// Hook: useSupabaseMutation - ใช้สำหรับ Insert/Update/Delete
export function useSupabaseMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const insert = async (table, data) => {
    try {
      setLoading(true);
      const { data: result, error: err } = await supabase
        .from(table)
        .insert([data])
        .select();
      if (err) throw err;
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const update = async (table, id, data) => {
    try {
      setLoading(true);
      const { data: result, error: err } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select();
      if (err) throw err;
      return { success: true, data: result };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const delete_item = async (table, id) => {
    try {
      setLoading(true);
      const { error: err } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      if (err) throw err;
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { insert, update, delete_: delete_item, loading, error };
}

// Hook: useAuth - ใช้สำหรับ authentication
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(session?.user || null);
      } catch (err) {
        console.error('Auth error:', err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Login error:', err.message);
      return { success: false, error: err };
    }
  };

  const signup = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Signup error:', err.message);
      return { success: false, error: err };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err.message);
    }
  };

  return { user, loading, login, signup, logout };
}