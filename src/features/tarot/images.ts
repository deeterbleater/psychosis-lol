import type { CardRow } from './deck'

const suitCodeByWord: Record<string, string> = {
  Wands: 'W',
  Cups: 'C',
  Swords: 'S',
  Disks: 'D',
  disks: 'D',
}

const rankCodeByWord: Record<string, string> = {
  Ace: '0A',
  Two: '02',
  Three: '03',
  Four: '04',
  Five: '05',
  Six: '06',
  Seven: '07',
  Eight: '08',
  Nine: '09',
  Ten: '10',
  Knight: 'KN',
  Queen: 'QU',
  Prince: 'PN',
  Princess: 'PS',
}

export function imageBaseFromCard(card: CardRow): string {
  // If card has a space + 'of' it's a minor arcana, else major
  const baseName = card.name.replace(' Reversed', '')
  if (baseName.includes(' of ')) {
    // Minor arcana
    const [rankWord, , suitWordRaw] = baseName.split(' ')
    const suitWord = suitWordRaw as keyof typeof suitCodeByWord
    const suitCode = suitCodeByWord[suitWord] ?? 'T'
    const rankCode = rankCodeByWord[rankWord as keyof typeof rankCodeByWord] ?? '00'
    return `Thot-${suitCode}-${rankCode}`
  }
  // Major arcana: use numeric in img column (0..21)
  const majorIndex = Number(card.img)
  const two = Number.isFinite(majorIndex) ? String(majorIndex).padStart(2, '0') : '00'
  return `Thot-T-${two}`
}


