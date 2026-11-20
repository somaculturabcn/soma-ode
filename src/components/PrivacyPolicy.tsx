import { colors, shadows, radius } from '../theme'
// src/components/PrivacyPolicy.tsx
// SOMA ODÉ v7 — Política de Privacidade (RGPD + LOPDGDD)

type Props = {
  onBack: () => void
}

export default function PrivacyPolicy({ onBack }: Props) {
  return (
    <div style={st.page}>
      <div style={st.container}>
        <button style={st.backBtn} onClick={onBack}>← Voltar</button>

        <h1 style={st.title}>Política de Privacidade</h1>
        <p style={st.updated}>Última atualização: novembro de 2026 · Versão 1.0</p>

        <div style={st.content}>

          <Section title="1. Quem somos">
            <p>
              <strong>SOMA Cultura Asociación Cultural</strong> ("SOMA", "nós"), com sede em Barcelona, Espanha,
              é a responsável pelo tratamento dos teus dados pessoais na plataforma SOMA ODÉ.
            </p>
            <p>
              Contacto para questões de privacidade:{' '}
              <strong>privacidade@somacultura.com</strong>
            </p>
          </Section>

          <Section title="2. Que dados recolhemos">
            <ul style={st.list}>
              <li><strong>Dados de identificação:</strong> nome, email, password (encriptada)</li>
              <li><strong>Perfil artístico:</strong> disciplinas, bio, origem, idiomas, regiões-alvo, keywords</li>
              <li><strong>Cartografia SOMA:</strong> respostas aos 4 eixos (RAIZ, CAMPO, TEIA, ROTA) — perfil de identidade artística</li>
              <li><strong>Dados de mobilidade:</strong> passaporte UE, disponibilidade para viajar, base</li>
              <li><strong>Contatos profissionais:</strong> redes sociais, website, telefone (fornecido voluntariamente)</li>
              <li><strong>Dados de projetos:</strong> horas, custos, campanhas vinculadas</li>
              <li><strong>Dados de uso:</strong> registo de atividade na plataforma (ações realizadas, timestamps)</li>
            </ul>
          </Section>

          <Section title="3. Para que usamos os teus dados">
            <ul style={st.list}>
              <li><strong>Criar e gerir a tua conta</strong> na plataforma (base legal: execução de contrato)</li>
              <li><strong>Match com oportunidades:</strong> cruzar o teu perfil com festivais, editais e espaços usando inteligência artificial (base legal: consentimento)</li>
              <li><strong>Gestão de projetos:</strong> vincular horas, custos e campanhas a artistas e projetos (base legal: execução de contrato)</li>
              <li><strong>Relatórios:</strong> gerar resumos de investimento e resultados para artistas (base legal: interesse legítimo)</li>
              <li><strong>Melhorar a plataforma:</strong> entender como usas o ODÉ para melhorar funcionalidades (base legal: interesse legítimo)</li>
            </ul>
          </Section>

          <Section title="4. Inteligência Artificial">
            <div style={st.aiBox}>
              <p>
                🤖 A SOMA ODÉ utiliza o modelo <strong>Gemini 2.5 Flash</strong> (Google) para:
              </p>
              <ul style={st.list}>
                <li>Gerar perfis artísticos na Cartografia SOMA (a partir das tuas respostas)</li>
                <li>Calcular scores de Match entre artistas e oportunidades</li>
                <li>Sugerir circuitos e comparações entre artistas</li>
              </ul>
              <p style={{ marginTop: 8 }}>
                <strong>Garantias:</strong>
              </p>
              <ul style={st.list}>
                <li>Os teus dados NÃO são utilizados para treinar modelos de IA</li>
                <li>Podes pedir <strong>revisão humana</strong> de qualquer decisão automatizada (Art. 22 RGPD)</li>
                <li>Nenhuma decisão que te afete significativamente é tomada exclusivamente por IA</li>
                <li>Podes desativar o uso de IA nas Configurações (a plataforma funciona em modo offline)</li>
              </ul>
            </div>
          </Section>

          <Section title="5. Com quem partilhamos os teus dados">
            <ul style={st.list}>
              <li><strong>Supabase (UE):</strong> infraestrutura de base de dados e autenticação — contrato de processamento de dados conforme Art. 28 RGPD</li>
              <li><strong>Vercel:</strong> hospedagem da plataforma web</li>
              <li><strong>Google (Gemini API):</strong> processamento de IA para Match e Cartografia — dados anonimizados quando possível</li>
              <li><strong>Google Drive:</strong> armazenamento de documentos (apenas se conectares a tua conta)</li>
              <li><strong>Membrz Club:</strong> bilheteira para eventos (apenas se usares a funcionalidade de venda de entradas)</li>
            </ul>
            <p style={{ marginTop: 8 }}>
              Não vendemos nem partilhamos os teus dados com terceiros para fins de marketing.
            </p>
          </Section>

          <Section title="6. Transferências internacionais">
            <p>
              Os teus dados são armazenados em servidores da UE (Supabase EU). Quando utilizamos serviços fora da UE
              (Google, Vercel), garantimos que existem cláusulas contratuais tipo (SCCs) ou decisões de adequação conforme
              o Capítulo V do RGPD.
            </p>
          </Section>

          <Section title="7. Os teus direitos">
            <p>Conforme o RGPD e a LOPDGDD, tens direito a:</p>
            <ul style={st.list}>
              <li><strong>Acesso:</strong> saber que dados temos sobre ti</li>
              <li><strong>Retificação:</strong> corrigir dados incorretos</li>
              <li><strong>Eliminação:</strong> apagar os teus dados ("direito ao esquecimento")</li>
              <li><strong>Portabilidade:</strong> exportar os teus dados em formato legível (JSON)</li>
              <li><strong>Oposição:</strong> opor-te ao tratamento dos teus dados</li>
              <li><strong>Limitação:</strong> restringir como usamos os teus dados</li>
              <li><strong>Revisão humana:</strong> pedir revisão humana de decisões automatizadas (IA)</li>
            </ul>
            <p style={{ marginTop: 8 }}>
              Podes exercer estes direitos a qualquer momento em <strong>Configurações → Proteção de dados</strong> ou
              enviando email para <strong>privacidade@somacultura.com</strong>.
            </p>
            <p style={{ marginTop: 8 }}>
              Se não ficares satisfeito/a com a nossa resposta, podes apresentar reclamação à{' '}
              <strong>AEPD — Agencia Española de Protección de Datos</strong> (
              <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" style={{ color: colors.primary }}>www.aepd.es</a>).
            </p>
          </Section>

          <Section title="8. Retenção de dados">
            <ul style={st.list}>
              <li><strong>Conta ativa:</strong> dados mantidos enquanto a conta existir</li>
              <li><strong>Após eliminação:</strong> dados apagados em até 30 dias de todos os sistemas</li>
              <li><strong>Backups:</strong> podem conter dados até 90 dias após eliminação, depois são purgados</li>
              <li><strong>Dados financeiros:</strong> mantidos por 5 anos conforme legislação fiscal espanhola</li>
            </ul>
          </Section>

          <Section title="9. Segurança">
            <ul style={st.list}>
              <li>Comunicações encriptadas via HTTPS/TLS</li>
              <li>Passwords encriptadas (bcrypt via Supabase Auth)</li>
              <li>Isolamento de dados por utilizador (Row Level Security)</li>
              <li>Chaves de API nunca expostas no frontend</li>
              <li>Logs de acesso e auditoria</li>
            </ul>
          </Section>

          <Section title="10. Cookies e armazenamento local">
            <p>
              A SOMA ODÉ utiliza <strong>localStorage</strong> (armazenamento do browser) para guardar as tuas
              preferências e dados da sessão. Não utilizamos cookies de terceiros nem tracking. O
              localStorage é local ao teu dispositivo e não é partilhado com ninguém.
            </p>
          </Section>

          <Section title="11. Menores">
            <p>
              A plataforma não é destinada a menores de 16 anos. Se tens menos de 16 anos, precisas
              do consentimento de um/a responsável legal para usar a SOMA ODÉ.
            </p>
          </Section>

          <Section title="12. Alterações a esta política">
            <p>
              Podemos atualizar esta política periodicamente. Serás notificado/a por email e/ou na plataforma
              antes de qualquer alteração significativa. A versão atual é sempre acessível em{' '}
              <strong>Configurações → Política de Privacidade</strong>.
            </p>
          </Section>

          <div style={st.footer}>
            <p>SOMA Cultura Asociación Cultural · Barcelona, Espanha</p>
            <p>privacidade@somacultura.com</p>
            <p>RGPD (UE) 2016/679 · LOPDGDD (ES) 3/2018</p>
          </div>

        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={st.section}>
      <h2 style={st.sectionTitle}>{title}</h2>
      {children}
    </div>
  )
}

const st: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: colors.bgPage, padding: '20px 20px 60px' },
  container: { maxWidth: 680, margin: '0 auto' },
  backBtn: { background: 'none', border: 'none', color: colors.textSecondary, fontSize: 13, cursor: 'pointer', padding: '4px 0', marginBottom: 16 },
  title: { margin: '0 0 4px', fontSize: 28, fontWeight: 700, color: colors.primary },
  updated: { margin: '0 0 28px', fontSize: 12, color: colors.textMuted },
  content: { color: colors.text, fontSize: 14, lineHeight: 1.7 },
  section: { marginBottom: 28, paddingBottom: 20, borderBottom: `1px solid ${colors.border}` },
  sectionTitle: { margin: '0 0 10px', fontSize: 17, fontWeight: 700, color: colors.text },
  list: { margin: '8px 0', paddingLeft: 20, display: 'flex', flexDirection: 'column' as const, gap: 6 },
  aiBox: { background: colors.primaryBg, border: '1px solid rgba(96,180,232,0.15)', borderRadius: 10, padding: '14px 16px', marginTop: 8 },
  footer: { textAlign: 'center' as const, padding: '24px 0', color: colors.textMuted, fontSize: 12 },
}
