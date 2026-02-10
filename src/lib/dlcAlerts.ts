import { supabase } from './supabase';
import { createNotification } from './notifications';

export interface DLCEntry {
  id: string;
  product_id: string;
  quantity: number;
  dlc_date: string;
  alert_days_before: number;
  status: string;
  created_at: string;
  product?: {
    name: string;
    barcode: string;
  };
}

export async function checkDLCAlerts(): Promise<void> {
  try {
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('user_id, dlc_alerts_enabled, dlc_alert_days')
      .eq('dlc_alerts_enabled', true);

    if (settingsError) throw settingsError;

    if (!settings || settings.length === 0) {
      return;
    }

    const today = new Date();

    for (const userSettings of settings) {
      const alertDate = new Date();
      alertDate.setDate(today.getDate() + userSettings.dlc_alert_days);

      const { data: entries, error: entriesError } = await supabase
        .from('dlc_entries')
        .select(`
          *,
          product:products(name, barcode)
        `)
        .eq('status', 'active')
        .lte('dlc_date', alertDate.toISOString().split('T')[0])
        .gte('dlc_date', today.toISOString().split('T')[0]);

      if (entriesError) throw entriesError;

      for (const entry of entries || []) {
        const dlcDate = new Date(entry.dlc_date);
        const daysUntilExpiry = Math.ceil((dlcDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        await createNotification(userSettings.user_id, {
          type: 'dlc_alert',
          title: 'Alerte DLC',
          message: `${entry.product.name} expire dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''} (${entry.quantity} unité${entry.quantity > 1 ? 's' : ''})`,
          related_id: entry.id
        });

        await supabase
          .from('dlc_entries')
          .update({ status: 'alerted' })
          .eq('id', entry.id);
      }
    }
  } catch (error) {
    console.error('Error checking DLC alerts:', error);
  }
}

export async function getDLCEntriesNearExpiry(daysAhead: number = 7): Promise<DLCEntry[]> {
  try {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const { data, error } = await supabase
      .from('dlc_entries')
      .select(`
        *,
        product:products(name, barcode)
      `)
      .eq('status', 'active')
      .lte('dlc_date', futureDate.toISOString().split('T')[0])
      .gte('dlc_date', today.toISOString().split('T')[0])
      .order('dlc_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching DLC entries:', error);
    return [];
  }
}

export async function getExpiredDLCEntries(): Promise<DLCEntry[]> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('dlc_entries')
      .select(`
        *,
        product:products(name, barcode)
      `)
      .eq('status', 'active')
      .lt('dlc_date', today)
      .order('dlc_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching expired DLC entries:', error);
    return [];
  }
}

export function getDaysUntilExpiry(dlcDate: string): number {
  const today = new Date();
  const expiry = new Date(dlcDate);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function isExpired(dlcDate: string): boolean {
  return getDaysUntilExpiry(dlcDate) < 0;
}

export function isExpiringSoon(dlcDate: string, daysThreshold: number = 3): boolean {
  const daysUntil = getDaysUntilExpiry(dlcDate);
  return daysUntil >= 0 && daysUntil <= daysThreshold;
}
