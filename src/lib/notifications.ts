import { supabase } from './supabase';

export interface NotificationData {
  type: 'dlc_alert' | 'message' | 'task' | 'system';
  title: string;
  message: string;
  related_id?: string;
}

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    swRegistration = registration;
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

export async function showLocalNotification(data: NotificationData): Promise<void> {
  const permission = await requestNotificationPermission();

  if (permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  if (!swRegistration) {
    swRegistration = await registerServiceWorker();
  }

  if (swRegistration) {
    await swRegistration.showNotification(data.title, {
      body: data.message,
      icon: '/icon.svg',
      badge: '/icon.svg',
      tag: data.type,
      data: {
        url: getNotificationUrl(data),
        related_id: data.related_id
      },
      requireInteraction: data.type === 'dlc_alert'
    });
  }
}

function getNotificationUrl(data: NotificationData): string {
  switch (data.type) {
    case 'dlc_alert':
      return '/dlc';
    case 'message':
      return '/messages';
    case 'task':
      return '/tasks';
    default:
      return '/';
  }
}

export async function createNotification(userId: string, data: NotificationData): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: data.type,
        title: data.title,
        message: data.message,
        related_id: data.related_id
      });

    if (error) throw error;

    const settings = await getNotificationSettings(userId);

    if (settings?.push_enabled) {
      await showLocalNotification(data);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export async function getNotificationSettings(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    return null;
  }
}

export async function updateNotificationSettings(userId: string, settings: any) {
  try {
    const { error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
}

export async function getUnreadNotifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return [];
  }
}

export async function getAllNotifications(userId: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}
