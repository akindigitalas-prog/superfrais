import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { FiCamera, FiPlus, FiDollarSign, FiTrendingUp, FiTrendingDown } from 'react-icons/fi'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface CashCount {
  id: string
  count_date: string
  z_report_photo_url: string | null
  z_report_total: number
  bills_500: number
  bills_200: number
  bills_100: number
  bills_50: number
  bills_20: number
  bills_10: number
  bills_5: number
  coins_2: number
  coins_1: number
  coins_050: number
  coins_020: number
  coins_010: number
  coins_005: number
  coins_002: number
  coins_001: number
  total_cash: number
  previous_float: number
  difference: number
  new_float: number
  created_at: string
  profiles: {
    full_name: string
  }
}

export default function CashCount() {
  const { profile } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [cashCounts, setCashCounts] = useState<CashCount[]>([])
  const [loading, setLoading] = useState(true)

  const [zReportPhoto, setZReportPhoto] = useState<File | null>(null)
  const [zReportTotal, setZReportTotal] = useState(0)
  const [bills500, setBills500] = useState(0)
  const [bills200, setBills200] = useState(0)
  const [bills100, setBills100] = useState(0)
  const [bills50, setBills50] = useState(0)
  const [bills20, setBills20] = useState(0)
  const [bills10, setBills10] = useState(0)
  const [bills5, setBills5] = useState(0)
  const [coins2, setCoins2] = useState(0)
  const [coins1, setCoins1] = useState(0)
  const [coins050, setCoins050] = useState(0)
  const [coins020, setCoins020] = useState(0)
  const [coins010, setCoins010] = useState(0)
  const [coins005, setCoins005] = useState(0)
  const [coins002, setCoins002] = useState(0)
  const [coins001, setCoins001] = useState(0)
  const [previousFloat, setPreviousFloat] = useState(0)
  const [newFloat, setNewFloat] = useState(0)
  const [countDate, setCountDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    fetchCashCounts()
    loadPreviousFloat()
  }, [])

  const fetchCashCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('cash_counts')
        .select('*, profiles(full_name)')
        .order('count_date', { ascending: false })
        .limit(10)

      if (error) throw error
      setCashCounts(data || [])
    } catch (error) {
      console.error('Erreur lors du chargement des comptages:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPreviousFloat = async () => {
    try {
      const { data, error } = await supabase
        .from('cash_counts')
        .select('new_float')
        .order('count_date', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      if (data) {
        setPreviousFloat(data.new_float)
      }
    } catch (error) {
      console.error('Erreur lors du chargement du fond de caisse:', error)
    }
  }

  const calculateTotal = () => {
    return (
      bills500 * 500 +
      bills200 * 200 +
      bills100 * 100 +
      bills50 * 50 +
      bills20 * 20 +
      bills10 * 10 +
      bills5 * 5 +
      coins2 * 2 +
      coins1 * 1 +
      coins050 * 0.5 +
      coins020 * 0.2 +
      coins010 * 0.1 +
      coins005 * 0.05 +
      coins002 * 0.02 +
      coins001 * 0.01
    )
  }

  const totalCash = calculateTotal()
  const expectedTotal = previousFloat + zReportTotal
  const difference = totalCash - expectedTotal

  const uploadPhoto = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `z-reports/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('cash-count-photos')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('cash-count-photos')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      let photoUrl = null
      if (zReportPhoto) {
        photoUrl = await uploadPhoto(zReportPhoto)
      }

      const today = format(new Date(), 'yyyy-MM-dd')
      const countDateValue = countDate || today

      const { error } = await supabase
        .from('cash_counts')
        .insert({
          count_date: countDateValue,
          z_report_photo_url: photoUrl,
          z_report_total: zReportTotal,
          bills_500: bills500,
          bills_200: bills200,
          bills_100: bills100,
          bills_50: bills50,
          bills_20: bills20,
          bills_10: bills10,
          bills_5: bills5,
          coins_2: coins2,
          coins_1: coins1,
          coins_050: coins050,
          coins_020: coins020,
          coins_010: coins010,
          coins_005: coins005,
          coins_002: coins002,
          coins_001: coins001,
          total_cash: totalCash,
          previous_float: previousFloat,
          difference: difference,
          new_float: newFloat,
          created_by: profile!.id,
        })

      if (error) throw error

      alert('Comptage enregistré avec succès')
      resetForm()
      fetchCashCounts()
    } catch (error: any) {
      console.error('Erreur lors de l\'enregistrement:', error)
      alert('Erreur: ' + error.message)
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setZReportPhoto(null)
    setZReportTotal(0)
    setBills500(0)
    setBills200(0)
    setBills100(0)
    setBills50(0)
    setBills20(0)
    setBills10(0)
    setBills5(0)
    setCoins2(0)
    setCoins1(0)
    setCoins050(0)
    setCoins020(0)
    setCoins010(0)
    setCoins005(0)
    setCoins002(0)
    setCoins001(0)
    setNewFloat(0)
    setCountDate(format(new Date(), 'yyyy-MM-dd'))
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
            Comptage de caisse
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: 16 }}>
            Enregistrez vos comptages quotidiens
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          <FiPlus size={20} />
          Nouveau comptage
        </button>
      </div>

      <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
        {cashCounts.map((count) => (
          <div key={count.id} className="card">
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                  {format(parseISO(count.count_date), 'dd MMMM yyyy', { locale: fr })}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 4 }}>
                  Par: {count.profiles.full_name}
                </p>
                <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>
                  {format(parseISO(count.created_at), 'HH:mm', { locale: fr })}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 4 }}>
                  Total caisse compté
                </p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>
                  {count.total_cash.toFixed(2)} €
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <p style={{ fontSize: 12, color: 'var(--gray-600)' }}>
                    {count.difference === 0 ? 'Caisse juste' : count.difference > 0 ? 'Excédent' : 'Manque'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {count.difference >= 0 ? (
                      <FiTrendingUp size={20} color={count.difference === 0 ? 'var(--success)' : 'var(--warning)'} />
                    ) : (
                      <FiTrendingDown size={20} color="var(--danger)" />
                    )}
                    <span
                      className={`badge ${count.difference === 0 ? 'badge-success' : count.difference > 0 ? 'badge-warning' : 'badge-danger'}`}
                    >
                      {count.difference >= 0 ? '+' : ''}{count.difference.toFixed(2)} €
                    </span>
                  </div>
                </div>
              </div>

              {count.z_report_photo_url && (
                <img
                  src={count.z_report_photo_url}
                  alt="Rapport Z"
                  style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                  onClick={() => window.open(count.z_report_photo_url!, '_blank')}
                />
              )}
            </div>

            <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--gray-200)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-sm)', fontSize: 14 }}>
              <div>
                <span style={{ color: 'var(--gray-600)' }}>Fond précédent:</span>
                <span style={{ fontWeight: 600, marginLeft: 8 }}>{count.previous_float.toFixed(2)} €</span>
              </div>
              <div>
                <span style={{ color: 'var(--gray-600)' }}>Rapport Z:</span>
                <span style={{ fontWeight: 600, marginLeft: 8 }}>{count.z_report_total.toFixed(2)} €</span>
              </div>
              <div>
                <span style={{ color: 'var(--gray-600)' }}>Attendu:</span>
                <span style={{ fontWeight: 600, marginLeft: 8 }}>{(count.previous_float + count.z_report_total).toFixed(2)} €</span>
              </div>
              <div>
                <span style={{ color: 'var(--gray-600)' }}>Nouveau fond:</span>
                <span style={{ fontWeight: 600, marginLeft: 8 }}>{count.new_float.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        ))}

        {cashCounts.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
            <FiDollarSign size={48} color="var(--gray-400)" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--gray-500)', fontSize: 16 }}>
              Aucun comptage enregistré
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
            zIndex: 1000,
            overflowY: 'auto',
            padding: '20px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForm(false)
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 700,
              width: '100%',
              margin: '0 auto',
              position: 'relative',
            }}
          >
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
              Nouveau comptage
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label className="label" style={{ fontSize: 16, fontWeight: 600 }}>
                  Date du comptage
                </label>
                <input
                  type="date"
                  className="input"
                  value={countDate}
                  onChange={(e) => setCountDate(e.target.value)}
                />
                <p style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 8 }}>
                  Si aucune date n'est choisie, la date du jour sera utilisÃ©e.
                </p>
              </div>
              <div style={{
                marginBottom: 'var(--spacing-xl)',
                padding: 'var(--spacing-lg)',
                background: 'var(--gray-50)',
                borderRadius: 'var(--radius-lg)',
                border: '2px solid var(--gray-200)'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--gray-700)'
                }}>
                  <FiCamera size={20} style={{ marginRight: 8 }} />
                  Photo du rapport Z
                </label>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px dashed var(--gray-300)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: 'white',
                    color: 'var(--gray-700)',
                    fontSize: 14
                  }}
                  onChange={(e) => e.target.files && setZReportPhoto(e.target.files[0])}
                />
                {zReportPhoto && (
                  <p style={{
                    fontSize: 13,
                    marginTop: 12,
                    padding: '8px 12px',
                    background: 'var(--success-light)',
                    color: 'var(--success)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 500
                  }}>
                    Photo sélectionnée: {zReportPhoto.name}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label className="label" style={{ fontSize: 16, fontWeight: 600 }}>
                  Total du rapport Z (ventes du jour)
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={zReportTotal}
                  onChange={(e) => setZReportTotal(parseFloat(e.target.value) || 0)}
                  placeholder="Saisir le total du rapport Z"
                  required
                  style={{ fontSize: 18, fontWeight: 600 }}
                />
                <p style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 8 }}>
                  Montant total des ventes indiqué sur le rapport Z de la caisse enregistreuse
                </p>
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                  Billets
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)' }}>
                  {[
                    { label: '500 €', value: bills500, setter: setBills500, multiplier: 500 },
                    { label: '200 €', value: bills200, setter: setBills200, multiplier: 200 },
                    { label: '100 €', value: bills100, setter: setBills100, multiplier: 100 },
                    { label: '50 €', value: bills50, setter: setBills50, multiplier: 50 },
                    { label: '20 €', value: bills20, setter: setBills20, multiplier: 20 },
                    { label: '10 €', value: bills10, setter: setBills10, multiplier: 10 },
                    { label: '5 €', value: bills5, setter: setBills5, multiplier: 5 },
                  ].map((item) => (
                    <div key={item.label}>
                      <label className="label">{item.label}</label>
                      <input
                        type="number"
                        className="input"
                        value={item.value}
                        onChange={(e) => item.setter(parseInt(e.target.value) || 0)}
                        min="0"
                      />
                      <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>
                        = {(item.value * item.multiplier).toFixed(2)} €
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                  Pièces (nombre de pièces)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)' }}>
                  {[
                    { label: '2 €', value: coins2, setter: setCoins2, multiplier: 2 },
                    { label: '1 €', value: coins1, setter: setCoins1, multiplier: 1 },
                    { label: '0.50 €', value: coins050, setter: setCoins050, multiplier: 0.5 },
                    { label: '0.20 €', value: coins020, setter: setCoins020, multiplier: 0.2 },
                    { label: '0.10 €', value: coins010, setter: setCoins010, multiplier: 0.1 },
                    { label: '0.05 €', value: coins005, setter: setCoins005, multiplier: 0.05 },
                    { label: '0.02 €', value: coins002, setter: setCoins002, multiplier: 0.02 },
                    { label: '0.01 €', value: coins001, setter: setCoins001, multiplier: 0.01 },
                  ].map((item) => (
                    <div key={item.label}>
                      <label className="label">{item.label}</label>
                      <input
                        type="number"
                        className="input"
                        value={item.value}
                        onChange={(e) => item.setter(parseInt(e.target.value) || 0)}
                        min="0"
                      />
                      <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>
                        = {(item.value * item.multiplier).toFixed(2)} €
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label className="label">Fond de caisse précédent</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={previousFloat}
                  onChange={(e) => setPreviousFloat(parseFloat(e.target.value) || 0)}
                  placeholder="Saisir le fond de caisse"
                />
                <p style={{ fontSize: 12, color: 'var(--gray-600)', marginTop: 4 }}>
                  {previousFloat === 0 ? 'Aucun fond précédent trouvé - saisir manuellement' : 'Chargé automatiquement - modifiable'}
                </p>
              </div>

              <div
                style={{
                  padding: 'var(--spacing-md)',
                  background: 'var(--gray-50)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--spacing-lg)',
                  border: '2px solid var(--gray-200)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                  <span style={{ fontWeight: 600 }}>Total caisse compté:</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>
                    {totalCash.toFixed(2)} €
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                  <span>Fond de caisse précédent:</span>
                  <span>{previousFloat.toFixed(2)} €</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                  <span>Rapport Z (ventes):</span>
                  <span style={{ fontWeight: 600 }}>+ {zReportTotal.toFixed(2)} €</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--gray-300)' }}>
                  <span style={{ fontWeight: 600 }}>Total attendu:</span>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{expectedTotal.toFixed(2)} €</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: 'var(--spacing-sm)',
                  borderTop: '2px solid var(--gray-300)',
                  marginTop: 'var(--spacing-sm)'
                }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>
                    {difference === 0 ? 'Caisse juste' : difference > 0 ? 'Excédent:' : 'Manque (trou de caisse):'}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: 20,
                      color: difference === 0 ? 'var(--success)' : difference > 0 ? 'var(--warning)' : 'var(--danger)',
                    }}
                  >
                    {difference >= 0 ? '+' : ''}{difference.toFixed(2)} €
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label className="label">Nouveau fond de caisse pour demain</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={newFloat}
                  onChange={(e) => setNewFloat(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <FiPlus size={20} />
                  Enregistrer
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
