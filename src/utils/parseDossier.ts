// src/utils/parseDossier.ts

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf'

// 👇 ESTO ES CLAVE — sin esto rompe
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js'

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer()

    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

    let text = ''

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()

      const strings = content.items.map((item: any) => item.str)
      text += strings.join(' ') + '\n'
    }

    return text
  } catch (err) {
    console.error('PDF error:', err)
    return ''
  }
}