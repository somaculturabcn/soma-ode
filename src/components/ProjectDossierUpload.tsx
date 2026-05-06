// src/components/ProjectDossierUpload.tsx
// SOMA ODÉ — Upload + extracção + armazenamento de dossier PDF
// Um botão faz tudo: upload para Supabase Storage + extracção de texto via Gemini

import { useRef, useState } from 'react'
import { extractAndStorePdf, type ExtractedDossier } from '../services/pdfExtractor'

interface Props {
  projectId: string
  projectName: string
  artistId: string
  // Estado actual do dossier (se já existe)
  dossierFileName?: string
  dossierUrl?: string
  dossierUploadedAt?: string
  dossierWordCount?: number
  // Callback quando termina
  onExtracted: (projectId: string, dossier: ExtractedDossier) => void
}

type Step = 'idle' | 'uploading' | 'extracting' | 'done' | 'error'

export default function ProjectDossierUpload({
  projectId,
  projectName,
  artistId,
  dossierFileName,
  dossierUrl,
  dossierUploadedAt,
  dossierWordCount,
  onExtracted,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState('')

  const hasDossier = Boolean(dossierFileName && dossierUrl)

  const stepLabel: Record<Step, string> = {
    idle: '',
    uploading: 'A guardar no Supabase Storage...',
    extracting: 'A extrair texto com Gemini...',
    done: 'Dossier processado!',
    error: '',
  }

  async function handleFile(file: File) {
    setError('')
    setStep('uploading')

    try {
      // A função faz upload + extracção em paralelo internamente
      // Aqui simulamos os passos para o utilizador ver progresso
      const timer = setTimeout(() => setStep('extracting'), 1500)

      const dossier = await extractAndStorePdf(file, artistId, projectId)
      clearTimeout(timer)

      setStep('done')
      onExtracted(projectId, dossier)

      setTimeout(() => setStep('idle'), 2000)
    } catch (err: any) {
      setStep('error')
      setError(err.message || 'Erro ao processar o PDF.')
    }
  }

  const loading = step === 'uploading' || step === 'extracting'

  return (
    <div style={s.wrap}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: 'none' }}
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
          if (inputRef.current) inputRef.current.value = ''
        }}
      />

      {hasDossier ? (
        /* ── Dossier já carregado ── */
        <div style={s.loaded}>
          <div style={s.loadedInfo}>
            <span style={s.fileIcon}>📄</span>
            <div>
              <div style={s.fileName}>{dossierFileName}</div>
              <div style={s.fileMeta}>
                {dossierWordCount
                  ? `${dossierWordCount.toLocaleString()} palavras extraídas`
                  : 'Texto extraído'}
                {dossierUploadedAt
                  ? ` · ${new Date(dossierUploadedAt).toLocaleDateString('pt-PT')}`
                  : ''}
              </div>
            </div>
          </div>

          <div style={s.loadedActions}>
            {/* Botão descarregar */}
            {dossierUrl && (
              <a
                href={dossierUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={s.downloadBtn}
                download={dossierFileName}
              >
                ⬇ Descarregar
              </a>
            )}
            {/* Substituir */}
            <button
              style={s.replaceBtn}
              onClick={() => inputRef.current?.click()}
              disabled={loading}
            >
              ↺ Substituir
            </button>
          </div>
        </div>
      ) : (
        /* ── Sem dossier ── */
        <button
          style={{
            ...s.uploadBtn,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'wait' : 'pointer',
          }}
          onClick={() => !loading && inputRef.current?.click()}
          disabled={loading}
        >
          {loading ? (
            <span style={s.loadingContent}>
              <span style={s.spinner}>⟳</span>
              {stepLabel[step]}
            </span>
          ) : (
            <>📄 Upload dossier — {projectName}</>
          )}
        </button>
      )}

      {/* Progress quando há dossier e está a substituir */}
      {hasDossier && loading && (
        <div style={s.progressBar}>
          <span style={s.spinner}>⟳</span>
          {stepLabel[step]}
        </div>
      )}

      {/* Sucesso */}
      {step === 'done' && (
        <div style={s.successMsg}>✅ Dossier guardado e texto extraído</div>
      )}

      {/* Erro */}
      {step === 'error' && error && (
        <div style={s.errorMsg}>
          <span>⚠ {error}</span>
          <button
            style={s.retryBtn}
            onClick={() => { setStep('idle'); setError('') }}
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  wrap: { marginTop: 10 },

  uploadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    background: 'rgba(26,105,148,0.07)',
    color: '#60b4e8',
    border: '1px dashed rgba(26,105,148,0.35)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 12,
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  },

  loadingContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: '#60b4e8',
  },

  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
    fontSize: 14,
  },

  loaded: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    background: 'rgba(110,243,165,0.05)',
    border: '1px solid rgba(110,243,165,0.18)',
    borderRadius: 8,
    padding: '10px 14px',
    flexWrap: 'wrap',
  },

  loadedInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },

  fileIcon: { fontSize: 20, flexShrink: 0 },

  fileName: {
    fontSize: 12,
    fontWeight: 700,
    color: '#6ef3a5',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  fileMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },

  loadedActions: {
    display: 'flex',
    gap: 6,
    flexShrink: 0,
  },

  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'rgba(26,105,148,0.15)',
    color: '#60b4e8',
    border: '1px solid rgba(26,105,148,0.3)',
    borderRadius: 6,
    padding: '5px 11px',
    fontSize: 11,
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
  },

  replaceBtn: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },

  progressBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    fontSize: 11,
    color: '#60b4e8',
  },

  successMsg: {
    marginTop: 6,
    fontSize: 11,
    color: '#6ef3a5',
  },

  errorMsg: {
    marginTop: 6,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(255,70,70,0.06)',
    border: '1px solid rgba(255,70,70,0.2)',
    borderRadius: 6,
    padding: '7px 10px',
    fontSize: 11,
    color: '#ff8a8a',
  },

  retryBtn: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.4)',
    border: 'none',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit',
    flexShrink: 0,
  },
}