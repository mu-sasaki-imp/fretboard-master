/**
 * スケール（音階）定義とフィルタリング
 */

import { NOTES } from './music.js'

/**
 * スケールタイプの定義
 * intervals: ルート音からの半音数の配列
 */
export const SCALE_TYPES = {
  MAJOR: {
    id: 'major',
    name: 'Major',
    intervals: [0, 2, 4, 5, 7, 9, 11], // 全全半全全全半
  },
  NATURAL_MINOR: {
    id: 'natural_minor',
    name: 'Natural Minor',
    intervals: [0, 2, 3, 5, 7, 8, 10], // 全半全全半全全
  },
}

/**
 * ルート音（キー）の選択肢
 */
export const ROOT_NOTES = NOTES // ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/**
 * 出題範囲モード
 */
export const RANGE_MODES = {
  RANDOM: 'random',           // 完全ランダム
  SCALE: 'scale',             // キー・スケール指定
}

/**
 * 指定されたキーとスケールに含まれる音名のリストを取得
 * @param {string} rootNote - ルート音 ('C', 'D#', など)
 * @param {Array<number>} intervals - スケールのインターバル配列
 * @returns {Array<string>} スケールに含まれる音名の配列
 */
export function getScaleNotes(rootNote, intervals) {
  const rootIndex = NOTES.indexOf(rootNote)
  if (rootIndex === -1) return []
  
  return intervals.map(interval => {
    return NOTES[(rootIndex + interval) % 12]
  })
}

/**
 * 指定された音名がスケールに含まれるかチェック
 * @param {string} noteName - チェックする音名
 * @param {string} rootNote - ルート音
 * @param {Array<number>} intervals - スケールのインターバル配列
 * @returns {boolean} スケールに含まれる場合true
 */
export function isNoteInScale(noteName, rootNote, intervals) {
  if (!intervals) return true // 完全ランダム（制限なし）
  const scaleNotes = getScaleNotes(rootNote, intervals)
  return scaleNotes.includes(noteName)
}

/**
 * スケール設定のデフォルト値
 */
export const DEFAULT_SCALE_SETTINGS = {
  rangeMode: RANGE_MODES.RANDOM,
  rootNote: 'C',
  scaleType: SCALE_TYPES.MAJOR.id,
}
