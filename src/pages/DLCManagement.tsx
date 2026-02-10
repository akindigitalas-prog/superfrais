import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { FiCamera, FiPlus, FiAlertCircle, FiCheck } from 'react-icons/fi'
import { format, parseISO, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import BarcodeScanner from '../components/BarcodeScanner'

interface Product {
  id: string
  barcode: string
  name: string
  photo_url: string | null
}

interface DLCEntry {
  id: string
  product_id: string
  quantity: number
  dlc_date: string
  alert_days_before: number
  status: string
  created_at: string
  products: Product
}

export default function DLCManagement() {
  const { profile } = useAuthStore()
  const [showScanner, setShowScanner] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [scannedBarcode, setScannedBarcode] = useState('')
  const [product, setProduct] = useState<Product | null>(null)
  const [isNewProduct, setIsNewProduct] = useState(false)

  const [productName, setProductName] = useState('')
  const [productPhoto, setProductPhoto] = useState<File | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [dlcDate, setDlcDate] = useState('')
  const [alertDays, setAlertDays] = useState(3)

  const [dlcEntries, setDlcEntries] = useState<DLCEntry[]>([])
  const [alerts, setAlerts] = useState<DLCEntry[]>([])
  const [activeTab, setActiveTab] = useState<'all' | 'alerts'>('alerts')
  const [loading, setLoading] = useState(true)

  const [showActionModal, setShowActionModal] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<DLCEntry | null>(null)
  const [actionType, setActionType] = useState<'sold' | 'price_reduction' | 'other'>('sold')
  const [actionDetails, setActionDetails] = useState('')

  useEffect(() => {
    fetchDLCEntries()
  }, [])

  const fetchDLCEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('dlc_entries')
        .select('*, products(*)')
        .order('dlc_date', { ascending: true })

      if (error) throw error

      const entries = data || []
      setDlcEntries(entries)

      const alertEntries = entries.filter((entry) => {
        if (entry.status !== 'active') return false
        const daysUntilDLC = differenceInDays(parseISO(entry.dlc_date), new Date())
        return daysUntilDLC <= entry.alert_days_before && daysUntilDLC >= 0
      })

      setAlerts(alertEntries)
    } catch (error) {
      console.error('Erreur lors du chargement des DLC:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBarcodeScanned = async (barcode: string) => {
    setScannedBarcode(barcode)
    setShowScanner(false)

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setProduct(data)
        setIsNewProduct(false)
        setProductName(data.name)
      } else {
        setProduct(null)
        setIsNewProduct(true)
        setProductName('')
      }

      setShowAddForm(true)
    } catch (error) {
      console.error('Erreur lors de la recherche du produit:', error)
      alert('Erreur lors de la recherche du produit')
    }
  }

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProductPhoto(e.target.files[0])
    }
  }

  const uploadPhoto = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `products/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('product-photos')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('product-photos')
      .getPublicUrl(filePath)

    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      let productId = product?.id

      if (isNewProduct) {
        let photoUrl = null
        if (productPhoto) {
          photoUrl = await uploadPhoto(productPhoto)
        }

        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert({
            barcode: scannedBarcode,
            name: productName,
            photo_url: photoUrl,
            created_by: profile!.id,
          })
          .select()
          .single()

        if (productError) throw productError
        productId = newProduct.id
      }

      const { error: dlcError } = await supabase
        .from('dlc_entries')
        .insert({
          product_id: productId!,
          quantity,
          dlc_date: dlcDate,
          alert_days_before: alertDays,
          created_by: profile!.id,
        })

      if (dlcError) throw dlcError

      alert('Produit et DLC ajoutés avec succès')
      resetForm()
      fetchDLCEntries()
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout:', error)
      alert('Erreur lors de l\'ajout: ' + error.message)
    }
  }

  const handleProcessAlert = async () => {
    if (!selectedEntry) return

    try {
      const { error: actionError } = await supabase
        .from('dlc_actions')
        .insert({
          dlc_entry_id: selectedEntry.id,
          action_type: actionType,
          action_details: actionDetails,
          processed_by: profile!.id,
        })

      if (actionError) throw actionError

      const { error: updateError } = await supabase
        .from('dlc_entries')
        .update({ status: 'processed' })
        .eq('id', selectedEntry.id)

      if (updateError) throw updateError

      alert('Action enregistrée avec succès')
      setShowActionModal(false)
      setSelectedEntry(null)
      setActionDetails('')
      fetchDLCEntries()
    } catch (error: any) {
      console.error('Erreur lors du traitement:', error)
      alert('Erreur lors du traitement: ' + error.message)
    }
  }

  const resetForm = () => {
    setShowAddForm(false)
    setScannedBarcode('')
    setProduct(null)
    setIsNewProduct(false)
    setProductName('')
    setProductPhoto(null)
    setQuantity(1)
    setDlcDate('')
    setAlertDays(3)
  }

  const displayEntries = activeTab === 'alerts' ? alerts : dlcEntries

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
            Gestion des DLC
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: 16 }}>
            {alerts.length} alerte{alerts.length > 1 ? 's' : ''} active{alerts.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowScanner(true)}
        >
          <FiCamera size={20} />
          Scanner un produit
        </button>
      </div>

      <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-md)' }}>
        <button
          className={`btn ${activeTab === 'alerts' ? 'btn-danger' : 'btn-outline'}`}
          onClick={() => setActiveTab('alerts')}
        >
          <FiAlertCircle size={20} />
          Alertes ({alerts.length})
        </button>
        <button
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('all')}
        >
          Tous les produits ({dlcEntries.length})
        </button>
      </div>

      <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
        {displayEntries.map((entry) => {
          const daysLeft = differenceInDays(parseISO(entry.dlc_date), new Date())
          const isExpired = daysLeft < 0
          const isAlert = daysLeft <= entry.alert_days_before && daysLeft >= 0

          return (
            <div
              key={entry.id}
              className="card"
              style={{
                borderLeft: isExpired ? '4px solid var(--gray-400)' : isAlert ? '4px solid var(--danger)' : '4px solid var(--success)',
              }}
            >
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                {entry.products.photo_url && (
                  <img
                    src={entry.products.photo_url}
                    alt={entry.products.name}
                    style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                    {entry.products.name}
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 4 }}>
                    Code-barres: {entry.products.barcode}
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 4 }}>
                    Quantité: {entry.quantity}
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 8 }}>
                    DLC: {format(parseISO(entry.dlc_date), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span className={`badge ${isExpired ? 'badge-danger' : isAlert ? 'badge-warning' : 'badge-success'}`}>
                      {isExpired ? 'Expiré' : `${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`}
                    </span>
                    <span className={`badge ${entry.status === 'processed' ? 'badge-success' : 'badge-info'}`}>
                      {entry.status === 'processed' ? 'Traité' : 'Actif'}
                    </span>
                  </div>
                </div>
                {entry.status === 'active' && isAlert && (
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedEntry(entry)
                      setShowActionModal(true)
                    }}
                    style={{ height: 'fit-content' }}
                  >
                    <FiCheck size={20} />
                    Traiter
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {displayEntries.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
            <p style={{ color: 'var(--gray-500)', fontSize: 16 }}>
              {activeTab === 'alerts' ? 'Aucune alerte pour le moment' : 'Aucun produit enregistré'}
            </p>
          </div>
        )}
      </div>

      {showScanner && (
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
              maxWidth: 600,
              width: '100%',
            }}
          >
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
              Scanner un code-barres
            </h2>
            <BarcodeScanner onScan={handleBarcodeScanned} />
            <button
              className="btn btn-outline"
              onClick={() => setShowScanner(false)}
              style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {showAddForm && (
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
            overflowY: 'auto',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 600,
              width: '100%',
              margin: 'var(--spacing-lg) 0',
            }}
          >
            <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 'var(--spacing-lg)' }}>
              {isNewProduct ? 'Nouveau produit' : 'Ajouter une DLC'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Code-barres</label>
                <input
                  type="text"
                  className="input"
                  value={scannedBarcode}
                  disabled
                />
              </div>

              {isNewProduct && (
                <>
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label className="label">Nom du produit</label>
                    <input
                      type="text"
                      className="input"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <label className="label">Photo du produit</label>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="input"
                      onChange={handlePhotoCapture}
                    />
                  </div>
                </>
              )}

              {!isNewProduct && (
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <label className="label">Produit</label>
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                    {product?.photo_url && (
                      <img
                        src={product.photo_url}
                        alt={product.name}
                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                      />
                    )}
                    <p style={{ fontWeight: 600 }}>{product?.name}</p>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Quantité</label>
                <input
                  type="number"
                  className="input"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  min="1"
                  required
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Date de DLC</label>
                <input
                  type="date"
                  className="input"
                  value={dlcDate}
                  onChange={(e) => setDlcDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label className="label">Alerte (jours avant DLC)</label>
                <input
                  type="number"
                  className="input"
                  value={alertDays}
                  onChange={(e) => setAlertDays(parseInt(e.target.value))}
                  min="1"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  <FiPlus size={20} />
                  Ajouter
                </button>
                <button type="button" className="btn btn-outline" onClick={resetForm} style={{ flex: 1 }}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showActionModal && selectedEntry && (
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
              Traiter l'alerte
            </h2>

            <p style={{ marginBottom: 'var(--spacing-md)', fontWeight: 600 }}>
              {selectedEntry.products.name}
            </p>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label className="label">Type d'action</label>
              <select
                className="input"
                value={actionType}
                onChange={(e) => setActionType(e.target.value as any)}
              >
                <option value="sold">Tout vendu avant la DLC</option>
                <option value="price_reduction">Baisse de prix</option>
                <option value="other">Autre action</option>
              </select>
            </div>

            {actionType === 'other' && (
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <label className="label">Détails de l'action</label>
                <textarea
                  className="input"
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                  rows={3}
                  required
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
              <button className="btn btn-primary" onClick={handleProcessAlert} style={{ flex: 1 }}>
                <FiCheck size={20} />
                Valider
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setShowActionModal(false)
                  setSelectedEntry(null)
                  setActionDetails('')
                }}
                style={{ flex: 1 }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
