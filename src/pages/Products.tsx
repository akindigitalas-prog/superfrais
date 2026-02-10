import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { FiSearch, FiPackage, FiFilter, FiUpload, FiDownload, FiAlertCircle, FiCheckCircle, FiList } from 'react-icons/fi';

interface Product {
  id: string;
  barcode: string;
  name: string;
  supplier: string | null;
  reference: string | null;
  family: string | null;
  photo_url: string | null;
  created_at: string;
}

interface ExcelRow {
  fournisseur?: string;
  'référence produits'?: string;
  'code barre'?: string;
  'nom du produit'?: string;
  'famille de produit'?: string;
}

interface ImportReport {
  totalRows: number;
  duplicateCount: number;
  existingCount: number;
  newCount: number;
  importedCount: number;
  rowsWithoutBarcode: number;
  detectedColumns: string[];
}

export default function Products() {
  const { user, profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'list' | 'import'>('list');

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  const [families, setFamilies] = useState<string[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedFamily, products]);

  const loadProducts = async () => {
    try {
      let allProducts: any[] = [];
      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allProducts = [...allProducts, ...data];
          offset += batchSize;
          hasMore = data.length === batchSize;
        } else {
          hasMore = false;
        }
      }

      setProducts(allProducts);

      const uniqueFamilies = Array.from(
        new Set(allProducts.map(p => p.family).filter(Boolean) as string[])
      ).sort();
      setFamilies(uniqueFamilies);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(term) ||
          p.barcode.toLowerCase().includes(term) ||
          p.supplier?.toLowerCase().includes(term) ||
          p.reference?.toLowerCase().includes(term)
      );
    }

    if (selectedFamily) {
      filtered = filtered.filter(p => p.family === selectedFamily);
    }

    setFilteredProducts(filtered);
  };

  const isGeneratedBarcode = (barcode: string) => {
    return barcode.startsWith('NOBC-');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();

      if (extension === 'xlsx' || extension === 'xls') {
        setFile(selectedFile);
        setError('');
        setReport(null);
      } else {
        setError('Format de fichier invalide. Utilisez un fichier Excel (.xlsx ou .xls)');
        setFile(null);
      }
    }
  };

  const processExcelFile = async (file: File): Promise<ExcelRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsBinaryString(file);
    });
  };

  const normalizeColumnName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };

  const findColumnValue = (row: any, possibleNames: string[]): string | null => {
    for (const key of Object.keys(row)) {
      const normalizedKey = normalizeColumnName(key);
      if (possibleNames.some(name => normalizeColumnName(name) === normalizedKey)) {
        const value = row[key];
        return value ? String(value).trim() : null;
      }
    }
    return null;
  };

  const handleImport = async () => {
    if (!file || !user) return;

    setImporting(true);
    setError('');
    setReport(null);

    try {
      const rows = await processExcelFile(file);

      if (rows.length === 0) {
        setError('Le fichier Excel est vide');
        setImporting(false);
        return;
      }

      const detectedColumns = rows.length > 0 ? Object.keys(rows[0]) : [];

      const totalRows = rows.length;
      const productsMap = new Map<string, any>();
      let duplicateInFileCount = 0;
      let rowsWithoutBarcode = 0;
      let noBarcodeCounter = 0;

      for (const row of rows) {
        let barcode = findColumnValue(row, [
          'code barre', 'codebarre', 'barcode', 'ean', 'code', 'gencod'
        ]);

        if (!barcode) {
          rowsWithoutBarcode++;
          noBarcodeCounter++;
          barcode = `NOBC-${Date.now()}-${noBarcodeCounter}`;
        }

        if (productsMap.has(barcode)) {
          duplicateInFileCount++;
        } else {
          productsMap.set(barcode, row);
        }
      }

      const uniqueProducts = Array.from(productsMap.entries());
      const barcodes = uniqueProducts.map(([barcode]) => barcode);

      const { data: existingProducts } = await supabase
        .from('products')
        .select('barcode')
        .in('barcode', barcodes);

      const existingBarcodes = new Set(
        existingProducts?.map(p => p.barcode) || []
      );

      const productsToUpsert = uniqueProducts.map(([barcode, row]) => ({
        barcode,
        name: findColumnValue(row, [
          'nom du produit', 'nom', 'nomduproduit', 'produit', 'designation', 'libelle'
        ]) || 'Sans nom',
        supplier: findColumnValue(row, [
          'fournisseur', 'supplier', 'frs', 'marque'
        ]) || null,
        reference: findColumnValue(row, [
          'référence produits', 'reference produits', 'référence produit', 'reference produit',
          'référence', 'reference', 'ref', 'sku', 'réf', 'refproduit', 'refproduits'
        ]) || null,
        family: findColumnValue(row, [
          'famille de produit', 'famille de produits', 'famille', 'familledeproduit',
          'familledeproduits', 'categorie', 'catégorie', 'rayon', 'type', 'famille produit'
        ]) || null,
        photo_url: null,
        created_by: user.id
      }));

      const { error: upsertError } = await supabase
        .from('products')
        .upsert(productsToUpsert, { onConflict: 'barcode' });

      if (upsertError) throw upsertError;

      const newProducts = uniqueProducts.filter(
        ([barcode]) => !existingBarcodes.has(barcode)
      );

      const importedCount = productsToUpsert.length;

      const reportData: ImportReport = {
        totalRows,
        duplicateCount: duplicateInFileCount,
        existingCount: existingBarcodes.size,
        newCount: newProducts.length,
        importedCount,
        rowsWithoutBarcode,
        detectedColumns
      };

      await supabase
        .from('import_logs')
        .insert({
          filename: file.name,
          total_rows: totalRows,
          imported_count: importedCount,
          duplicate_count: duplicateInFileCount,
          existing_count: existingBarcodes.size,
          new_count: newProducts.length,
          created_by: user.id
        });

      setReport(reportData);
      setFile(null);

      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await loadProducts();

    } catch (err) {
      console.error('Erreur lors de l\'import:', err);
      setError('Erreur lors de l\'import: ' + (err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['fournisseur', 'référence produits', 'code barre', 'nom du produit', 'famille de produit'],
      ['Fournisseur A', 'REF001', '3250392650216', 'Produit exemple', 'Famille 1'],
      ['Fournisseur B', 'REF002', '3250392650223', 'Autre produit', 'Famille 2']
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produits');
    XLSX.writeFile(wb, 'template_import_produits.xlsx');
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>
            Produits
          </h1>
          <p style={{ color: 'var(--gray-600)', fontSize: 16 }}>
            {products.length} produit{products.length > 1 ? 's' : ''} total
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--gray-200)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 'var(--spacing-md) var(--spacing-lg)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: 500,
              color: activeTab === 'list' ? 'var(--primary)' : 'var(--gray-600)',
              borderBottom: activeTab === 'list' ? '2px solid var(--primary)' : 'none',
              marginBottom: -1,
              transition: 'color 0.2s'
            }}
          >
            <FiList size={20} />
            Liste des produits
          </button>
          {profile?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('import')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 'var(--spacing-md) var(--spacing-lg)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: 500,
                color: activeTab === 'import' ? 'var(--primary)' : 'var(--gray-600)',
                borderBottom: activeTab === 'import' ? '2px solid var(--primary)' : 'none',
                marginBottom: -1,
                transition: 'color 0.2s'
              }}
            >
              <FiUpload size={20} />
              Import de produits
            </button>
          )}
        </div>

        {activeTab === 'list' ? (
          <>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-lg)'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 'var(--spacing-md)'
              }}>
                <div style={{ position: 'relative' }}>
                  <FiSearch style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--gray-400)'
                  }} />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, code-barres, fournisseur, référence..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input"
                    style={{ paddingLeft: 40 }}
                  />
                </div>

                <div style={{ position: 'relative', minWidth: 200 }}>
                  <FiFilter style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--gray-400)',
                    pointerEvents: 'none'
                  }} />
                  <select
                    value={selectedFamily}
                    onChange={(e) => setSelectedFamily(e.target.value)}
                    className="input"
                    style={{ paddingLeft: 40 }}
                  >
                    <option value="">Toutes les familles</option>
                    {families.map((family) => (
                      <option key={family} value={family}>
                        {family}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)' }}>
                <FiPackage size={48} color="var(--gray-300)" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: 'var(--gray-600)', fontSize: 16 }}>
                  {searchTerm || selectedFamily
                    ? 'Aucun produit ne correspond à votre recherche'
                    : 'Aucun produit importé pour le moment'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{
                      background: 'var(--gray-50)',
                      borderBottom: '1px solid var(--gray-200)'
                    }}>
                      <th style={{
                        padding: 'var(--spacing-md)',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--gray-600)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Code-barres
                      </th>
                      <th style={{
                        padding: 'var(--spacing-md)',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--gray-600)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Nom du produit
                      </th>
                      <th style={{
                        padding: 'var(--spacing-md)',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--gray-600)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Fournisseur
                      </th>
                      <th style={{
                        padding: 'var(--spacing-md)',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--gray-600)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Référence
                      </th>
                      <th style={{
                        padding: 'var(--spacing-md)',
                        textAlign: 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--gray-600)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Famille
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} style={{
                        borderBottom: '1px solid var(--gray-200)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: 'var(--spacing-md)', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontFamily: 'monospace' }}>
                              {product.barcode}
                            </span>
                            {isGeneratedBarcode(product.barcode) && (
                              <span className="badge" style={{
                                fontSize: 11,
                                background: 'var(--warning)',
                                color: 'white'
                              }}>
                                Généré
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: 'var(--spacing-md)' }}>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>
                            {product.name}
                          </div>
                        </td>
                        <td style={{ padding: 'var(--spacing-md)', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 14, color: 'var(--gray-600)' }}>
                            {product.supplier || '-'}
                          </div>
                        </td>
                        <td style={{ padding: 'var(--spacing-md)', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 14, color: 'var(--gray-600)' }}>
                            {product.reference || '-'}
                          </div>
                        </td>
                        <td style={{ padding: 'var(--spacing-md)', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 14, color: 'var(--gray-600)' }}>
                            {product.family || '-'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-lg)' }}>
              <button
                onClick={downloadTemplate}
                className="btn btn-outline"
              >
                <FiDownload size={20} />
                Télécharger le modèle
              </button>
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
                Instructions
              </h2>
              <ul style={{ fontSize: 14, color: 'var(--gray-600)', lineHeight: 1.8 }}>
                <li style={{ marginBottom: 8 }}>• Le fichier doit être au format Excel (.xlsx ou .xls)</li>
                <li style={{ marginBottom: 8 }}>• Les colonnes requises: fournisseur, référence produits, code barre, nom du produit, famille de produit</li>
                <li style={{ marginBottom: 8 }}>• Les noms de colonnes sont flexibles (le système détecte automatiquement les variations)</li>
                <li style={{ marginBottom: 8 }}>• Les produits sans code-barres recevront un code-barres généré automatiquement</li>
                <li style={{ marginBottom: 8 }}>• Les doublons dans le fichier seront automatiquement filtrés</li>
                <li style={{ marginBottom: 8 }}>• Les produits existants seront mis à jour avec les nouvelles données</li>
                <li>• Un rapport détaillé sera généré après chaque import</li>
              </ul>
            </div>

            <div style={{
              border: '2px dashed var(--gray-300)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--spacing-2xl)',
              textAlign: 'center',
              background: 'var(--gray-50)'
            }}>
              <FiUpload size={48} color="var(--gray-400)" style={{ margin: '0 auto 16px' }} />
              <label htmlFor="file-input" style={{ cursor: 'pointer' }}>
                <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
                  Choisir un fichier
                </span>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </label>
              {file && (
                <p style={{ marginTop: 8, fontSize: 14, color: 'var(--gray-600)' }}>
                  Fichier sélectionné: {file.name}
                </p>
              )}
            </div>

            {error && (
              <div style={{
                marginTop: 'var(--spacing-md)',
                padding: 'var(--spacing-md)',
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--spacing-sm)'
              }}>
                <FiAlertCircle size={20} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 14, color: 'var(--danger)' }}>{error}</p>
              </div>
            )}

            {file && !error && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  marginTop: 'var(--spacing-lg)',
                  opacity: importing ? 0.5 : 1,
                  cursor: importing ? 'not-allowed' : 'pointer'
                }}
              >
                {importing ? 'Import en cours...' : 'Lancer l\'import'}
              </button>
            )}

            {report && (
              <div style={{ marginTop: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
                  <FiCheckCircle size={24} color="var(--success)" />
                  <h2 style={{ fontSize: 20, fontWeight: 600 }}>
                    Rapport d'import
                  </h2>
                </div>

                {report.detectedColumns.length > 0 && (
                  <div style={{
                    marginBottom: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary)', marginBottom: 8 }}>
                      Colonnes détectées dans le fichier :
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {report.detectedColumns.map((col, idx) => (
                        <span key={idx} className="badge badge-info">
                          {col}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-lg)'
                }}>
                  <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--gray-50)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 4 }}>Lignes totales</p>
                    <p style={{ fontSize: 28, fontWeight: 700 }}>{report.totalRows}</p>
                  </div>

                  <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'rgba(234, 88, 12, 0.1)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 4 }}>Lignes sans code-barres</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--warning)' }}>{report.rowsWithoutBarcode}</p>
                  </div>

                  <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'rgba(234, 179, 8, 0.1)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 4 }}>Doublons dans le fichier</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: 'rgb(161, 98, 7)' }}>{report.duplicateCount}</p>
                  </div>

                  <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 4 }}>Produits mis à jour</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{report.existingCount}</p>
                  </div>

                  <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'rgba(34, 197, 94, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    gridColumn: 'span 2'
                  }}>
                    <p style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 4 }}>Produits traités au total</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--success)' }}>{report.importedCount}</p>
                  </div>
                </div>

                <div style={{
                  padding: 'var(--spacing-md)',
                  border: `1px solid ${report.importedCount > 0 ? 'var(--success)' : 'var(--warning)'}`,
                  borderRadius: 'var(--radius-md)',
                  background: report.importedCount > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 88, 12, 0.1)'
                }}>
                  <p style={{
                    fontSize: 14,
                    textAlign: 'center',
                    fontWeight: 500,
                    color: report.importedCount > 0 ? 'var(--success)' : 'var(--warning)'
                  }}>
                    {report.importedCount > 0
                      ? `${report.importedCount} produit(s) traité(s) avec succès ! (${report.newCount} nouveaux, ${report.existingCount} mis à jour)`
                      : `Aucun produit traité. Vérifiez que votre fichier contient des codes-barres valides.`
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
