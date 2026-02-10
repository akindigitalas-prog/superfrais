import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
}

export default function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [scanning, setScanning] = useState(false)
  const [manualBarcode, setManualBarcode] = useState('')

  useEffect(() => {
    startScanner()

    return () => {
      stopScanner()
    }
  }, [])

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('barcode-scanner')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          stopScanner()
          onScan(decodedText)
        },
        () => {
        }
      )

      setScanning(true)
    } catch (error) {
      console.error('Erreur lors du démarrage du scanner:', error)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (error) {
        console.error('Erreur lors de l\'arrêt du scanner:', error)
      }
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualBarcode.trim()) {
      stopScanner()
      onScan(manualBarcode.trim())
    }
  }

  return (
    <div>
      <div
        id="barcode-scanner"
        style={{
          width: '100%',
          marginBottom: 'var(--spacing-md)',
        }}
      />

      <div style={{ marginTop: 'var(--spacing-md)' }}>
        <p style={{ marginBottom: 'var(--spacing-md)', fontSize: 14, color: 'var(--gray-600)' }}>
          Ou saisir manuellement le code-barres:
        </p>
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <input
            type="text"
            className="input"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="Saisir le code-barres"
          />
          <button type="submit" className="btn btn-primary">
            Valider
          </button>
        </form>
      </div>
    </div>
  )
}
