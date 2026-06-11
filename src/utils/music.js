// 音名の配列（クロマチックスケール）
export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

// 標準チューニング: 6弦(Low E) → 1弦(High e)
export const OPEN_STRINGS = [
  { string: 6, noteIndex: 4,  label: '6弦' }, // E
  { string: 5, noteIndex: 9,  label: '5弦' }, // A
  { string: 4, noteIndex: 2,  label: '4弦' }, // D
  { string: 3, noteIndex: 7,  label: '3弦' }, // G
  { string: 2, noteIndex: 11, label: '2弦' }, // B
  { string: 1, noteIndex: 4,  label: '1弦' }, // e
]

export const FRET_MARKERS = [3, 5, 7, 9, 12]
export const MAX_FRET = 12

/**
 * 弦番号とフレット番号から音名を返す
 * @param {number} stringNumber - 弦番号 (1〜6)
 * @param {number} fret - フレット番号 (0〜12)
 * @returns {string} 音名 (例: 'A', 'F#')
 */
export function getNoteAtFret(stringNumber, fret) {
  const str = OPEN_STRINGS.find(s => s.string === stringNumber)
  return str ? NOTES[(str.noteIndex + fret) % 12] : null
}

/**
 * ランダムな問題を生成する
 * @returns {{ string, fret, note, stringLabel }}
 */
export function generateQuestion() {
  const strData = OPEN_STRINGS[Math.floor(Math.random() * OPEN_STRINGS.length)]
  const fret = Math.floor(Math.random() * (MAX_FRET + 1))
  const note = getNoteAtFret(strData.string, fret)
  return {
    string: strData.string,
    fret,
    note,
    stringLabel: strData.label,
  }
}
