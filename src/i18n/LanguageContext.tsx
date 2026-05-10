// src/i18n/LanguageContext.tsx
// SOMA ODÉ — Sistema de idiomas: PT-BR (padrão), ES, EN

import { createContext, useContext, useState, useEffect } from 'react'

export type Lang = 'pt' | 'es' | 'en'

export const TRANSLATIONS = {
  pt: {
    // Login
    welcome_back: 'Bem-vinda de volta',
    welcome_sub: 'Acesse seu perfil, oportunidades e cartografia.',
    email: 'E-mail',
    password: 'Senha',
    enter: 'Entrar',
    or: 'ou',
    continue_google: 'Continuar com Google',
    no_account: 'Ainda não tem conta?',
    im_artist: '🎤 Sou artista',
    im_producer: '🏠 Sou produtor/a',
    forgot: 'Esqueci a senha',
    // Signup artista
    create_artist: 'Criar conta — Artista',
    create_artist_sub: 'Registre-se como artista e comece a construir seu perfil.',
    create_artist_btn: 'Criar conta artista',
    // Signup produtor
    create_producer: 'Criar conta — Produtor/a',
    create_producer_sub: 'Crie seu workspace independente para gerenciar seu roster e eventos.',
    org_name: 'Nome da agência / organização',
    org_placeholder: 'Ex: Baile Total Produções',
    create_producer_btn: 'Criar conta produtor/a',
    // Recovery
    forgot_title: 'Recuperar senha',
    forgot_sub: 'Insira seu e-mail para receber o link de recuperação.',
    send_link: 'Enviar link',
    // New password
    new_password_title: 'Nova senha',
    new_password_sub: 'Escolha uma nova senha para sua conta.',
    new_password: 'Nova senha',
    confirm_password: 'Confirmar senha',
    save_password: 'Salvar nova senha',
    passwords_no_match: 'As senhas não coincidem.',
    password_saved: 'Senha atualizada! Redirecionando...',
    // Back
    back_login: '← Voltar ao login',
    // Messages
    account_created: 'Conta criada! Verifique seu e-mail e depois faça login.',
    recovery_sent: 'Link de recuperação enviado! Verifique sua caixa de entrada.',
    wrong_credentials: 'E-mail ou senha incorretos.',
    // Footer
    footer: 'SOMA ODÉ — Plataforma de Inteligência Curatorial',
  },
  es: {
    welcome_back: 'Bienvenida de vuelta',
    welcome_sub: 'Accede a tu perfil, oportunidades y cartografía.',
    email: 'Correo electrónico',
    password: 'Contraseña',
    enter: 'Entrar',
    or: 'o',
    continue_google: 'Continuar con Google',
    no_account: '¿Aún no tienes cuenta?',
    im_artist: '🎤 Soy artista',
    im_producer: '🏠 Soy productor/a',
    forgot: 'Olvidé mi contraseña',
    create_artist: 'Crear cuenta — Artista',
    create_artist_sub: 'Regístrate como artista y empieza a construir tu perfil.',
    create_artist_btn: 'Crear cuenta artista',
    create_producer: 'Crear cuenta — Productor/a',
    create_producer_sub: 'Crea tu workspace independiente para gestionar tu roster y eventos.',
    org_name: 'Nombre de la agencia / organización',
    org_placeholder: 'Ej: Baile Total Producciones',
    create_producer_btn: 'Crear cuenta productor/a',
    forgot_title: 'Recuperar contraseña',
    forgot_sub: 'Introduce tu correo para recibir el enlace de recuperación.',
    send_link: 'Enviar enlace',
    new_password_title: 'Nueva contraseña',
    new_password_sub: 'Elige una nueva contraseña para tu cuenta.',
    new_password: 'Nueva contraseña',
    confirm_password: 'Confirmar contraseña',
    save_password: 'Guardar nueva contraseña',
    passwords_no_match: 'Las contraseñas no coinciden.',
    password_saved: 'Contraseña actualizada. Redirigiendo...',
    back_login: '← Volver al login',
    account_created: 'Cuenta creada. Verifica tu correo y luego inicia sesión.',
    recovery_sent: '¡Enlace de recuperación enviado! Revisa tu bandeja de entrada.',
    wrong_credentials: 'Correo o contraseña incorrectos.',
    footer: 'SOMA ODÉ — Plataforma de Inteligencia Curatorial',
  },
  en: {
    welcome_back: 'Welcome back',
    welcome_sub: 'Access your profile, opportunities and cartography.',
    email: 'Email',
    password: 'Password',
    enter: 'Sign in',
    or: 'or',
    continue_google: 'Continue with Google',
    no_account: "Don't have an account?",
    im_artist: '🎤 I am an artist',
    im_producer: '🏠 I am a producer',
    forgot: 'Forgot my password',
    create_artist: 'Create account — Artist',
    create_artist_sub: 'Register as an artist and start building your profile.',
    create_artist_btn: 'Create artist account',
    create_producer: 'Create account — Producer',
    create_producer_sub: 'Create your independent workspace to manage your roster and events.',
    org_name: 'Agency / organization name',
    org_placeholder: 'Ex: Baile Total Productions',
    create_producer_btn: 'Create producer account',
    forgot_title: 'Reset password',
    forgot_sub: 'Enter your email to receive the recovery link.',
    send_link: 'Send link',
    new_password_title: 'New password',
    new_password_sub: 'Choose a new password for your account.',
    new_password: 'New password',
    confirm_password: 'Confirm password',
    save_password: 'Save new password',
    passwords_no_match: 'Passwords do not match.',
    password_saved: 'Password updated! Redirecting...',
    back_login: '← Back to login',
    account_created: 'Account created! Check your email and then sign in.',
    recovery_sent: 'Recovery link sent! Check your inbox.',
    wrong_credentials: 'Incorrect email or password.',
    footer: 'SOMA ODÉ — Curatorial Intelligence Platform',
  },
}

type LangContextType = {
  lang: Lang
  setLang: (l: Lang) => void
  t: typeof TRANSLATIONS['pt']
}

const LangContext = createContext<LangContextType>({
  lang: 'pt',
  setLang: () => {},
  t: TRANSLATIONS.pt,
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('soma-lang') as Lang | null
    return saved && ['pt', 'es', 'en'].includes(saved) ? saved : 'pt'
  })

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('soma-lang', l)
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t: TRANSLATIONS[lang] }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LangContext)
}

export const LANG_FLAGS: Record<Lang, string> = {
  pt: '🇧🇷',
  es: '🇪🇸',
  en: '🇬🇧',
}