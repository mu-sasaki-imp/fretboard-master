/**
 * ギター音の生成・再生ユーティリティ
 */

// 標準チューニングの開放弦周波数（Hz）
const OPEN_STRING_FREQUENCIES = {
  6: 82.41,   // E2
  5: 110.00,  // A2
  4: 146.83,  // D3
  3: 196.00,  // G3
  2: 246.94,  // B3
  1: 329.63,  // E4
}

/**
 * 弦番号とフレット番号から周波数を計算
 * @param {number} stringNumber - 弦番号 (1-6)
 * @param {number} fret - フレット番号 (0-12)
 * @returns {number} 周波数（Hz）
 */
export function getFrequency(stringNumber, fret) {
  const openFreq = OPEN_STRING_FREQUENCIES[stringNumber]
  if (!openFreq) return 440 // デフォルト（A4）
  
  // 各フレット = 半音上がる = 周波数 × 2^(1/12)
  return openFreq * Math.pow(2, fret / 12)
}

/**
 * 音色の種類
 */
export const TONE_TYPES = {
  SINE: 'sine',      // サイン波（シンプル）
  GUITAR: 'guitar',  // ギターっぽい音
}

/**
 * AudioContextのシングルトン
 */
let audioContext = null

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioContext
}

/**
 * ユーザーインタラクションでAudioContextを初期化
 * （iOSのautoplay制限対策）
 */
export function initAudioContext() {
  const ctx = getAudioContext()
  if (ctx.state === 'suspended') {
    ctx.resume()
  }
  return ctx
}

/**
 * サイン波で音を鳴らす
 * @param {number} frequency - 周波数（Hz）
 * @param {number} duration - 音の長さ（秒）
 * @param {AudioContext} ctx - AudioContext
 */
function playSineWave(frequency, duration, ctx) {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  
  // 音量エンベロープ（フェードアウト）
  const now = ctx.currentTime
  gainNode.gain.setValueAtTime(0.3, now)
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration)
  
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  
  oscillator.start(now)
  oscillator.stop(now + duration)
}

/**
 * ギターっぽい音を鳴らす（倍音 + ADSRエンベロープ）
 * @param {number} frequency - 周波数（Hz）
 * @param {number} duration - 音の長さ（秒）
 * @param {AudioContext} ctx - AudioContext
 */
function playGuitarTone(frequency, duration, ctx) {
  const now = ctx.currentTime
  
  // 複数の倍音を重ねる
  const harmonics = [
    { freq: frequency,       gain: 0.4 },  // 基音
    { freq: frequency * 2,   gain: 0.2 },  // 2倍音
    { freq: frequency * 3,   gain: 0.1 },  // 3倍音
    { freq: frequency * 4,   gain: 0.05 }, // 4倍音
  ]
  
  const masterGain = ctx.createGain()
  
  harmonics.forEach(({ freq, gain }) => {
    const osc = ctx.createOscillator()
    const oscGain = ctx.createGain()
    
    osc.type = 'sine'
    osc.frequency.value = freq
    
    // ADSR エンベロープ
    const attack = 0.005   // 5ms - 素早い立ち上がり
    const decay = 0.1      // 100ms - 減衰
    const sustain = 0.3    // サステインレベル
    const release = 0.5    // 500ms - リリース
    
    oscGain.gain.setValueAtTime(0, now)
    oscGain.gain.linearRampToValueAtTime(gain, now + attack)
    oscGain.gain.exponentialRampToValueAtTime(gain * sustain, now + attack + decay)
    oscGain.gain.setValueAtTime(gain * sustain, now + duration - release)
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    
    osc.connect(oscGain)
    oscGain.connect(masterGain)
    
    osc.start(now)
    osc.stop(now + duration)
  })
  
  masterGain.connect(ctx.destination)
}

/**
 * 指定された弦とフレットの音を鳴らす
 * @param {number} stringNumber - 弦番号 (1-6)
 * @param {number} fret - フレット番号 (0-12)
 * @param {string} toneType - 音色タイプ ('sine' | 'guitar')
 * @param {number} duration - 音の長さ（秒）デフォルト: 1秒
 */
export function playNote(stringNumber, fret, toneType = TONE_TYPES.GUITAR, duration = 1.0) {
  try {
    const ctx = initAudioContext()
    const frequency = getFrequency(stringNumber, fret)
    
    if (toneType === TONE_TYPES.SINE) {
      playSineWave(frequency, duration, ctx)
    } else {
      playGuitarTone(frequency, duration, ctx)
    }
  } catch (error) {
    console.error('Failed to play note:', error)
  }
}
