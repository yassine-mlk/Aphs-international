import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface SystemSettings {
  email_notifications_enabled: boolean;
}

export function useSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    email_notifications_enabled: true
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('email_notifications_enabled')
        .single();

      if (error) throw error;
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, refreshSettings: fetchSettings };
}
