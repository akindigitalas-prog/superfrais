import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { FiAlertCircle, FiCheckCircle, FiClock, FiTrendingUp } from 'react-icons/fi'
import { format, parseISO, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

interface DLCEntry {
  id: string
  product_id: string
  quantity: number
  dlc_date: string
  alert_days_before: number
  status: string
  products: {
    name: string
  }
}

interface Stats {
  activeAlerts: number
  pendingTasks: number
  todayCashCount: boolean
  totalProducts: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [stats, setStats] = useState<Stats>({
    activeAlerts: 0,
    pendingTasks: 0,
    todayCashCount: false,
    totalProducts: 0,
  })
  const [recentAlerts, setRecentAlerts] = useState<DLCEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    if (!profile) {
      setLoading(false)
      return
    }

    try {
      const today = format(new Date(), 'yyyy-MM-dd')

      const { data: dlcData } = await supabase
        .from('dlc_entries')
        .select('*, products(name)')
        .eq('status', 'active')

      const alertEntries = dlcData?.filter((entry) => {
        const daysUntilDLC = differenceInDays(parseISO(entry.dlc_date), new Date())
        return daysUntilDLC <= entry.alert_days_before && daysUntilDLC >= 0
      }) || []

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .or(`assigned_to.eq.${profile.id},created_by.eq.${profile.id}`)
        .eq('status', 'pending')

      const { data: cashCountData } = await supabase
        .from('cash_counts')
        .select('*')
        .eq('count_date', today)
        .maybeSingle()

      const { count: productsCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })

      setStats({
        activeAlerts: alertEntries.length,
        pendingTasks: tasksData?.length || 0,
        todayCashCount: !!cashCountData,
        totalProducts: productsCount || 0,
      })

      setRecentAlerts(alertEntries.slice(0, 5))
    } catch (error) {
      console.error('Erreur lors du chargement du tableau de bord:', error)
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
          Bienvenue, {profile?.full_name}
        </h1>
        <p style={{ color: 'var(--gray-600)', fontSize: 16 }}>
          Voici un aperçu de l'activité du magasin
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--spacing-lg)',
          marginBottom: 'var(--spacing-xl)',
        }}
      >
        <div
          className="card"
          style={{
            background: stats.activeAlerts > 0 ? 'var(--danger)' : 'var(--success)',
            color: 'white',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/dlc')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <FiAlertCircle size={40} />
            <div>
              <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Alertes DLC</p>
              <p style={{ fontSize: 32, fontWeight: 700 }}>{stats.activeAlerts}</p>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            background: stats.pendingTasks > 0 ? 'var(--warning)' : 'var(--success)',
            color: 'white',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/tasks')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <FiClock size={40} />
            <div>
              <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Tâches en attente</p>
              <p style={{ fontSize: 32, fontWeight: 700 }}>{stats.pendingTasks}</p>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            background: stats.todayCashCount ? 'var(--success)' : 'var(--danger)',
            color: 'white',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/cash-count')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <FiCheckCircle size={40} />
            <div>
              <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Comptage du jour</p>
              <p style={{ fontSize: 24, fontWeight: 700 }}>
                {stats.todayCashCount ? 'Effectué' : 'À faire'}
              </p>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            background: 'var(--secondary)',
            color: 'white',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/dlc')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <FiTrendingUp size={40} />
            <div>
              <p style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Produits enregistrés</p>
              <p style={{ fontSize: 32, fontWeight: 700 }}>{stats.totalProducts}</p>
            </div>
          </div>
        </div>
      </div>

      {recentAlerts.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
            Alertes DLC récentes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {recentAlerts.map((alert) => {
              const daysLeft = differenceInDays(parseISO(alert.dlc_date), new Date())
              return (
                <div
                  key={alert.id}
                  style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--gray-50)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: 4 }}>{alert.products.name}</p>
                    <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>
                      Quantité: {alert.quantity} • DLC: {format(parseISO(alert.dlc_date), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                  <span className="badge badge-danger">
                    {daysLeft} jour{daysLeft > 1 ? 's' : ''} restant{daysLeft > 1 ? 's' : ''}
                  </span>
                </div>
              )
            })}
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/dlc')}
            style={{ width: '100%', marginTop: 'var(--spacing-lg)' }}
          >
            Voir toutes les alertes
          </button>
        </div>
      )}
    </div>
  )
}
