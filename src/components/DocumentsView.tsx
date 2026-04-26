import { useMemo, useState } from 'react'

type DocType = 'contrato' | 'dossier' | 'email' | 'proposta' | 'carta' | 'release'

type DocumentItem = {
  id: string
  type: DocType
  title: string
  artistName: string
  recipient: string
  projectName: string
  language: 'PT' | 'ES' | 'EN'
  status: 'rascunho' | 'revisto' | 'enviado'
  content: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'soma-documents-v1'

const docTypes: { id: DocType; label: string }[] = [
  { id: 'contrato', label: 'Contrato' },
  { id: 'dossier', label: 'Dossier' },
  { id: 'email', label: 'Email' },
  { id: 'proposta', label: 'Proposta' },
  { id: 'carta', label: 'Carta' },
  { id: 'release', label: 'Press release' },
]

function getStored(): DocumentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStored(docs: DocumentItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(docs))
}

function templateFor(doc: Partial<DocumentItem>) {
  const artist = doc.artistName || '[Nome do artista]'
  const project = doc.projectName || '[Nome do projeto]'
  const recipient = doc.recipient || '[Destinatário]'

  if (doc.type === 'contrato') {
    return `CONTRATO / ACORDO DE COLABORAÇÃO

Entre SOMA CULTURA · ODÉ e ${artist}

Projeto: ${project}
Destinatário / entidade: ${recipient}

1. OBJETO
Este documento estabelece as condições de colaboração entre as partes para a realização do projeto indicado.

2. RESPONSABILIDADES DA SOMA
A SOMA compromete-se a acompanhar a produção, comunicação, documentação e articulação institucional do projeto, conforme acordado entre as partes.

3. RESPONSABILIDADES DO/A ARTISTA
O/A artista compromete-se a disponibilizar as informações, materiais, documentos e conteúdos necessários para a boa execução da colaboração.

4. CONDIÇÕES ECONÓMICAS
As condições económicas deverão ser indicadas conforme orçamento, cachê, percentagens, pagamentos, impostos e calendário acordado.

5. PRAZOS E ENTREGAS
As partes definirão os prazos de entrega de materiais, confirmações, pagamentos e comunicação.

6. OBSERVAÇÕES
[Adicionar observações específicas.]

`
  }

  if (doc.type === 'dossier') {
    return `DOSSIER ARTÍSTICO

Artista: ${artist}
Projeto: ${project}

1. APRESENTAÇÃO
${artist} desenvolve uma prática artística situada entre corpo, território, memória, música, performance e criação contemporânea.

2. SOBRE O PROJETO
${project} propõe uma experiência artística que articula pesquisa, presença cênica, linguagem própria e diálogo com contextos culturais diversos.

3. CONCEITO
[Descrever conceito curatorial, poético e político.]

4. FORMATO
[Concerto / performance / residência / oficina / palestra / instalação.]

5. NECESSIDADES TÉCNICAS
[Indicar rider, equipa, tempo de montagem, som, luz, vídeo, palco.]

6. MATERIAIS DISPONÍVEIS
- Bio
- Fotos
- Vídeo
- Rider técnico
- Press kit
- Links

7. CONTACTO
SOMA CULTURA · ODÉ

`
  }

  if (doc.type === 'email') {
    return `Assunto: ${project} — ${artist}

Olá ${recipient},

Espero que esteja bem.

Escrevo em nome da SOMA CULTURA · ODÉ para apresentar ${artist} e o projeto ${project}.

Acreditamos que esta proposta pode dialogar com a vossa programação pela sua força artística, dimensão contemporânea e relação com territórios, públicos e práticas culturais diversas.

Podemos enviar dossier, links, rider técnico e demais informações caso faça sentido avançar numa conversa.

Fico à disposição.

Com os melhores cumprimentos,

SOMA CULTURA · ODÉ
`
  }

  if (doc.type === 'proposta') {
    return `PROPOSTA DE COLABORAÇÃO

Para: ${recipient}
Artista: ${artist}
Projeto: ${project}

1. CONTEXTO
A SOMA CULTURA · ODÉ apresenta esta proposta com o objetivo de estabelecer uma colaboração artística e institucional.

2. PROPOSTA
Propomos a apresentação/desenvolvimento do projeto ${project}, de ${artist}, em diálogo com a vossa linha de programação.

3. OBJETIVOS
- Ampliar a circulação do projeto.
- Criar pontes entre artistas, territórios e instituições.
- Fortalecer práticas culturais contemporâneas e diversas.

4. FORMATO
[Descrever formato.]

5. NECESSIDADES
[Descrever necessidades técnicas, logísticas e financeiras.]

6. PRÓXIMOS PASSOS
Sugerimos uma reunião para alinhar possibilidades, calendário e condições.

`
  }

  if (doc.type === 'release') {
    return `PRESS RELEASE

${artist} apresenta ${project}

A SOMA CULTURA · ODÉ apresenta ${project}, novo projeto de ${artist}, que cruza criação contemporânea, território, memória e experimentação artística.

A proposta reúne elementos de pesquisa, presença cênica e construção coletiva, afirmando uma linguagem própria dentro da cena cultural atual.

Mais informações:
[Inserir data, local, horários, links e contactos.]

Contacto de imprensa:
SOMA CULTURA · ODÉ
`
  }

  return `CARTA

Para: ${recipient}

Assunto: ${project} — ${artist}

Prezada/o ${recipient},

Escrevemos em nome da SOMA CULTURA · ODÉ para apresentar ${artist} e o projeto ${project}.

[Desenvolver texto.]

Com os melhores cumprimentos,

SOMA CULTURA · ODÉ
`
}

