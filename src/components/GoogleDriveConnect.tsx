import { useEffect, useState } from 'react'

declare global {
  interface Window {
    google?: any
  }
}

type DriveFile = {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly'

export default function GoogleDriveConnect() {
  const [ready, setReady] = useState(false)
  const [accessToken, setAccessToken] = useState('')
  const [files, setFiles] = useState<DriveFile[]>([])
  const [status, setStatus] = useState('Google Drive ainda não conectado.')

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => setReady(true)
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  function connectGoogleDrive() {
    if (!CLIENT_ID) {
      setStatus('Erro: VITE_GOOGLE_CLIENT_ID não está configurado no Vercel.')
      return
    }

    if (!window.google) {
      setStatus('Google ainda está carregando. Espera uns segundos e tenta outra vez.')
      return
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.error) {
          setStatus('Erro ao conectar Google Drive.')
          return
        }

        setAccessToken(response.access_token)
        setStatus('Google Drive conectado com sucesso.')
        listDriveFiles(response.access_token)
      },
    })

    tokenClient.requestAccessToken()
  }

  async function listDriveFiles(token: string) {
    setStatus('A ler ficheiros do Google Drive...')

    try {
      const res = await fetch(
        'https://www.googleapis.com/drive/v3/files?pageSize=20&fields=files(id,name,mimeType,webViewLink)',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!res.ok) {
        throw new Error('Erro ao ler Google Drive')
      }

      const data = await res.json()
      setFiles(data.files || [])
      setStatus(`Encontrados ${data.files?.length || 0} ficheiros no Google Drive.`)
    } catch {
      setStatus('Erro ao ler ficheiros do Google Drive.')
    }
  }

  return (
    <div style={styles.box}>
      <h2 style={styles.title}>Google Drive</h2>

      <p style={styles.text}>
        Liga o Google Drive da SOMA para o sistema poder encontrar PDFs, fotos,
        riders, dossiers e materiais dos artistas.
      </p>

      <button style={styles.button} onClick={connectGoogleDrive} disabled={!ready}>
        {accessToken ? 'Google Drive conectado' : 'Conectar Google Drive'}
      </button>

      <p style={styles.status}>{status}</p>

      {files.length > 0 && (
        <div style={styles.list}>
          <h3 style={styles.subtitle}>Ficheiros encontrados</h3>

          {files.map(file => (
            <div key={file.id} style={styles.file}>
              <div>
                <strong>{file.name}</strong>
                <p style={styles.mime}>{file.mimeType}</p>
              </div>

              {file.webViewLink && (
                <a
                  href={file.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.link}
                >
                  abrir →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  box: {
    background: '#050505',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 24,
    color: '#fff',
    maxWidth: 900,
    margin: '30px auto',
  },
  title: {
    margin: 0,
    color: '#60b4e8',
    fontSize: 28,
  },
  text: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    marginTop: 10,
    lineHeight: 1.5,
  },
  button: {
    marginTop: 18,
    background: '#1A6994',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 18px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  status: {
    marginTop: 14,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  list: {
    marginTop: 24,
  },
  subtitle: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 12,
  },
  file: {
    background: '#111',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
  },
  mime: {
    margin: '4px 0 0',
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
  link: {
    color: '#60b4e8',
    textDecoration: 'none',
    fontSize: 13,
    whiteSpace: 'nowrap',
  },
}