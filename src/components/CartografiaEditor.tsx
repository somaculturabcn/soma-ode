// src/components/CartografiaEditor.tsx
// SOMA ODÉ — Editor da Cartografia (metodologia SOMA) - CORRIGIDO
// Nomes de campos alinhados com artist.ts

import { useState } from 'react';
import type { Cartografia } from '../types/artist';

interface CartografiaEditorProps {
  value: Cartografia | undefined;
  onChange: (c: Cartografia) => void;
  mode?: 'compact' | 'full';
}

const s = {
  wrap: { marginTop: 8 } as React.CSSProperties,
  dimension: {
    border: '0.5px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    marginBottom: 10,
    background: 'rgba(255,255,255,0.015)',
    overflow: 'hidden',
  } as React.CSSProperties,
  dimHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    cursor: 'pointer',
    userSelect: 'none',
  } as React.CSSProperties,
  dimTitle: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: '#60b4e8',
  } as React.CSSProperties,
  dimHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginLeft: 8,
    fontWeight: 400,
    letterSpacing: 0,
  } as React.CSSProperties,
  dimStatus: {
    fontSize: 10,
    padding: '2px 8px',
    borderRadius: 10,
    fontWeight: 600,
    letterSpacing: '0.04em',
  } as React.CSSProperties,
  dimBody: {
    padding: '4px 16px 16px',
    borderTop: '0.5px solid rgba(255,255,255,0.05)',
  } as React.CSSProperties,
  fieldLabel: {
    display: 'block',
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 10,
    marginBottom: 4,
    letterSpacing: '0.03em',
  } as React.CSSProperties,
  fieldLabelStrategic: {
    display: 'block',
    fontSize: 11,
    color: '#ffcf5c',
    marginTop: 10,
    marginBottom: 4,
    letterSpacing: '0.03em',
    fontWeight: 600,
  } as React.CSSProperties,
  textarea: {
    width: '100%',
    padding: '10px 12px',
    background: '#0a0a0a',
    color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: 60,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '10px 12px',
    background: '#0a0a0a',
    color: '#fff',
    border: '0.5px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,
  tagRow: { display: 'flex', gap: 8, marginBottom: 6 } as React.CSSProperties,
  tagAdd: {
    padding: '8px 12px',
    background: 'transparent',
    border: '0.5px solid rgba(255,255,255,0.2)',
    color: 'rgba(255,255,255,0.6)',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,
  tagList: { display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 4 } as React.CSSProperties,
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 10px',
    background: 'rgba(26,105,148,0.15)',
    border: '0.5px solid rgba(26,105,148,0.3)',
    borderRadius: 20,
    fontSize: 12,
    color: '#60b4e8',
  } as React.CSSProperties,
  tagStrategic: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 10px',
    background: 'rgba(255,207,92,0.12)',
    border: '0.5px solid rgba(255,207,92,0.35)',
    borderRadius: 20,
    fontSize: 12,
    color: '#ffcf5c',
  } as React.CSSProperties,
  tagRemove: { cursor: 'pointer', opacity: 0.6, fontSize: 14, lineHeight: 1 } as React.CSSProperties,
  compact: {
    padding: '16px',
    border: '0.5px solid rgba(255,207,92,0.25)',
    borderRadius: 8,
    background: 'rgba(255,207,92,0.03)',
  } as React.CSSProperties,
  compactHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
    lineHeight: 1.5,
  } as React.CSSProperties,
  strategicBox: {
    marginTop: 14,
    padding: 12,
    background: 'rgba(26,105,148,0.08)',
    border: '0.5px solid rgba(26,105,148,0.25)',
    borderRadius: 6,
  } as React.CSSProperties,
};

type DimStatus = 'vazia' | 'rascunho' | 'em_conversa' | 'validada';

// ⚠️ CORRIGIDO: usa os nomes de campos do tipo Cartografia (artist.ts)
function raizStatus(c: Cartografia | undefined): DimStatus {
  const r = c?.raiz;
  if (!r) return 'vazia';
  const filled = [
    r.origins?.trim(),
    r.tensions?.trim(),           // ✅ tensions (não tensoes)
    r.vocabulario?.length ? 'x' : '',
  ].filter(Boolean).length;
  if (filled === 0) return 'vazia';
  if (filled < 3) return 'rascunho';
  return 'em_conversa';
}

