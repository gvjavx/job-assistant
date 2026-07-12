import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

/**
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @param {string} originalName
 * @returns {Promise<string>} extracted plain text
 */
export async function extractText (buffer, mimetype, originalName = '') {
  const lowerName = originalName.toLowerCase()

  if (mimetype === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const data = await pdfParse(buffer)
    return data.text || ''
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    const { value } = await mammoth.extractRawText({ buffer })
    return value || ''
  }

  if (mimetype === 'text/plain' || lowerName.endsWith('.txt')) {
    return buffer.toString('utf-8')
  }

  // .doc (legacy binary Word) has no reliable pure-JS parser — ask the user to re-save as .docx/.pdf.
  if (lowerName.endsWith('.doc')) {
    throw new Error('Format .doc lama belum didukung. Simpan ulang sebagai .docx atau .pdf lalu unggah lagi.')
  }

  throw new Error('Format file tidak dikenali. Gunakan PDF, DOCX, atau TXT.')
}
