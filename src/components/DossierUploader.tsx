// src/components/DossierUploader.tsx

import { useState } from 'react'
import { extractTextFromPDF } from '../utils/parseDossier'
import { analyzeDossier } from '../utils/analyzeDossier'
import type { Artist } from '../types/artist'

interface Props {
  onUpdate: (data: Partial<Artist>) => void
}

export default function DossierUploader({ onUpdate }: Props) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string>('')

  async function handleFile(file: File) {
    if (!file) return

    setLoading(true)
    setStatus('Lendo PDF...')

    const text = await extractTextFromPDF(file)

    setStatus('Analizando contenido...')

    const data = analyzeDossier(text)

    onUpdate(data)

    setStatus('✓ Dossier procesado')
    setLoading(false)
  }

  return (
    <div style={{
      border: '1px dashed rgba(255,255,255,0.2)',
      padding: 16,
      borderRadius: 8,
      marginBottom: 12
    }}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>
        📄 Subir dossier (PDF)
      </div>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {loading && <div style={{ fontSize: 12, opacity: 0.6 }}>{status}</div>}
      {!loading && status && <div style={{ fontSize: 12, color: '#5dcaa5' }}>{status}</div>}
    </div>
  )
}