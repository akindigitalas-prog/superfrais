import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import {
  FiBell,
  FiAlertCircle,
  FiMessageSquare,
  FiCheckSquare,
  FiInfo,
  FiCheck,
  FiTrash2,
  FiSettings
} from 'react-icons/fi';
import { format } from 'date-fns';
import {
  markNotificationAsRead,
  deleteNotification,
  requestNotificationPermission,
  getNotificationSettings,
  updateNotificationSettings
} from '../lib/notifications';
import { checkDLCAlerts } from '../lib/dlcAlerts';

interface Notification {
  id: string;
  type: 'dlc_alert' | 'message' | 'task' | 'system';
  title: string;
  message: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationSettings {
  dlc_alerts_enabled: boolean;
  dlc_alert_days: number;
  message_alerts_enabled: boolean;
  task_alerts_enabled: boolean;
  push_enabled: boolean;
}

export default function Notifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    dlc_alerts_enabled: true,
    dlc_alert_days: 2,
    message_alerts_enabled: true,
    task_alerts_enabled: true,
    push_enabled: true
  });
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (user) {
      fetchNotifications();
      loadSettings();
      checkPermission();
      const subscription = setupRealtimeSubscription();
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    if (user && settings.dlc_alerts_enabled) {
      checkDLCAlerts();
    }
  }, [user, settings.dlc_alerts_enabled]);

  const checkPermission = () => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  };

  const setupRealtimeSubscription = () => {
    return supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();
  };

  const loadSettings = async () => {
    if (!user) return;
    const data = await getNotificationSettings(user.id);
    if (data) {
      setSettings(data);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    fetchNotifications();
  };

  const handleDelete = async (notificationId: string) => {
    if (confirm('Supprimer cette notification ?')) {
      await deleteNotification(notificationId);
      fetchNotifications();
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read);
    for (const notification of unreadNotifications) {
      await markNotificationAsRead(notification.id);
    }
    fetchNotifications();
  };

  const handleRequestPermission = async () => {
    const permission = await requestNotificationPermission();
    setPermissionStatus(permission);
    if (permission === 'granted') {
      await updateNotificationSettings(user!.id, { ...settings, push_enabled: true });
      setSettings({ ...settings, push_enabled: true });
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      await updateNotificationSettings(user.id, settings);
      setShowSettings(false);
      alert('Paramètres enregistrés');
    } catch (error) {
      alert('Erreur lors de la sauvegarde des paramètres');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'dlc_alert':
        return <FiAlertCircle size={20} />;
      case 'message':
        return <FiMessageSquare size={20} />;
      case 'task':
        return <FiCheckSquare size={20} />;
      default:
        return <FiInfo size={20} />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'dlc_alert':
        return 'var(--danger)';
      case 'message':
        return 'var(--secondary)';
      case 'task':
        return 'var(--success)';
      default:
        return 'var(--gray-500)';
    }
  };

  const filteredNotifications = notifications.filter(n =>
    filter === 'all' || (filter === 'unread' && !n.is_read)
  );

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            Notifications
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: 16 }}>
            {unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : 'Aucune notification non lue'}
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="btn btn-outline"
        >
          <FiSettings size={18} />
          Paramètres
        </button>
      </div>

      {showSettings && (
        <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
            Paramètres des notifications
          </h2>

          {permissionStatus !== 'granted' && (
            <div style={{
              padding: 'var(--spacing-md)',
              background: '#fef3c7',
              border: '1px solid #fcd34d',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--spacing-lg)',
            }}>
              <p style={{ fontSize: 14, color: '#92400e', marginBottom: 'var(--spacing-sm)' }}>
                Les notifications push ne sont pas activées
              </p>
              <button
                onClick={handleRequestPermission}
                className="btn"
                style={{
                  padding: '8px 16px',
                  background: 'var(--warning)',
                  color: 'white',
                  fontSize: 14,
                }}
              >
                Activer les notifications push
              </button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.dlc_alerts_enabled}
                onChange={(e) => setSettings({ ...settings, dlc_alerts_enabled: e.target.checked })}
                style={{ width: 20, height: 20, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 15, color: 'var(--gray-700)' }}>Alertes DLC</span>
            </label>

            {settings.dlc_alerts_enabled && (
              <div style={{ marginLeft: 32 }}>
                <label className="label" style={{ fontSize: 14, marginBottom: 4 }}>
                  Alerter combien de jours avant l'expiration ?
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={settings.dlc_alert_days}
                  onChange={(e) => setSettings({ ...settings, dlc_alert_days: parseInt(e.target.value) })}
                  className="input"
                  style={{ width: 100 }}
                />
              </div>
            )}

            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.message_alerts_enabled}
                onChange={(e) => setSettings({ ...settings, message_alerts_enabled: e.target.checked })}
                style={{ width: 20, height: 20, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 15, color: 'var(--gray-700)' }}>Alertes messages</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.task_alerts_enabled}
                onChange={(e) => setSettings({ ...settings, task_alerts_enabled: e.target.checked })}
                style={{ width: 20, height: 20, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 15, color: 'var(--gray-700)' }}>Alertes tâches</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', cursor: permissionStatus === 'granted' ? 'pointer' : 'not-allowed' }}>
              <input
                type="checkbox"
                checked={settings.push_enabled}
                onChange={(e) => setSettings({ ...settings, push_enabled: e.target.checked })}
                disabled={permissionStatus !== 'granted'}
                style={{ width: 20, height: 20, cursor: permissionStatus === 'granted' ? 'pointer' : 'not-allowed', opacity: permissionStatus === 'granted' ? 1 : 0.5 }}
              />
              <span style={{ fontSize: 15, color: 'var(--gray-700)', opacity: permissionStatus === 'granted' ? 1 : 0.5 }}>Notifications push</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button
              onClick={handleSaveSettings}
              className="btn btn-primary"
            >
              Enregistrer
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="btn btn-outline"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'btn btn-primary' : 'btn btn-outline'}
              style={{ padding: '8px 16px', fontSize: 14 }}
            >
              Toutes
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={filter === 'unread' ? 'btn btn-primary' : 'btn btn-outline'}
              style={{ padding: '8px 16px', fontSize: 14 }}
            >
              Non lues ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              style={{
                background: 'transparent',
                color: 'var(--primary)',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <FiCheck size={16} />
              Tout marquer comme lu
            </button>
          )}
        </div>

        <div>
          {filteredNotifications.length === 0 ? (
            <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--gray-500)' }}>
              <FiBell size={64} style={{ marginBottom: 16, color: 'var(--gray-300)' }} />
              <p style={{ fontSize: 16 }}>Aucune notification</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                style={{
                  padding: 'var(--spacing-lg)',
                  borderBottom: '1px solid var(--gray-200)',
                  background: !notification.is_read ? 'var(--gray-50)' : 'white',
                  transition: 'background 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--spacing-md)' }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: `${getIconColor(notification.type)}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: getIconColor(notification.type),
                    flexShrink: 0,
                  }}>
                    {getIcon(notification.type)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 'var(--spacing-md)' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-900)', marginBottom: 4 }}>
                          {notification.title}
                        </h3>
                        <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 8, lineHeight: 1.5 }}>
                          {notification.message}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                          {format(new Date(notification.created_at), 'PPp')}
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexShrink: 0 }}>
                        {!notification.is_read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            style={{
                              padding: 8,
                              borderRadius: 'var(--radius-md)',
                              background: 'transparent',
                              color: 'var(--success)',
                            }}
                            title="Marquer comme lu"
                          >
                            <FiCheck size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          style={{
                            padding: 8,
                            borderRadius: 'var(--radius-md)',
                            background: 'transparent',
                            color: 'var(--danger)',
                          }}
                          title="Supprimer"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
