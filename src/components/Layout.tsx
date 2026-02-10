import { ReactNode, useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { FiHome, FiCalendar, FiDollarSign, FiPackage, FiCheckSquare, FiUsers, FiMenu, FiX, FiLogOut, FiShoppingCart, FiMessageSquare, FiBell } from 'react-icons/fi'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, user, signOut } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    if (user) {
      fetchUnreadCounts()
      const notifSubscription = setupNotificationSubscription()
      const msgSubscription = setupMessageSubscription()
      return () => {
        notifSubscription.unsubscribe()
        msgSubscription.unsubscribe()
      }
    }
  }, [user])

  const setupNotificationSubscription = () => {
    return supabase
      .channel('layout-notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        fetchUnreadCounts()
      })
      .subscribe()
  }

  const setupMessageSubscription = () => {
    return supabase
      .channel('layout-messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `sent_to=eq.${user?.id}`
      }, () => {
        fetchUnreadCounts()
      })
      .subscribe()
  }

  const fetchUnreadCounts = async () => {
    if (!user) return

    const { count: notifCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sent_to', user.id)
      .eq('is_read', false)

    setUnreadNotifications(notifCount || 0)
    setUnreadMessages(msgCount || 0)
  }

  const menuItems = [
    { path: '/', icon: FiHome, label: 'Tableau de bord' },
    { path: '/products', icon: FiPackage, label: 'Produits' },
    { path: '/dlc', icon: FiCalendar, label: 'Gestion DLC' },
    { path: '/cash-count', icon: FiDollarSign, label: 'Comptage caisse' },
    { path: '/manual-count', icon: FiShoppingCart, label: 'Commandes' },
    { path: '/tasks', icon: FiCheckSquare, label: 'Tâches' },
    { path: '/messages', icon: FiMessageSquare, label: 'Messagerie', badge: unreadMessages },
    { path: '/notifications', icon: FiBell, label: 'Notifications', badge: unreadNotifications },
  ]

  if (profile?.role === 'admin') {
    menuItems.push({ path: '/users', icon: FiUsers, label: 'Utilisateurs' })
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gray-50)' }}>
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1000,
          background: 'white',
          width: 48,
          height: 48,
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        }}
      >
        {sidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>

      <aside
        style={{
          width: 280,
          background: 'white',
          borderRight: '1px solid var(--gray-200)',
          position: 'fixed',
          height: '100vh',
          left: sidebarOpen ? 0 : -280,
          top: 0,
          transition: 'left 0.3s ease',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--gray-200)' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--primary)', marginTop: 48 }}>
            Super Frais
          </h1>
          <p style={{ fontSize: 14, color: 'var(--gray-500)', marginTop: 4 }}>
            {profile?.full_name}
          </p>
          <span
            className={`badge ${profile?.role === 'admin' ? 'badge-success' : 'badge-info'}`}
            style={{ marginTop: 8 }}
          >
            {profile?.role === 'admin' ? 'Administrateur' : 'Employé'}
          </span>
        </div>

        <nav style={{ flex: 1, padding: 'var(--spacing-md)' }}>
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path)
                  setSidebarOpen(false)
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 8,
                  background: isActive ? 'var(--primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--gray-700)',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: 16,
                  position: 'relative',
                }}
              >
                <Icon size={20} />
                {item.label}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: isActive ? 'white' : 'var(--primary)',
                      color: isActive ? 'var(--primary)' : 'white',
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      minWidth: 24,
                      textAlign: 'center',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div style={{ padding: 'var(--spacing-md)', borderTop: '1px solid var(--gray-200)' }}>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger)',
              color: 'white',
              fontWeight: 500,
              fontSize: 16,
            }}
          >
            <FiLogOut size={20} />
            Déconnexion
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998,
          }}
        />
      )}

      <main
        style={{
          flex: 1,
          padding: 'var(--spacing-lg)',
          marginLeft: 0,
          minHeight: '100vh',
        }}
      >
        <div style={{ maxWidth: 1400, margin: '0 auto', paddingTop: 64 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
