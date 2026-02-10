import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { FiPlus, FiUsers, FiShield, FiUser, FiEdit } from 'react-icons/fi'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Profile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'employee'
  created_at: string
  username?: string
}

interface SubUser {
  id: string
  username: string
  full_name: string
  role: string
  created_at: string
  is_sub_user: boolean
}

export default function Users() {
  const { profile } = useAuthStore()
  const [users, setUsers] = useState<Profile[]>([])
  const [subUsers, setSubUsers] = useState<SubUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showAdminEditForm, setShowAdminEditForm] = useState(false)
  const [editingSubUser, setEditingSubUser] = useState<SubUser | null>(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'admin' | 'employee'>('employee')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (profile?.role !== 'admin') {
      alert('Accès réservé aux administrateurs')
      return
    }
    fetchUsers()
  }, [profile])

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError
      setUsers(profilesData || [])

      const { data: subUsersData, error: subUsersError } = await supabase
        .from('sub_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (subUsersError) throw subUsersError
      setSubUsers((subUsersData || []).map(su => ({ ...su, is_sub_user: true })))
    } catch (error) {
      console.error('Erreur lors du chargement des utilisateurs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session non trouvée')

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sub-user-auth/create`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          full_name: fullName,
          role,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création')
      }

      alert('Utilisateur créé avec succès')
      resetForm()
      fetchUsers()
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + error.message)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: 'admin' | 'employee') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      alert('Rôle modifié avec succès')
      fetchUsers()
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + error.message)
    }
  }

  const handleEditSubUser = (subUser: SubUser) => {
    setEditingSubUser(subUser)
    setUsername(subUser.username)
    setFullName(subUser.full_name)
    setRole(subUser.role as 'admin' | 'employee')
    setPassword('')
    setShowEditForm(true)
  }

  const handleUpdateSubUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingSubUser) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session non trouvée')

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sub-user-auth/update`

      const body: any = {
        sub_user_id: editingSubUser.id,
        username,
        full_name: fullName,
        role,
      }

      if (password) {
        body.password = password
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la mise à jour')
      }

      alert('Utilisateur modifié avec succès')
      resetForm()
      fetchUsers()
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + error.message)
    }
  }

  const handleEditAdmin = () => {
    if (!profile) return
    setUsername(profile.username ?? '')
    setFullName(profile.full_name)
    setEmail(profile.email)
    setPassword('')
    setShowAdminEditForm(true)
  }

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile) return

    try {
      if (username !== (profile.username ?? '') || fullName !== profile.full_name) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            username: username,
            full_name: fullName
          })
          .eq('id', profile.id)

        if (updateError) throw updateError
      }

      if (email !== profile.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email,
        })

        if (emailError) throw emailError

        alert('Un email de confirmation a été envoyé à votre nouvelle adresse. Le changement sera effectif après confirmation.')
      }

      if (password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: password,
        })

        if (passwordError) throw passwordError
      }

      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single()

      if (updatedProfile) {
        useAuthStore.setState({ profile: updatedProfile })
      }

      if (email === profile.email) {
        alert('Vos informations ont été modifiées avec succès')
      }
      resetForm()
      fetchUsers()
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + error.message)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setShowEditForm(false)
    setShowAdminEditForm(false)
    setEditingSubUser(null)
    setUsername('')
    setPassword('')
    setFullName('')
    setRole('employee')
    setEmail('')
  }

  if (profile?.role !== 'admin') {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
        <p style={{ color: 'var(--gray-500)', fontSize: 16 }}>
          Accès réservé aux administrateurs
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            Gestion des utilisateurs
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: 16 }}>
            {users.length + subUsers.length} utilisateur{users.length + subUsers.length > 1 ? 's' : ''} enregistré{users.length + subUsers.length > 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <button
            className="btn btn-outline"
            onClick={handleEditAdmin}
          >
            <FiEdit size={20} />
            Mon profil
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <FiPlus size={20} />
            Nouvel utilisateur
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 'var(--spacing-lg)',
        }}
      >
        {users.map((user) => (
          <div key={`user-${user.id}`} className="card">
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: user.role === 'admin' ? 'var(--primary)' : 'var(--secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--spacing-md)',
                }}
              >
                {user.role === 'admin' ? (
                  <FiShield size={40} color="white" />
                ) : (
                  <FiUser size={40} color="white" />
                )}
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                {user.full_name}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 4 }}>
                @{user.username || 'N/A'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>
                {user.email}
              </p>
              <span
                className={`badge ${user.role === 'admin' ? 'badge-success' : 'badge-info'}`}
              >
                {user.role === 'admin' ? 'Admin Principal' : 'Employé'}
              </span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--gray-600)', textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
              Créé le {format(parseISO(user.created_at), 'dd MMM yyyy', { locale: fr })}
            </div>

            {user.id !== profile?.id && (
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button
                  className={`btn ${user.role === 'admin' ? 'btn-outline' : 'btn-primary'}`}
                  onClick={() => handleUpdateRole(user.id, user.role === 'admin' ? 'employee' : 'admin')}
                  style={{ flex: 1, fontSize: 14, padding: '8px 12px' }}
                >
                  <FiEdit size={16} />
                  {user.role === 'admin' ? 'Rétrograder' : 'Promouvoir'}
                </button>
              </div>
            )}
          </div>
        ))}

        {subUsers.map((subUser) => (
          <div key={`sub-${subUser.id}`} className="card">
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'var(--info)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--spacing-md)',
                }}
              >
                <FiUser size={40} color="white" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                {subUser.full_name}
              </h3>
              <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 8 }}>
                @{subUser.username}
              </p>
              <span className="badge badge-warning">
                Sous-utilisateur
              </span>
            </div>

            <div style={{ fontSize: 12, color: 'var(--gray-600)', textAlign: 'center', marginBottom: 'var(--spacing-md)' }}>
              Créé le {format(parseISO(subUser.created_at), 'dd MMM yyyy', { locale: fr })}
            </div>

            <button
              className="btn btn-primary"
              onClick={() => handleEditSubUser(subUser)}
              style={{ width: '100%', fontSize: 14, padding: '8px 12px' }}
            >
              <FiEdit size={16} />
              Modifier
            </button>
          </div>
        ))}

        {users.length === 0 && subUsers.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', gridColumn: '1 / -1' }}>
            <FiUsers size={48} color="var(--gray-400)" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--gray-500)', fontSize: 16 }}>
              Aucun utilisateur
            </p>
          </div>
        )}
      </div>

      {showForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-lg)',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 500,
              width: '100%',
            }}
          >
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
              Nouvel utilisateur
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Nom complet</label>
                <input
                  type="text"
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ugur"
                  required
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Nom d'utilisateur</label>
                <input
                  type="text"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ugur"
                  required
                />
                <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>
                  L'utilisateur utilisera ce nom pour se connecter
                </p>
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Mot de passe</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label className="label">Rôle</label>
                <select
                  className="input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                >
                  <option value="employee">Employé</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <FiPlus size={20} />
                  Créer
                </button>
                <button type="button" className="btn btn-outline" onClick={resetForm} style={{ flex: 1 }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditForm && editingSubUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-lg)',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 500,
              width: '100%',
            }}
          >
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
              Modifier l'utilisateur
            </h2>

            <form onSubmit={handleUpdateSubUser}>
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Nom complet</label>
                <input
                  type="text"
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Nom d'utilisateur</label>
                <input
                  type="text"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Nouveau mot de passe</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Laisser vide pour ne pas changer"
                  minLength={6}
                />
                <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>
                  Laisser vide pour conserver le mot de passe actuel
                </p>
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label className="label">Rôle</label>
                <select
                  className="input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                >
                  <option value="employee">Employé</option>
                  <option value="admin">Administrateur</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <FiEdit size={20} />
                  Mettre à jour
                </button>
                <button type="button" className="btn btn-outline" onClick={resetForm} style={{ flex: 1 }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAdminEditForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--spacing-lg)',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 500,
              width: '100%',
            }}
          >
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
              Mon profil
            </h2>

            <div style={{
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: 8,
              padding: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-lg)'
            }}>
              <p style={{ fontSize: 14, color: 'var(--gray-700)', marginBottom: 8, fontWeight: 600 }}>
                Modification de l'email
              </p>
              <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 4 }}>
                Si vous changez votre email:
              </p>
              <ul style={{ fontSize: 13, color: 'var(--gray-600)', paddingLeft: 20, margin: 0 }}>
                <li>Un email de confirmation sera envoyé à la nouvelle adresse</li>
                <li>Le changement sera effectif après validation du lien</li>
                <li>Tous vos sous-utilisateurs devront utiliser le nouvel email pour se connecter</li>
              </ul>
            </div>

            <form onSubmit={handleUpdateAdmin}>
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Nom complet</label>
                <input
                  type="text"
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Nom d'utilisateur</label>
                <input
                  type="text"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>
                  Utilisé pour la connexion des sous-utilisateurs
                </p>
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4, fontWeight: 500 }}>
                  Attention: vos sous-utilisateurs devront utiliser ce nouvel email
                </p>
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label className="label">Nouveau mot de passe</label>
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Laisser vide pour ne pas changer"
                  minLength={6}
                />
                <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>
                  Laisser vide pour conserver le mot de passe actuel
                </p>
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <FiEdit size={20} />
                  Mettre à jour
                </button>
                <button type="button" className="btn btn-outline" onClick={resetForm} style={{ flex: 1 }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
