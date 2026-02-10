import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { FiPackage, FiCheck, FiShoppingCart, FiX } from 'react-icons/fi'
import { format } from 'date-fns'

interface Product {
  id: string
  barcode: string
  name: string
  supplier: string | null
  reference: string | null
  family: string | null
  photo_url: string | null
  created_at: string
}

export default function ManualCount() {
  const { profile } = useAuthStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [showOrderForm, setShowOrderForm] = useState(false)
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null)
  const [orderItems, setOrderItems] = useState<Record<string, number>>({})
  const [families, setFamilies] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    const uniqueFamilies = [...new Set(products.map(p => p.family).filter(Boolean))] as string[]
    setFamilies(uniqueFamilies.sort())
  }, [products])

  const fetchProducts = async () => {
    try {
      // Charger TOUS les produits sans limite
      let allProducts: Product[] = []
      let page = 0
      const pageSize = 1000

      while (true) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('family, name')
          .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) throw error

        if (!data || data.length === 0) break

        allProducts = [...allProducts, ...data]

        // Si on a récupéré moins que pageSize, on a tout
        if (data.length < pageSize) break

        page++
      }

      setProducts(allProducts)
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error)
    } finally {
      setLoading(false)
    }
  }

  const startOrder = (family: string) => {
    setSelectedFamily(family)
    setOrderItems({})
    setShowOrderForm(true)
  }

  const updateOrderQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      const newItems = { ...orderItems }
      delete newItems[productId]
      setOrderItems(newItems)
    } else {
      setOrderItems({ ...orderItems, [productId]: quantity })
    }
  }

  const handleSubmitOrder = async () => {
    try {
      const orderEntries = Object.entries(orderItems).map(([productId, quantity]) => ({
        product_id: productId,
        quantity_to_order: quantity,
        counted_by: profile!.id,
      }))

      if (orderEntries.length === 0) {
        alert('Veuillez ajouter au moins un produit à commander')
        return
      }

      const { error } = await supabase
        .from('manual_counts')
        .insert(orderEntries)

      if (error) throw error

      alert('Liste de commande enregistrée avec succès')
      resetOrderForm()
      generateOrderSummary(orderEntries.map(e => e.product_id))
    } catch (error: any) {
      console.error('Erreur:', error)
      alert('Erreur: ' + error.message)
    }
  }

  const generateOrderSummary = (productIds: string[]) => {
    const orderProducts = products.filter(p => productIds.includes(p.id))
    const bySupplier = orderProducts.reduce((acc, product) => {
      const supplier = product.supplier || 'Sans fournisseur'
      if (!acc[supplier]) acc[supplier] = []
      acc[supplier].push({
        name: product.name,
        reference: product.reference,
        quantity: orderItems[product.id]
      })
      return acc
    }, {} as Record<string, any[]>)

    let summary = 'LISTE DE COMMANDE\n\n'
    Object.entries(bySupplier).forEach(([supplier, items]) => {
      summary += `=== ${supplier} ===\n`
      items.forEach(item => {
        summary += `- ${item.name}${item.reference ? ` (${item.reference})` : ''}: ${item.quantity}\n`
      })
      summary += '\n'
    })

    const blob = new Blob([summary], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commande-${selectedFamily}-${format(new Date(), 'yyyy-MM-dd')}.txt`
    a.click()
  }

  const resetOrderForm = () => {
    setShowOrderForm(false)
    setSelectedFamily(null)
    setOrderItems({})
  }

  const getFamilyProducts = (family: string) => {
    let familyProducts = products.filter(p => p.family === family)

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      familyProducts = familyProducts.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.barcode.toLowerCase().includes(term) ||
        p.reference?.toLowerCase().includes(term)
      )
    }

    return familyProducts
  }

  const getTotalItems = () => Object.keys(orderItems).length
  const getTotalQuantity = () => Object.values(orderItems).reduce((sum, q) => sum + q, 0)

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
            Listes de commande
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: 16 }}>
            Créez vos listes de commande par famille de produits
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
        {families.map((family) => {
          const familyProducts = products.filter(p => p.family === family)
          const suppliers = [...new Set(familyProducts.map(p => p.supplier).filter(Boolean))]

          return (
            <div
              key={family}
              className="card"
              style={{
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => startOrder(family)}
            >
              <div style={{ marginBottom: 12 }}>
                <FiPackage size={32} color="var(--primary)" style={{ marginBottom: 8 }} />
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                  {family}
                </h3>
              </div>
              <div style={{ fontSize: 14, color: 'var(--gray-600)' }}>
                <p style={{ marginBottom: 4 }}>
                  {familyProducts.length} produit{familyProducts.length > 1 ? 's' : ''}
                </p>
                <p style={{ fontSize: 12 }}>
                  Fournisseurs: {suppliers.length || 'aucun'}
                </p>
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16, width: '100%' }}
                onClick={(e) => {
                  e.stopPropagation()
                  startOrder(family)
                }}
              >
                <FiShoppingCart size={18} />
                Créer commande
              </button>
            </div>
          )
        })}

        {families.length === 0 && (
          <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
            <FiPackage size={48} color="var(--gray-400)" style={{ margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--gray-500)', fontSize: 16 }}>
              Aucune famille de produits disponible
            </p>
          </div>
        )}
      </div>

      {showOrderForm && selectedFamily && (
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
              maxWidth: 900,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', paddingBottom: 'var(--spacing-md)', borderBottom: '2px solid var(--gray-200)' }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
                  Commande - {selectedFamily}
                </h2>
                {getTotalItems() > 0 && (
                  <p style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 500 }}>
                    {getTotalItems()} produit{getTotalItems() > 1 ? 's' : ''} • {getTotalQuantity()} unités
                  </p>
                )}
              </div>
              <button
                className="btn btn-outline"
                onClick={resetOrderForm}
                style={{ padding: '8px 12px' }}
              >
                <FiX size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <input
                type="text"
                className="input"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ flex: 1, overflow: 'auto', marginBottom: 'var(--spacing-lg)' }}>
              <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                {getFamilyProducts(selectedFamily).map((product) => (
                  <div
                    key={product.id}
                    style={{
                      padding: 'var(--spacing-md)',
                      background: orderItems[product.id] ? 'var(--primary-50)' : 'var(--gray-50)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 'var(--spacing-md)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                        {product.name}
                      </h4>
                      <div style={{ fontSize: 12, color: 'var(--gray-600)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>CB: {product.barcode}</span>
                        {product.reference && <span>Réf: {product.reference}</span>}
                        {product.supplier && <span>Frs: {product.supplier}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Qté"
                        value={orderItems[product.id] || ''}
                        onChange={(e) => updateOrderQuantity(product.id, parseInt(e.target.value) || 0)}
                        style={{
                          width: 80,
                          padding: '8px 12px',
                          border: '2px solid var(--gray-300)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 14,
                          fontWeight: 600,
                          textAlign: 'center',
                        }}
                      />
                    </div>
                  </div>
                ))}

                {getFamilyProducts(selectedFamily).length === 0 && (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--gray-500)' }}>
                    Aucun produit trouvé
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '2px solid var(--gray-200)' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmitOrder}
                disabled={getTotalItems() === 0}
                style={{ flex: 1 }}
              >
                <FiCheck size={20} />
                Valider et télécharger ({getTotalItems()})
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={resetOrderForm}
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