function campoStatus(c: Cartografia | undefined): DimStatus {
  const x = c?.campo;
  if (!x) return 'vazia';
  const filled = [
    x.audienceProfiles?.trim(),    // ✅ audienceProfiles (não perfisAudiencia)
    x.motivation?.trim(),          // ✅ motivation (não motivacaoAdesao)
    x.audienceTerritories?.length ? 'x' : '', // ✅ audienceTerritories (não territoriosPublico)
  ].filter(Boolean).length;
  if (filled === 0) return 'vazia';
  if (filled < 3) return 'rascunho';
  return 'em_conversa';
}

function teiaStatus(c: Cartografia | undefined): DimStatus {
  const x = c?.teia;
  if (!x) return 'vazia';
  const filled = [
    x.pares?.trim(),
    x.legitimacy?.trim(),          // ✅ legitimacy (não legitimacao)
    x.influenceNetworks?.trim(),   // ✅ influenceNetworks (não redesInfluencia)
  ].filter(Boolean).length;
  if (filled === 0) return 'vazia';
  if (filled < 3) return 'rascunho';
  return 'em_conversa';
}

function rotaStatus(c: Cartografia | undefined): DimStatus {
  const x = c?.rota;
  if (!x) return 'vazia';
  const filled = [
    x.gaps?.trim(),
    x.expansionPlan?.trim(),       // ✅ expansionPlan (não planoExpansao)
    x.corredores?.length ? 'x' : '',
  ].filter(Boolean).length;
  if (filled === 0) return 'vazia';
  if (filled < 3) return 'rascunho';
  return 'em_conversa';
}

