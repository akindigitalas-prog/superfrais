import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { FiLock, FiMail, FiUser } from 'react-icons/fi'

type ViewMode = 'login' | 'signup' | 'forgot-password'

export default function Login() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('login')
  const { signIn, signInSubUser } = useAuthStore()

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    const savedUsername = localStorage.getItem('rememberedUsername')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
    if (savedUsername) {
      setUsername(savedUsername)
    }
  }, [])

  useEffect(() => {
    setError('')
    setSuccess('')
  }, [viewMode])

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
        localStorage.setItem('rememberedUsername', username)
      } else {
        localStorage.removeItem('rememberedEmail')
        localStorage.removeItem('rememberedUsername')
      }

      await signInSubUser(email, username, password)
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) throw signUpError

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email,
            full_name: fullName,
            username: username || fullName.toLowerCase().replace(/\s+/g, ''),
            role: 'employee',
          })

        if (profileError) throw profileError

        await signIn(email, password)
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setSuccess('Un email de réinitialisation a été envoyé à votre adresse.')
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi de l\'email')
    } finally {
      setLoading(false)
    }
  }

  const getSubtitle = () => {
    switch (viewMode) {
      case 'login':
        return 'Connectez-vous à votre compte'
      case 'signup':
        return 'Créez votre compte employé'
      case 'forgot-password':
        return 'Entrez votre email pour réinitialiser votre mot de passe'
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)',
        padding: 'var(--spacing-lg)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: 'var(--spacing-2xl)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
            Super Frais
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: 16 }}>
            {getSubtitle()}
          </p>
        </div>

        {viewMode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label className="label">
                <FiMail style={{ display: 'inline', marginRight: 8 }} />
                Email Admin
              </label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@email.com"
                required
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label className="label">
                <FiUser style={{ display: 'inline', marginRight: 8 }} />
                Nom d'utilisateur
              </label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="votre_nom"
                required
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label className="label">
                <FiLock style={{ display: 'inline', marginRight: 8 }} />
                Mot de passe
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
              <label style={{ display: 'flex', alignItems: 'center', fontSize: 14, color: 'var(--gray-700)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ marginRight: 8 }}
                />
                Se souvenir de moi
              </label>
              <button
                type="button"
                onClick={() => setViewMode('forgot-password')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: 14,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: 'var(--spacing-md)',
                  background: 'var(--danger)',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--spacing-lg)',
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
              disabled={loading}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

            <div style={{ textAlign: 'center', color: 'var(--gray-600)', fontSize: 14 }}>
              Pas encore de compte ?{' '}
              <button
                type="button"
                onClick={() => setViewMode('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: 600,
                }}
              >
                Créer un compte
              </button>
            </div>
          </form>
        )}

        {viewMode === 'signup' && (
          <form onSubmit={handleSignupSubmit}>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label className="label">
                <FiUser style={{ display: 'inline', marginRight: 8 }} />
                Nom complet
              </label>
              <input
                type="text"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jean Dupont"
                required
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label className="label">
                <FiUser style={{ display: 'inline', marginRight: 8 }} />
                Nom d'utilisateur
              </label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="jeandupont"
                required
              />
              <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>
                Ce sera votre identifiant de connexion
              </p>
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label className="label">
                <FiMail style={{ display: 'inline', marginRight: 8 }} />
                Adresse email
              </label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label className="label">
                <FiLock style={{ display: 'inline', marginRight: 8 }} />
                Mot de passe
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
              <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>
                Minimum 6 caractères
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: 'var(--spacing-md)',
                  background: 'var(--danger)',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--spacing-lg)',
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
              disabled={loading}
            >
              {loading ? 'Création...' : 'Créer mon compte'}
            </button>

            <div style={{ textAlign: 'center', color: 'var(--gray-600)', fontSize: 14 }}>
              Déjà un compte ?{' '}
              <button
                type="button"
                onClick={() => setViewMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: 600,
                }}
              >
                Se connecter
              </button>
            </div>
          </form>
        )}

        {viewMode === 'forgot-password' && (
          <form onSubmit={handleForgotPasswordSubmit}>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label className="label">
                <FiMail style={{ display: 'inline', marginRight: 8 }} />
                Adresse email
              </label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>

            {error && (
              <div
                style={{
                  padding: 'var(--spacing-md)',
                  background: 'var(--danger)',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--spacing-lg)',
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: 'var(--spacing-md)',
                  background: 'var(--success)',
                  color: 'white',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--spacing-lg)',
                  fontSize: 14,
                }}
              >
                {success}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
              disabled={loading}
            >
              {loading ? 'Envoi...' : 'Envoyer le lien de réinitialisation'}
            </button>

            <div style={{ textAlign: 'center', color: 'var(--gray-600)', fontSize: 14 }}>
              <button
                type="button"
                onClick={() => setViewMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontWeight: 600,
                }}
              >
                Retour à la connexion
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
