import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAdmin = () => {
  const { user, session } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdminRole = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      console.error('Error checking admin role:', error);
      // If JWT expired, try refreshing session and retry once
      if (error.message?.includes('JWT expired') || error.code === 'PGRST303') {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError) {
          const { data: retryData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .maybeSingle();
          setIsAdmin(!!retryData);
          setLoading(false);
          return;
        }
      }
      setIsAdmin(false);
    } else {
      setIsAdmin(!!data);
    }
    setLoading(false);
  }, [user]);

  // Re-check when user or session changes (session change = token refresh)
  useEffect(() => {
    checkAdminRole();
  }, [checkAdminRole, session]);

  return { isAdmin, loading };
};