function emptyDocument(): DocumentItem {
  const now = new Date().toISOString()

  return {
    id: crypto.randomUUID(),
    type: 'email',
    title: '',
    artistName: '',
    recipient: '',
    projectName: '',
    language: 'PT',
    status: 'rascunho',
    content: '',
    createdAt: now,
    updatedAt: now,
  }
}

export default function DocumentsView() {
  const [docs, setDocs] = useState<DocumentItem[]>(getStored())
  const [editing, setEditing] = useState<DocumentItem | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'todos' | DocType>('todos')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()

    return docs.filter(doc => {
      if (typeFilter !== 'todos' && doc.type !== typeFilter) return false
      if (!q) return true

      return [
        doc.title,
        doc.artistName,
        doc.recipient,
        doc.projectName,
        doc.content,
        doc.type,
        doc.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [docs, search, typeFilter])

  function persist(next: DocumentItem[]) {
    setDocs(next)
    saveStored(next)
  }

  function startNew(type: DocType = 'email') {
    const base = emptyDocument()
    const next = {
      ...base,
      type,
      title: `Novo ${docTypes.find(t => t.id === type)?.label || 'documento'}`,
    }
    next.content = templateFor(next)
    setEditing(next)
  }

  function saveDocument() {
    if (!editing) return

    if (!editing.title.trim()) {
      alert('O documento precisa de título.')
      return
    }

    const updated = {
      ...editing,
      updatedAt: new Date().toISOString(),
    }

    const exists = docs.some(d => d.id === updated.id)

    const next = exists
      ? docs.map(d => (d.id === updated.id ? updated : d))
      : [updated, ...docs]

    persist(next)
    setEditing(null)
  }

  function deleteDocument(id: string) {
    if (!confirm('Apagar este documento?')) return
    persist(docs.filter(d => d.id !== id))
    setEditing(null)
  }

  function regenerateTemplate() {
    if (!editing) return
    if (!confirm('Substituir o conteúdo atual por um novo modelo?')) return

    setEditing({
      ...editing,
      content: templateFor(editing),
      updatedAt: new Date().toISOString(),
    })
  }

  async function copyContent(text: string) {
    await navigator.clipboard.writeText(text)
    alert('Texto copiado.')
  }

  function downloadTxt(doc: DocumentItem) {
    const blob = new Blob([doc.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title || 'documento'}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Documentos</h1>
          <p style={styles.subtitle}>
            Criar contratos, dossiers, emails, propostas, cartas e releases sem sair do SOMA ODÉ.
          </p>
        </div>

        <div style={styles.actions}>
          <button style={styles.primaryBtn} onClick={() => startNew('email')}>
            + Novo documento
          </button>
        </div>
      </header>

      <section style={styles.quickGrid}>
        {docTypes.map(t => (
          <button key={t.id} style={styles.quickCard} onClick={() => startNew(t.id)}>
            <strong>{t.label}</strong>
            <span>Criar modelo</span>
          </button>
        ))}
      </section>

      <section style={styles.toolbar}>
        <input
          style={styles.input}
          placeholder="Pesquisar documentos..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          style={styles.select}
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as 'todos' | DocType)}
        >
          <option value="todos">Todos os tipos</option>
          {docTypes.map(t => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </section>

      <section style={styles.grid}>
        {filtered.length === 0 && (
          <div style={styles.empty}>
            Nenhum documento ainda. Cria um modelo acima para começar.
          </div>
        )}

        {filtered.map(doc => (
          <article key={doc.id} style={styles.card}>
            <div style={styles.cardTop}>
              <span style={styles.badge}>{docTypes.find(t => t.id === doc.type)?.label}</span>
              <span style={styles.status}>{doc.status}</span>
            </div>

            <h3 style={styles.cardTitle}>{doc.title}</h3>

            <p style={styles.meta}>
              {[doc.artistName, doc.projectName, doc.recipient].filter(Boolean).join(' · ') || 'Sem dados vinculados'}
            </p>

            <p style={styles.preview}>
              {doc.content.slice(0, 180)}
              {doc.content.length > 180 ? '...' : ''}
            </p>

            <div style={styles.cardActions}>
              <button style={styles.secondaryBtn} onClick={() => setEditing(doc)}>
                Editar
              </button>

              <button style={styles.secondaryBtn} onClick={() => copyContent(doc.content)}>
                Copiar
              </button>

              <button style={styles.secondaryBtn} onClick={() => downloadTxt(doc)}>
                Baixar TXT
              </button>

              <button style={styles.dangerBtn} onClick={() => deleteDocument(doc.id)}>
                Apagar
              </button>
            </div>
          </article>
        ))}
      </section>

      {editing && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalTitle}>
                  {docs.some(d => d.id === editing.id) ? 'Editar documento' : 'Novo documento'}
                </h2>
                <p style={styles.modalSubtitle}>
                  Modelo interno SOMA ODÉ
                </p>
              </div>

              <button style={styles.secondaryBtn} onClick={() => setEditing(null)}>
                Fechar
              </button>
            </div>

            <div style={styles.formGrid}>
              <label style={styles.label}>
                Tipo
                <select
                  style={styles.input}
                  value={editing.type}
                  onChange={e => {
                    const type = e.target.value as DocType
                    const next = { ...editing, type }
                    setEditing({
                      ...next,
                      content: templateFor(next),
                    })
                  }}
                >
                  {docTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.label}>
                Estado
                <select
                  style={styles.input}
                  value={editing.status}
                  onChange={e => setEditing({ ...editing, status: e.target.value as DocumentItem['status'] })}
                >
                  <option value="rascunho">Rascunho</option>
                  <option value="revisto">Revisto</option>
                  <option value="enviado">Enviado</option>
                </select>
              </label>

              <label style={styles.label}>
                Idioma
                <select
                  style={styles.input}
                  value={editing.language}
                  onChange={e => setEditing({ ...editing, language: e.target.value as DocumentItem['language'] })}
                >
                  <option value="PT">PT</option>
                  <option value="ES">ES</option>
                  <option value="EN">EN</option>
                </select>
              </label>

              <label style={styles.label}>
                Título
                <input
                  style={styles.input}
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                />
              </label>

              <label style={styles.label}>
                Artista
                <input
                  style={styles.input}
                  value={editing.artistName}
                  onChange={e => setEditing({ ...editing, artistName: e.target.value })}
                />
              </label>

              <label style={styles.label}>
                Projeto
                <input
                  style={styles.input}
                  value={editing.projectName}
                  onChange={e => setEditing({ ...editing, projectName: e.target.value })}
                />
              </label>

              <label style={styles.label}>
                Destinatário / entidade
                <input
                  style={styles.input}
                  value={editing.recipient}
                  onChange={e => setEditing({ ...editing, recipient: e.target.value })}
                />
              </label>
            </div>

            <div style={styles.editorActions}>
              <button style={styles.secondaryBtn} onClick={regenerateTemplate}>
                Recriar modelo
              </button>

              <button style={styles.secondaryBtn} onClick={() => copyContent(editing.content)}>
                Copiar texto
              </button>

              <button style={styles.secondaryBtn} onClick={() => downloadTxt(editing)}>
                Baixar TXT
              </button>
            </div>

            <textarea
              style={styles.textarea}
              value={editing.content}
              onChange={e => setEditing({ ...editing, content: e.target.value })}
            />

            <div style={styles.modalFooter}>
              {docs.some(d => d.id === editing.id) && (
                <button style={styles.dangerBtn} onClick={() => deleteDocument(editing.id)}>
                  Apagar
                </button>
              )}

              <button style={styles.secondaryBtn} onClick={() => setEditing(null)}>
                Cancelar
              </button>

              <button style={styles.primaryBtn} onClick={saveDocument}>
                Guardar documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 24px',
    color: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 20,
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: {
    margin: 0,
    color: '#60b4e8',
    fontSize: 32,
  },
  subtitle: {
    margin: '6px 0 0',
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
  },
  actions: {
    display: 'flex',
    gap: 10,
  },
  quickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 12,
    marginBottom: 22,
  },
  quickCard: {
    background: '#111',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    textAlign: 'left',
  },
  toolbar: {
    display: 'flex',
    gap: 12,
    marginBottom: 22,
    flexWrap: 'wrap',
  },
  input: {
    width: '100%',
    background: '#0a0a0a',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    boxSizing: 'border-box',
    outline: 'none',
  },
  select: {
    background: '#0a0a0a',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    minWidth: 180,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 14,
  },
  empty: {
    gridColumn: '1 / -1',
    color: 'rgba(255,255,255,0.38)',
    textAlign: 'center',
    padding: 50,
    border: '1px dashed rgba(255,255,255,0.14)',
    borderRadius: 12,
  },
  card: {
    background: '#111',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 12,
    padding: 16,
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  badge: {
    background: 'rgba(26,105,148,0.25)',
    color: '#60b4e8',
    borderRadius: 20,
    padding: '3px 9px',
    fontSize: 11,
    fontWeight: 700,
  },
  status: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 11,
  },
  cardTitle: {
    margin: 0,
    fontSize: 17,
  },
  meta: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    minHeight: 18,
  },
  preview: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    lineHeight: 1.45,
    minHeight: 70,
  },
  cardActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 12,
  },
  primaryBtn: {
    background: '#1A6994',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },
  secondaryBtn: {
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 12,
    cursor: 'pointer',
  },
  dangerBtn: {
    background: 'rgba(255,70,70,0.12)',
    color: '#ff8a8a',
    border: '1px solid rgba(255,70,70,0.25)',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 12,
    cursor: 'pointer',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.82)',
    zIndex: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: 'min(1000px, 100%)',
    maxHeight: '92vh',
    overflowY: 'auto',
    background: '#000',
    border: '1px solid #1A6994',
    borderRadius: 16,
    padding: 22,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18,
  },
  modalTitle: {
    margin: 0,
    fontSize: 24,
    color: '#60b4e8',
  },
  modalSubtitle: {
    margin: '4px 0 0',
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 12,
    marginBottom: 14,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
  },
  editorActions: {
    display: 'flex',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  textarea: {
    width: '100%',
    minHeight: 420,
    background: '#050505',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.14)',
    borderRadius: 10,
    padding: 16,
    fontSize: 14,
    lineHeight: 1.55,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
}