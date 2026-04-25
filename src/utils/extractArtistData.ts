// src/utils/extractArtistData.ts

export function extractArtistData(text: string) {
  const lower = text.toLowerCase()

  function findEmail() {
    const match = text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)
    return match ? match[0] : ''
  }

  function findWebsite() {
    const match = text.match(/https?:\/\/[^\s]+/)
    return match ? match[0] : ''
  }

  return {
    email: findEmail(),
    website: findWebsite(),
    bio: text.slice(0, 500),
    keywords: extractKeywords(lower),
  }
}

function extractKeywords(text: string): string[] {
  const words = text.split(' ')
  return words
    .filter(w => w.length > 6)
    .slice(0, 10)
}