function statusLabel(st: DimStatus): { label: string; color: string; bg: string } {
  switch (st) {
    case 'vazia':
      return { label: 'vazia', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' };
    case 'rascunho':
      return { label: 'rascunho', color: '#ffcf5c', bg: 'rgba(255,207,92,0.12)' };
    case 'em_conversa':
      return { label: 'em conversa', color: '#60b4e8', bg: 'rgba(26,105,148,0.15)' };
    case 'validada':
      return { label: 'validada', color: '#5dcaa5', bg: 'rgba(93,202,165,0.15)' };
  }
}

export default function CartografiaEditor({
  value,
  onChange,
  mode = 'full',
}: CartografiaEditorProps) {
  const c: Cartografia = value ?? {};

  const [open, setOpen] = useState<{ [k: string]: boolean }>({
    raiz: mode === 'compact',
    campo: false,
    teia: false,
    rota: false,
  });

  const [vocabInput, setVocabInput] = useState('');
  const [corredorInput, setCorredorInput] = useState('');
  const [territorioInput, setTerritorioInput] = useState('');

  const updateRaiz = (patch: Partial<NonNullable<Cartografia['raiz']>>) =>
    onChange({ ...c, raiz: { ...c.raiz, ...patch } });
  const updateCampo = (patch: Partial<NonNullable<Cartografia['campo']>>) =>
    onChange({ ...c, campo: { ...c.campo, ...patch } });
  const updateTeia = (patch: Partial<NonNullable<Cartografia['teia']>>) =>
    onChange({ ...c, teia: { ...c.teia, ...patch } });
  const updateRota = (patch: Partial<NonNullable<Cartografia['rota']>>) =>
    onChange({ ...c, rota: { ...c.rota, ...patch } });

  const addVocab = () => {
    const v = vocabInput.trim();
    if (!v) return;
    const curr = c.raiz?.vocabulario ?? [];
    if (!curr.includes(v)) updateRaiz({ vocabulario: [...curr, v] });
    setVocabInput('');
  };
  const removeVocab = (v: string) => {
    const curr = c.raiz?.vocabulario ?? [];
    updateRaiz({ vocabulario: curr.filter((x) => x !== v) });
  };

  const addCorredor = () => {
    const v = corredorInput.trim();
    if (!v) return;
    const curr = c.rota?.corredores ?? [];
    if (!curr.includes(v)) updateRota({ corredores: [...curr, v] });
    setCorredorInput('');
  };
  const removeCorredor = (v: string) => {
    const curr = c.rota?.corredores ?? [];
    updateRota({ corredores: curr.filter((x) => x !== v) });
  };

  const addTerritorio = () => {
    const v = territorioInput.trim();
    if (!v) return;
    const curr = c.campo?.audienceTerritories ?? [];  // ✅ CORRIGIDO
    if (!curr.includes(v)) updateCampo({ audienceTerritories: [...curr, v] }); // ✅ CORRIGIDO
    setTerritorioInput('');
  };
  const removeTerritorio = (v: string) => {
    const curr = c.campo?.audienceTerritories ?? [];  // ✅ CORRIGIDO
    updateCampo({ audienceTerritories: curr.filter((x) => x !== v) }); // ✅ CORRIGIDO
  };

  // ─── Modo COMPACT ──────────────────────────────────────
  if (mode === 'compact') {
    return (
      <div style={s.compact}>
        <div style={s.compactHint}>
          ⭐ <b>Cartografia — início rápido.</b> Preenche apenas o essencial
          agora. Expande mais tarde depois da entrevista completa com o
          artista.
        </div>
        <label style={s.fieldLabelStrategic}>
          Vocabulário — 5 a 8 palavras únicas do artista ⭐
        </label>
        <div style={s.tagRow}>
          <input
            style={s.input}
            placeholder="ex: fronteira, terreiro, som, encantados, ritual"
            value={vocabInput}
            onChange={(e) => setVocabInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVocab(); } }}
          />
          <button type="button" style={s.tagAdd} onClick={addVocab}>+</button>
        </div>
        <div style={s.tagList}>
          {(c.raiz?.vocabulario ?? []).map((v) => (
            <span key={v} style={s.tagStrategic}>
              {v}
              <span style={s.tagRemove} onClick={() => removeVocab(v)}>×</span>
            </span>
          ))}
        </div>
        <label style={s.fieldLabel}>Origens (opcional por agora)</label>
        <textarea
          style={s.textarea}
          placeholder="Raízes culturais, referências, matriz identitária"
          value={c.raiz?.origins ?? ''}  {/* ✅ CORRIGIDO: origins */}
          onChange={(e) => updateRaiz({ origins: e.target.value })}  {/* ✅ CORRIGIDO */}
        />
      </div>
    );
  }

  // ─── Modo FULL ───────────────────────────────────────
  const dim = (key: keyof typeof open, title: string, hint: string,
               status: DimStatus, body: React.ReactNode) => {
    const st = statusLabel(status);
    return (
      <div style={s.dimension}>
        <div style={s.dimHeader} onClick={() => setOpen({ ...open, [key]: !open[key] })}>
          <div>
            <span style={s.dimTitle}>{open[key] ? '▾' : '▸'} {title}</span>
            <span style={s.dimHint}>— {hint}</span>
          </div>
          <span style={{ ...s.dimStatus, color: st.color, background: st.bg }}>{st.label}</span>
        </div>
        {open[key] && <div style={s.dimBody}>{body}</div>}
      </div>
    );
  };

  return (
    <div style={s.wrap}>
      {/* RAIZ */}
      {dim('raiz', 'RAIZ', 'identidade artística profunda', raizStatus(c), <>
        <label style={s.fieldLabel}>Origens</label>
        <textarea style={s.textarea} placeholder="Raízes culturais, referências, matriz identitária"
          value={c.raiz?.origins ?? ''}  {/* ✅ CORRIGIDO */}
          onChange={(e) => updateRaiz({ origins: e.target.value })}  {/* ✅ CORRIGIDO */}
        />
        <label style={s.fieldLabel}>Tensões</label>
        <textarea style={s.textarea} placeholder="Contradições que geram a obra"
          value={c.raiz?.tensions ?? ''}  {/* ✅ CORRIGIDO */}
          onChange={(e) => updateRaiz({ tensions: e.target.value })}  {/* ✅ CORRIGIDO */}
        />
        <label style={s.fieldLabelStrategic}>Vocabulário — 5 a 8 palavras únicas ⭐</label>
        <div style={s.tagRow}>
          <input style={s.input} placeholder="ex: fronteira, terreiro, encantados"
            value={vocabInput}
            onChange={(e) => setVocabInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addVocab(); } }}
          />
          <button type="button" style={s.tagAdd} onClick={addVocab}>+</button>
        </div>
        <div style={s.tagList}>
          {(c.raiz?.vocabulario ?? []).map((v) => (
            <span key={v} style={s.tagStrategic}>{v}<span style={s.tagRemove} onClick={() => removeVocab(v)}>×</span></span>
          ))}
        </div>
      </>)}

      {/* CAMPO */}
      {dim('campo', 'CAMPO', 'quem recebe e por quê', campoStatus(c), <>
        <label style={s.fieldLabel}>Perfis de audiência</label>
        <textarea style={s.textarea} placeholder="Quem já consome o trabalho"
          value={c.campo?.audienceProfiles ?? ''}  {/* ✅ CORRIGIDO */}
          onChange={(e) => updateCampo({ audienceProfiles: e.target.value })}  {/* ✅ CORRIGIDO */}
        />
        <label style={s.fieldLabel}>Motivação de adesão</label>
        <textarea style={s.textarea} placeholder="Por que razão adere"
          value={c.campo?.motivation ?? ''}  {/* ✅ CORRIGIDO */}
          onChange={(e) => updateCampo({ motivation: e.target.value })}  {/* ✅ CORRIGIDO */}
        />
        <label style={s.fieldLabel}>Territórios do público</label>
        <div style={s.tagRow}>
          <input style={s.input} placeholder="ex: Barcelona, São Paulo"
            value={territorioInput}
            onChange={(e) => setTerritorioInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTerritorio(); } }}
          />
          <button type="button" style={s.tagAdd} onClick={addTerritorio}>+</button>
        </div>
        <div style={s.tagList}>
          {(c.campo?.audienceTerritories ?? []).map((v) => (  {/* ✅ CORRIGIDO */}
            <span key={v} style={s.tag}>{v}<span style={s.tagRemove} onClick={() => removeTerritorio(v)}>×</span></span>
          ))}
        </div>
      </>)}

      {/* TEIA */}
      {dim('teia', 'TEIA', 'estrutura de poder do circuito', teiaStatus(c), <>
        <label style={s.fieldLabel}>Pares</label>
        <textarea style={s.textarea} placeholder="Artistas do mesmo nicho"
          value={c.teia?.pares ?? ''}
          onChange={(e) => updateTeia({ pares: e.target.value })}
        />
        <label style={s.fieldLabel}>Legitimação</label>
        <textarea style={s.textarea} placeholder="Cadeia de prestígio"
          value={c.teia?.legitimacy ?? ''}  {/* ✅ CORRIGIDO */}
          onChange={(e) => updateTeia({ legitimacy: e.target.value })}  {/* ✅ CORRIGIDO */}
        />
        <label style={s.fieldLabel}>Redes de influência</label>
        <textarea style={s.textarea} placeholder="Curadores, publicações, colectivos"
          value={c.teia?.influenceNetworks ?? ''}  {/* ✅ CORRIGIDO */}
          onChange={(e) => updateTeia({ influenceNetworks: e.target.value })}  {/* ✅ CORRIGIDO */}
        />
      </>)}

      {/* ROTA */}
      {dim('rota', 'ROTA', 'próximos territórios', rotaStatus(c), <>
        <label style={s.fieldLabel}>Gaps</label>
        <textarea style={s.textarea} placeholder="Audiências com potencial ainda não activado"
          value={c.rota?.gaps ?? ''}
          onChange={(e) => updateRota({ gaps: e.target.value })}
        />
        <label style={s.fieldLabel}>Corredores</label>
        <div style={s.tagRow}>
          <input style={s.input} placeholder="Rotas geográficas naturais"
            value={corredorInput}
            onChange={(e) => setCorredorInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCorredor(); } }}
          />
          <button type="button" style={s.tagAdd} onClick={addCorredor}>+</button>
        </div>
        <div style={s.tagList}>
          {(c.rota?.corredores ?? []).map((v) => (
            <span key={v} style={s.tag}>{v}<span style={s.tagRemove} onClick={() => removeCorredor(v)}>×</span></span>
          ))}
        </div>
        <label style={s.fieldLabel}>Plano de expansão</label>
        <textarea style={s.textarea} placeholder="Próximos 3 movimentos concretos"
          value={c.rota?.expansionPlan ?? ''}  {/* ✅ CORRIGIDO */}
          onChange={(e) => updateRota({ expansionPlan: e.target.value })}  {/* ✅ CORRIGIDO */}
        />
      </>)}

      {/* Posicionamento estratégico */}
      <div style={s.strategicBox}>
        <label style={s.fieldLabel}>
          Posicionamento estratégico SOMA
          <span style={{ fontSize: 10, opacity: 0.5, marginLeft: 6 }}>(síntese curatorial — preenchido pela SOMA)</span>
        </label>
        <textarea style={s.textarea} placeholder="Síntese: onde este artista se situa e para onde vai"
          value={c.somaPositioning ?? ''}  {/* ✅ CORRIGIDO */}
          onChange={(e) => onChange({ ...c, somaPositioning: e.target.value })}  {/* ✅ CORRIGIDO */}
        />
      </div>
    </div>
  );
}