import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import { registerServiceWorker } from './lib/notifications'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import DLCManagement from './pages/DLCManagement'
import CashCount from './pages/CashCount'
import ManualCount from './pages/ManualCount'
import Tasks from './pages/Tasks'
import Users from './pages/Users'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import Layout from './components/Layout'

function App() {
  const { setUser, setProfile, setSubUser, setIsSubUser, setLoading, user, profile, loading } = useAuthStore()

  useEffect(() => {
    registerServiceWorker()

    supabase.auth.getSession().then(({ data: { session } }) => {
      ;(async () => {
        if (session?.user) {
          const subUserAuth = localStorage.getItem('subUserAuth')

          if (subUserAuth) {
            try {
              const { adminEmail, adminId, subUser } = JSON.parse(subUserAuth)
              setUser(session.user)
              setProfile({
                id: adminId,
                email: adminEmail,
                full_name: subUser.full_name,
                role: subUser.role,
                created_at: new Date().toISOString(),
              })
              setSubUser(subUser)
              setIsSubUser(true)
            } catch (e) {
              localStorage.removeItem('subUserAuth')
            }
          } else {
            setUser(session.user)
            setIsSubUser(false)
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle()

            if (profileData) {
              setProfile(profileData)
            }
          }
          setLoading(false)
        } else {
          setLoading(false)
        }
      })()
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      ;(async () => {
        setUser(session?.user ?? null)
        if (session?.user) {
          const subUserAuth = localStorage.getItem('subUserAuth')

          if (subUserAuth) {
            try {
              const { adminEmail, adminId, subUser } = JSON.parse(subUserAuth)
              setProfile({
                id: adminId,
                email: adminEmail,
                full_name: subUser.full_name,
                role: subUser.role,
                created_at: new Date().toISOString(),
              })
              setSubUser(subUser)
              setIsSubUser(true)
            } catch (e) {
              localStorage.removeItem('subUserAuth')
            }
          } else {
            setIsSubUser(false)
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle()

            if (profileData) {
              setProfile(profileData)
            }
          }
        } else {
          const subUserAuth = localStorage.getItem('subUserAuth')
          if (!subUserAuth) {
            setProfile(null)
            setSubUser(null)
            setIsSubUser(false)
          }
        }
      })()
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, setSubUser, setIsSubUser, setLoading])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--gray-50)',
        }}
      >
        <div className="spinner" />
      </div>
    )
  }

  const isAuthenticated = user || profile

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
        <Route
          path="/"
          element={isAuthenticated ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/products"
          element={isAuthenticated ? <Layout><Products /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/dlc"
          element={isAuthenticated ? <Layout><DLCManagement /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/cash-count"
          element={isAuthenticated ? <Layout><CashCount /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/manual-count"
          element={isAuthenticated ? <Layout><ManualCount /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/tasks"
          element={isAuthenticated ? <Layout><Tasks /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/users"
          element={isAuthenticated ? <Layout><Users /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/messages"
          element={isAuthenticated ? <Layout><Messages /></Layout> : <Navigate to="/login" />}
        />
        <Route
          path="/notifications"
          element={isAuthenticated ? <Layout><Notifications /></Layout> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
