// src/utils/export.ts
// SOMA ODÉ — Exportações do Scout
//
// Duas funções principais:
//   - exportRosterCSV(artists)   → descarrega soma-ode-roster.csv
//   - exportArtistPDF(artist)    → abre janela de impressão para guardar como PDF
//
// Zero dependências externas. Tudo no browser.

import type { Artist } from '../types/artist';

// ─── Helpers CSV ─────────────────────────────────────────────────────────────

/** Escapa um valor para CSV: quotes + envolve em "..." se tiver vírgula, aspas ou quebra de linha */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Junta um array em string separada por ' | ' (não usa vírgula, já é o separador CSV) */
function arr(list: string[] | undefined): string {
  return (list ?? []).join(' | ');
}

// ─── Exportar Roster em CSV ──────────────────────────────────────────────────

export function exportRosterCSV(artists: Artist[]): void {
  if (artists.length === 0) {
    alert('Não há artistas no roster para exportar.');
    return;
  }

  const headers = [
    'Nome', 'Nome legal', 'Pronomes', 'Email', 'Telefone', 'Instagram', 'Website',
    'Origem', 'Cidade origem', 'Base', 'País residência',
    'Disciplinas', 'Especialidades', 'Idiomas', 'Keywords',
    'Países alvo',
    'Pode viajar', 'Passaporte UE', 'País passaporte', 'Cachê mínimo €',
    'Materiais %', 'Vocabulário SOMA',
    'Estado contrato', 'Prioridade', 'Booker',
    'Activo', 'Notas internas',
    'Bio', 'Vídeo', 'Drive',
    'Criado', 'Actualizado',
  ];

  const rows = artists.map((a) => {
    // Calcular % de materiais preenchidos
    const matFields: (keyof typeof a.materials)[] = [
      'bioPT', 'bioEN', 'bioES', 'bioCA',
      'pressPhoto', 'videoPresentation',
      'technicalRider', 'pressKit', 'pressClippings',
    ];
    const matDone = matFields.filter((f) => a.materials[f] === true).length;
    const matPct = Math.round((matDone / matFields.length) * 100);

    return [
      a.name,
      a.legalName ?? '',
      a.pronouns ?? '',
      a.email,
      a.phone,
      a.instagram,
      a.website ?? '',
      a.origin,
      a.originCity ?? '',
      a.base,
      a.residenceCountry,
      arr(a.disciplines),
      arr(a.specialties),
      arr(a.languages),
      arr(a.keywords),
      arr(a.targetCountries),
      a.mobility?.canTravel ? 'sim' : 'não',
      a.mobility?.hasEUPassport ? 'sim' : 'não',
      a.mobility?.passportCountry ?? '',
      a.minFee ?? '',
      `${matPct}%`,
      arr(a.cartografia?.raiz?.vocabulario),
      a.internal.contractStatus,
      a.internal.priority,
      a.internal.booker ?? '',
      a.active ? 'sim' : 'não',
      (a.internal.notes ?? '').replace(/\n/g, ' / '),
      (a.bio ?? '').replace(/\n/g, ' / '),
      a.videoLink ?? '',
      a.driveLink ?? '',
      a.createdAt ?? '',
      a.updatedAt ?? '',
    ].map(csvEscape).join(',');
  });

  const csv = [headers.map(csvEscape).join(','), ...rows].join('\n');

  // BOM para Excel abrir UTF-8 correctamente (acentos)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const today = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.download = `soma-ode-roster-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Exportar ficha de Artista em PDF (via print) ─────────────────────────────

export function exportArtistPDF(artist: Artist): void {
  const html = renderArtistHTML(artist);

  // Abrir numa janela nova com só o HTML da ficha
  const win = window.open('', '_blank', 'width=900,height=1200');
  if (!win) {
    alert('O browser bloqueou a janela de impressão. Permite pop-ups e tenta outra vez.');
    return;
  }

  win.document.write(html);
  win.document.close();

  // Pequeno delay para o CSS carregar antes de abrir o print
  win.onload = () => {
    setTimeout(() => {
      win.focus();
      win.print();
      // Não fechamos automaticamente — o utilizador pode querer rever
    }, 250);
  };
}

// ─── Template HTML da ficha ───────────────────────────────────────────────────

function renderArtistHTML(a: Artist): string {
  const matFields: (keyof typeof a.materials)[] = [
    'bioPT', 'bioEN', 'bioES', 'bioCA',
    'pressPhoto', 'videoPresentation',
    'technicalRider', 'pressKit', 'pressClippings',
  ];
  const matDone = matFields.filter((f) => a.materials[f] === true).length;
  const matPct = Math.round((matDone / matFields.length) * 100);

  const title = escapeHTML(a.name || 'Artista sem nome');
  const pronouns = a.pronouns ? ` (${escapeHTML(a.pronouns)})` : '';

  const sectionOrEmpty = (cond: boolean, html: string) => (cond ? html : '');

  const tagList = (items: string[] | undefined, className = 'tag') =>
    (items ?? []).length === 0
      ? '<span class="muted">—</span>'
      : (items ?? [])
          .map((t) => `<span class="${className}">${escapeHTML(t)}</span>`)
          .join(' ');

  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<title>${title} · SOMA ODÉ</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #111;
    background: #fff;
    margin: 0;
    line-height: 1.5;
    font-size: 11pt;
  }
  .header {
    border-bottom: 2px solid #1A6994;
    padding-bottom: 12px;
    margin-bottom: 18px;
  }
  .brand {
    font-size: 10pt;
    letter-spacing: 2px;
    color: #1A6994;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  h1 {
    margin: 0;
    font-size: 28pt;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  .subtitle {
    color: #666;
    font-size: 11pt;
    margin-top: 4px;
  }
  h2 {
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #1A6994;
    border-bottom: 0.5px solid #ddd;
    padding-bottom: 4px;
    margin: 20px 0 10px;
    font-weight: 700;
  }
  .row {
    display: flex;
    gap: 24px;
    margin-bottom: 8px;
  }
  .row > div { flex: 1; }
  .label {
    font-size: 9pt;
    color: #999;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .value {
    font-size: 11pt;
    color: #111;
  }
  .tag {
    display: inline-block;
    padding: 2px 10px;
    margin: 2px 4px 2px 0;
    background: rgba(26,105,148,0.1);
    color: #1A6994;
    border-radius: 12px;
    font-size: 10pt;
  }
  .tag-vocab {
    display: inline-block;
    padding: 2px 10px;
    margin: 2px 4px 2px 0;
    background: rgba(255,180,0,0.12);
    color: #8a5a00;
    border-radius: 12px;
    font-size: 10pt;
    font-weight: 600;
  }
  .muted { color: #aaa; font-style: italic; }
  p { margin: 4px 0; }
  .bio {
    background: #fafafa;
    padding: 12px 14px;
    border-radius: 6px;
    font-size: 11pt;
    line-height: 1.6;
  }
  .project {
    border-left: 2px solid #1A6994;
    padding: 6px 0 6px 12px;
    margin-bottom: 10px;
  }
  .project-name { font-weight: 600; }
  .project-meta { font-size: 9.5pt; color: #666; margin-top: 2px; }
  .project-summary { font-size: 10pt; margin-top: 4px; color: #333; }
  .cartografia-section {
    background: #fcfaf4;
    padding: 10px 14px;
    border-radius: 6px;
    margin-bottom: 8px;
    border-left: 3px solid #d9a400;
  }
  .cartografia-title {
    font-size: 10pt;
    font-weight: 700;
    color: #8a5a00;
    letter-spacing: 1px;
  }
  .cartografia-body {
    margin-top: 4px;
    font-size: 10.5pt;
    color: #333;
  }
  .footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 0.5px solid #ddd;
    font-size: 8pt;
    color: #999;
    text-align: center;
  }
  @media print {
    .no-print { display: none; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="brand">SOMA ODÉ · Ficha Curatorial</div>
  <h1>${title}${pronouns}</h1>
  ${a.legalName ? `<div class="subtitle">${escapeHTML(a.legalName)}</div>` : ''}
</div>

<h2>Contacto</h2>
<div class="row">
  <div>
    <div class="label">Email</div>
    <div class="value">${escapeHTML(a.email) || '<span class="muted">—</span>'}</div>
  </div>
  <div>
    <div class="label">Telefone</div>
    <div class="value">${escapeHTML(a.phone) || '<span class="muted">—</span>'}</div>
  </div>
</div>
<div class="row">
  <div>
    <div class="label">Instagram</div>
    <div class="value">${escapeHTML(a.instagram) || '<span class="muted">—</span>'}</div>
  </div>
  <div>
    <div class="label">Website</div>
    <div class="value">${escapeHTML(a.website ?? '') || '<span class="muted">—</span>'}</div>
  </div>
</div>

<h2>Localização</h2>
<div class="row">
  <div>
    <div class="label">Origem</div>
    <div class="value">${escapeHTML(a.origin)}${a.originCity ? ' · ' + escapeHTML(a.originCity) : ''}</div>
  </div>
  <div>
    <div class="label">Base actual</div>
    <div class="value">${escapeHTML(a.base)} · ${escapeHTML(a.residenceCountry)}</div>
  </div>
</div>

<h2>Perfil artístico</h2>
<div style="margin-bottom: 6px;">
  <div class="label">Disciplinas</div>
  <div>${tagList(a.disciplines)}</div>
</div>
${sectionOrEmpty((a.specialties ?? []).length > 0, `
<div style="margin-bottom: 6px;">
  <div class="label">Especialidades</div>
  <div>${tagList(a.specialties)}</div>
</div>`)}
<div style="margin-bottom: 6px;">
  <div class="label">Idiomas</div>
  <div>${tagList(a.languages)}</div>
</div>
${sectionOrEmpty((a.keywords ?? []).length > 0, `
<div style="margin-bottom: 6px;">
  <div class="label">Keywords</div>
  <div>${tagList(a.keywords)}</div>
</div>`)}

${sectionOrEmpty(!!a.bio?.trim(), `
<h2>Bio</h2>
<div class="bio">${escapeHTML(a.bio ?? '')}</div>
`)}

<h2>Territórios de interesse</h2>
<div>${tagList(a.targetCountries)}</div>

<h2>Mobilidade</h2>
<div class="row">
  <div>
    <div class="label">Pode viajar</div>
    <div class="value">${a.mobility?.canTravel ? 'Sim' : 'Não'}</div>
  </div>
  <div>
    <div class="label">Passaporte UE</div>
    <div class="value">${a.mobility?.hasEUPassport ? 'Sim' : 'Não'}</div>
  </div>
  <div>
    <div class="label">Cachê mínimo</div>
    <div class="value">${a.minFee ? '€ ' + a.minFee : '<span class="muted">—</span>'}</div>
  </div>
</div>

<h2>Materiais disponíveis (${matPct}%)</h2>
<div>
${matFields
  .map((f) => {
    const labelMap: Record<string, string> = {
      bioPT: 'Bio PT', bioEN: 'Bio EN', bioES: 'Bio ES', bioCA: 'Bio CA',
      pressPhoto: 'Foto imprensa', videoPresentation: 'Vídeo',
      technicalRider: 'Rider técnico', pressKit: 'Press kit', pressClippings: 'Clippings',
    };
    const checked = a.materials[f] === true;
    return `<span class="tag" style="${checked ? '' : 'opacity:0.35'}">${checked ? '✓' : '○'} ${labelMap[f as string]}</span>`;
  })
  .join('')}
</div>

${sectionOrEmpty((a.projects ?? []).length > 0, `
<h2>Projectos</h2>
${(a.projects ?? [])
  .map(
    (p) => `
<div class="project">
  <div class="project-name">${escapeHTML(p.name)}</div>
  <div class="project-meta">${[p.format, p.duration].filter(Boolean).map(escapeHTML).join(' · ')}${p.coversCosts ? ' · custos cobertos' : ''}</div>
  ${p.summary ? `<div class="project-summary">${escapeHTML(p.summary)}</div>` : ''}
</div>`,
  )
  .join('')}
`)}

${sectionOrEmpty(!!a.cartografia, renderCartografiaHTML(a))}

<div class="footer">
  Gerado por SOMA ODÉ · ${new Date().toLocaleDateString('pt-PT')}
</div>

</body>
</html>`;
}

// ─── Secção da Cartografia no PDF ────────────────────────────────────────────

function renderCartografiaHTML(a: Artist): string {
  const c = a.cartografia;
  if (!c) return '';

  const raiz = c.raiz;
  const campo = c.campo;
  const teia = c.teia;
  const rota = c.rota;

  const hasRaiz = raiz && (raiz.origens || raiz.tensoes || (raiz.vocabulario ?? []).length > 0);
  const hasCampo = campo && (campo.perfisAudiencia || campo.motivacaoAdesao);
  const hasTeia = teia && (teia.pares || teia.legitimacao || teia.redesInfluencia);
  const hasRota = rota && (rota.gaps || rota.planoExpansao);

  if (!hasRaiz && !hasCampo && !hasTeia && !hasRota && !c.posicionamentoEstrategico) {
    return '';
  }

  let out = '<h2>Cartografia SOMA</h2>';

  if (hasRaiz) {
    out += '<div class="cartografia-section">';
    out += '<div class="cartografia-title">⭐ RAIZ · identidade profunda</div>';
    out += '<div class="cartografia-body">';
    if ((raiz!.vocabulario ?? []).length > 0) {
      out += `<div style="margin-bottom:6px;"><b>Vocabulário:</b> ${(raiz!.vocabulario ?? [])
        .map((v) => `<span class="tag-vocab">${escapeHTML(v)}</span>`)
        .join('')}</div>`;
    }
    if (raiz!.origens) {
      out += `<p><b>Origens:</b> ${escapeHTML(raiz!.origens)}</p>`;
    }
    if (raiz!.tensoes) {
      out += `<p><b>Tensões:</b> ${escapeHTML(raiz!.tensoes)}</p>`;
    }
    out += '</div></div>';
  }

  if (hasCampo) {
    out += '<div class="cartografia-section">';
    out += '<div class="cartografia-title">CAMPO · quem recebe</div>';
    out += '<div class="cartografia-body">';
    if (campo!.perfisAudiencia) out += `<p><b>Audiência:</b> ${escapeHTML(campo!.perfisAudiencia)}</p>`;
    if (campo!.motivacaoAdesao) out += `<p><b>Motivação de adesão:</b> ${escapeHTML(campo!.motivacaoAdesao)}</p>`;
    if ((campo!.territoriosPublico ?? []).length > 0) {
      out += `<p><b>Territórios:</b> ${(campo!.territoriosPublico ?? []).map(escapeHTML).join(' · ')}</p>`;
    }
    out += '</div></div>';
  }

  if (hasTeia) {
    out += '<div class="cartografia-section">';
    out += '<div class="cartografia-title">TEIA · estrutura do circuito</div>';
    out += '<div class="cartografia-body">';
    if (teia!.pares) out += `<p><b>Pares:</b> ${escapeHTML(teia!.pares)}</p>`;
    if (teia!.legitimacao) out += `<p><b>Legitimação:</b> ${escapeHTML(teia!.legitimacao)}</p>`;
    if (teia!.redesInfluencia) out += `<p><b>Redes de influência:</b> ${escapeHTML(teia!.redesInfluencia)}</p>`;
    out += '</div></div>';
  }

  if (hasRota) {
    out += '<div class="cartografia-section">';
    out += '<div class="cartografia-title">ROTA · próximos territórios</div>';
    out += '<div class="cartografia-body">';
    if (rota!.gaps) out += `<p><b>Gaps:</b> ${escapeHTML(rota!.gaps)}</p>`;
    if ((rota!.corredores ?? []).length > 0) {
      out += `<p><b>Corredores:</b> ${(rota!.corredores ?? []).map(escapeHTML).join(' · ')}</p>`;
    }
    if (rota!.planoExpansao) out += `<p><b>Plano de expansão:</b> ${escapeHTML(rota!.planoExpansao)}</p>`;
    out += '</div></div>';
  }

  if (c.posicionamentoEstrategico) {
    out += '<div class="cartografia-section" style="background:#f0f5f9; border-left-color:#1A6994;">';
    out += '<div class="cartografia-title" style="color:#1A6994;">Posicionamento estratégico SOMA</div>';
    out += `<div class="cartografia-body">${escapeHTML(c.posicionamentoEstrategico)}</div>`;
    out += '</div>';
  }

  return out;
}

// ─── HTML escape ──────────────────────────────────────────────────────────────

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}