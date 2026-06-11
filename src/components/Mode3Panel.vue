<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { NOTES, OPEN_STRINGS } from '../utils/music.js'
import { recordMode3Session, getMode3Stats } from '../utils/storage.js'

const emit = defineEmits(['question-change'])

// ─── 設定 ─────────────────────────────────────────────────────────
const bpm          = ref(80)
const barsPerCycle = ref(4)    // 1, 2 or 4 小節
const guideDelay   = ref(3)    // 秒
const targetStrings = ref([5, 6]) // 練習対象の弦

// ─── 状態 ─────────────────────────────────────────────────────────
const isPlaying   = ref(false)
const isCountIn   = ref(false) // カウントイン中かどうか
const currentBeat = ref(0)  // 現在の拍（0, 1, 2, 3）
const currentBar  = ref(0)  // 現在の小節数（カウントイン後は1から）
const currentNote = ref(null) // 現在の音名
const nextNote    = ref(null) // 次の音名

// ─── 練習時間記録 ─────────────────────────────────────────────────
const sessionStartTime = ref(null) // セッション開始時刻
const stats = ref(getMode3Stats()) // 統計情報

// ─── メトロノーム ─────────────────────────────────────────────────
let audioContext = null
let intervalId = null
let guideTimeoutId = null

const beatInterval = computed(() => (60 / bpm.value) * 1000) // ms

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
}

function playClick(isDownbeat = false) {
  if (!audioContext) return
  
  const osc = audioContext.createOscillator()
  const gain = audioContext.createGain()
  
  // ダウンビート（1拍目）は高い音、それ以外は低い音
  osc.frequency.value = isDownbeat ? 1200 : 800
  osc.type = 'sine'
  
  gain.gain.setValueAtTime(0.3, audioContext.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05)
  
  osc.connect(gain)
  gain.connect(audioContext.destination)
  
  osc.start(audioContext.currentTime)
  osc.stop(audioContext.currentTime + 0.05)
}

function generateNewQuestion() {
  const stringNum = targetStrings.value[Math.floor(Math.random() * targetStrings.value.length)]
  const noteName  = NOTES[Math.floor(Math.random() * NOTES.length)]
  const strData   = OPEN_STRINGS.find(s => s.string === stringNum)
  
  return {
    note: noteName,
    string: stringNum,
    stringLabel: strData?.label || `${stringNum}弦`,
  }
}

function advanceToNextQuestion() {
  // 次の音を現在の音に移動
  currentNote.value = nextNote.value
  // 新しい次の音を生成
  nextNote.value = generateNewQuestion()
  
  // 現在の音の情報をemit（ガイド非表示）
  if (currentNote.value) {
    emit('question-change', { ...currentNote.value, showGuide: false })
    
    // 遅延後にガイドを表示
    if (guideTimeoutId) clearTimeout(guideTimeoutId)
    guideTimeoutId = setTimeout(() => {
      if (isPlaying.value && currentNote.value) {
        emit('question-change', { ...currentNote.value, showGuide: true })
      }
    }, guideDelay.value * 1000)
  }
}

function tick() {
  // 先に拍を進める
  currentBeat.value = (currentBeat.value + 1) % 4
  
  // 更新後の拍で判定して音を鳴らす
  const isDownbeat = currentBeat.value === 0
  playClick(isDownbeat)
  
  // 小節の最初の拍で小節数をカウント
  if (isDownbeat) {
    currentBar.value++
    
    if (isCountIn.value) {
      // カウントイン中は1小節（4拍）だけ
      if (currentBar.value >= 1) {
        isCountIn.value = false
        currentBar.value = 0 // 本番用にリセット
        // 最初の問題を開始
        advanceToNextQuestion()
      }
    } else {
      // N小節ごとに問題を切り替え
      if (currentBar.value % barsPerCycle.value === 0) {
        advanceToNextQuestion()
      }
    }
  }
}

function start() {
  if (isPlaying.value) return
  
  initAudio()
  isPlaying.value = true
  isCountIn.value = true  // カウントインから開始
  currentBeat.value = 3   // 次のtick()で0になる（1拍目から開始）
  currentBar.value = -1   // 最初のダウンビートで0になる
  currentNote.value = null
  
  // セッション開始時刻を記録
  sessionStartTime.value = Date.now()
  
  // 最初の2つの問題を事前生成
  nextNote.value = generateNewQuestion()
  
  // 即座に最初のクリックを鳴らす（カウントイン開始）
  tick()
  
  // 以降は一定間隔でクリック
  intervalId = setInterval(tick, beatInterval.value)
}

function stop() {
  // 練習時間を記録
  if (sessionStartTime.value) {
    const duration = Math.round((Date.now() - sessionStartTime.value) / 1000) // 秒単位
    const settings = {
      bpm: bpm.value,
      barsPerCycle: barsPerCycle.value,
      guideDelay: guideDelay.value,
      targetStrings: [...targetStrings.value],
    }
    recordMode3Session(duration, settings)
    stats.value = getMode3Stats() // 統計情報を更新
    sessionStartTime.value = null
  }
  
  isPlaying.value = false
  isCountIn.value = false
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  if (guideTimeoutId) {
    clearTimeout(guideTimeoutId)
    guideTimeoutId = null
  }
  currentBeat.value = 0
  currentBar.value = 0
  currentNote.value = null
  nextNote.value = null
  emit('question-change', null)
}

// 時間をフォーマット（秒 → "X分Y秒"）
function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds}秒`
  }
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  if (sec === 0) {
    return `${min}分`
  }
  return `${min}分${sec}秒`
}

// コンポーネント破棄時にクリーンアップ
onUnmounted(() => {
  stop()
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }
})
</script>

<template>
  <div class="mode3-panel">
    
    <!-- 設定パネル -->
    <div v-if="!isPlaying" class="settings-panel">
      <h3 class="panel-title">練習設定</h3>
      
      <div class="setting-row">
        <label class="setting-label">テンポ（BPM）</label>
        <div class="slider-box">
          <input 
            type="range" 
            v-model.number="bpm" 
            min="40" 
            max="200" 
            step="1"
            class="slider"
          />
          <span class="value-display">{{ bpm }}</span>
        </div>
      </div>
      
      <div class="setting-row">
        <label class="setting-label">小節数（音の切り替え）</label>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" :value="1" v-model.number="barsPerCycle" />
            1小節
          </label>
          <label class="radio-label">
            <input type="radio" :value="2" v-model.number="barsPerCycle" />
            2小節
          </label>
          <label class="radio-label">
            <input type="radio" :value="4" v-model.number="barsPerCycle" />
            4小節
          </label>
        </div>
      </div>
      
      <div class="setting-row">
        <label class="setting-label">ガイド表示の遅延（秒）</label>
        <div class="slider-box">
          <input 
            type="range" 
            v-model.number="guideDelay" 
            min="0" 
            max="10" 
            step="0.5"
            class="slider"
          />
          <span class="value-display">{{ guideDelay }}秒</span>
        </div>
      </div>
      
      <div class="setting-row">
        <label class="setting-label">練習する弦</label>
        <div class="checkbox-group strings-grid">
          <label class="checkbox-label">
            <input type="checkbox" :value="1" v-model="targetStrings" />
            1弦
          </label>
          <label class="checkbox-label">
            <input type="checkbox" :value="2" v-model="targetStrings" />
            2弦
          </label>
          <label class="checkbox-label">
            <input type="checkbox" :value="3" v-model="targetStrings" />
            3弦
          </label>
          <label class="checkbox-label">
            <input type="checkbox" :value="4" v-model="targetStrings" />
            4弦
          </label>
          <label class="checkbox-label">
            <input type="checkbox" :value="5" v-model="targetStrings" />
            5弦
          </label>
          <label class="checkbox-label">
            <input type="checkbox" :value="6" v-model="targetStrings" />
            6弦
          </label>
        </div>
      </div>
    </div>
    
    <!-- 再生中の表示 -->
    <div v-else class="playing-panel">
      
      <!-- カウントイン中 -->
      <div v-if="isCountIn" class="countin-box">
        <p class="countin-label">準備中...</p>
        <p class="countin-number">{{ currentBeat + 1 }}</p>
      </div>
      
      <!-- 練習中 -->
      <div v-else class="questions-box">
        <div class="question-column">
          <p class="question-label">現在の音</p>
          <p v-if="currentNote" class="question-text">
            <span class="q-accent">{{ currentNote.stringLabel }}</span> の
            <span class="q-accent">{{ currentNote.note }}</span>
          </p>
        </div>
        
        <div class="question-divider"></div>
        
        <div class="question-column">
          <p class="question-label">次の音</p>
          <p v-if="nextNote" class="question-text next-text">
            <span class="q-accent-next">{{ nextNote.stringLabel }}</span> の
            <span class="q-accent-next">{{ nextNote.note }}</span>
          </p>
        </div>
      </div>
      
      <div class="metronome-indicator">
        <div 
          v-for="i in 4" 
          :key="i"
          class="beat-dot"
          :class="{ 
            active: currentBeat === i - 1,
            downbeat: i === 1,
          }"
        ></div>
      </div>
      
      <div class="info-row">
        <span class="info-item">小節: {{ currentBar }}</span>
        <span class="info-item">BPM: {{ bpm }}</span>
      </div>
    </div>
    
    <!-- コントロールボタン -->
    <div class="control-buttons">
      <button 
        v-if="!isPlaying" 
        class="play-btn"
        :disabled="targetStrings.length === 0"
        @click="start"
      >
        ▶ 開始
      </button>
      <button 
        v-else 
        class="stop-btn"
        @click="stop"
      >
        ■ 停止
      </button>
    </div>
    
    <!-- 練習統計 -->
    <div class="stats-section">
      <h3 class="stats-title">📊 練習統計</h3>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">累計練習時間</div>
          <div class="stat-value">{{ formatTime(stats.totalTime) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">セッション数</div>
          <div class="stat-value">{{ stats.sessionCount }}回</div>
        </div>
      </div>
    </div>
    
  </div>
</template>

<style scoped>
.mode3-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
  max-width: 560px;
  padding: 8px 0;
}

/* 設定パネル */
.settings-panel {
  width: 100%;
  background: rgba(26, 21, 32, 0.5);
  border: 1px solid #3a2f48;
  border-radius: 12px;
  padding: 20px 24px;
}
.panel-title {
  margin: 0 0 18px;
  font-size: 16px;
  color: #e0d4c0;
  text-align: center;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
}
.setting-label {
  font-size: 14px;
  color: #b0a090;
  min-width: 140px;
}

/* スライダー */
.slider-box {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #2a2030;
  outline: none;
  cursor: pointer;
}
.slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fbbf24;
  cursor: pointer;
}
.slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fbbf24;
  border: none;
  cursor: pointer;
}
.value-display {
  min-width: 50px;
  font-weight: 700;
  color: #fbbf24;
  text-align: right;
}

/* ラジオボタン */
.radio-group,
.checkbox-group {
  display: flex;
  gap: 12px;
}
.strings-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}
.radio-label,
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #c0b0a0;
  cursor: pointer;
}
.radio-label input,
.checkbox-label input {
  cursor: pointer;
}

/* 再生中パネル */
.playing-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
}

/* カウントイン表示 */
.countin-box {
  text-align: center;
  padding: 20px;
}
.countin-label {
  margin: 0 0 12px;
  font-size: 14px;
  color: #9a8a6a;
  letter-spacing: 0.1em;
}
.countin-number {
  margin: 0;
  font-size: 64px;
  font-weight: 900;
  color: #fbbf24;
  line-height: 1;
  animation: pulse 0.3s ease;
}
@keyframes pulse {
  0% { transform: scale(0.7); opacity: 0.5; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

/* 練習中の問題表示 */
.questions-box {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  width: 100%;
  justify-content: center;
}
.question-column {
  flex: 0 0 auto;
  text-align: center;
  min-width: 180px;
}
.question-divider {
  width: 1px;
  height: 80px;
  background: linear-gradient(to bottom, transparent, #4a3a50, transparent);
}
.question-label {
  margin: 0 0 8px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #6a5a40;
  font-weight: 600;
}
.question-text {
  margin: 0;
  font-size: 18px;
  color: #e0d4c0;
  line-height: 1.6;
}
.next-text {
  opacity: 0.65;
}
.q-accent {
  font-size: 28px;
  font-weight: 900;
  color: #fbbf24;
  display: block;
  margin-top: 4px;
}
.q-accent-next {
  font-size: 24px;
  font-weight: 700;
  color: #9a8a6a;
  display: block;
  margin-top: 4px;
}

/* メトロノームインジケーター */
.metronome-indicator {
  display: flex;
  gap: 10px;
}
.beat-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3a3040;
  transition: all 0.05s;
}
.beat-dot.active {
  background: #4ade80;
  box-shadow: 0 0 12px #4ade80;
  transform: scale(1.3);
}
.beat-dot.downbeat.active {
  background: #fbbf24;
  box-shadow: 0 0 12px #fbbf24;
}

.info-row {
  display: flex;
  gap: 24px;
  font-size: 13px;
  color: #8a7a6a;
}
.info-item {
  font-family: monospace;
}

/* ボタン */
.control-buttons {
  width: 100%;
  display: flex;
  justify-content: center;
}
.play-btn,
.stop-btn {
  padding: 16px 56px;
  font-size: 18px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.play-btn {
  background: #16a34a;
  color: white;
}
.play-btn:hover:not(:disabled) {
  background: #15803d;
  transform: translateY(-2px);
}
.play-btn:disabled {
  background: #3a3040;
  color: #6a5a50;
  cursor: not-allowed;
}
.stop-btn {
  background: #dc2626;
  color: white;
}
.stop-btn:hover {
  background: #b91c1c;
  transform: translateY(-2px);
}

/* 統計セクション */
.stats-section {
  width: 100%;
  max-width: 600px;
  margin-top: 32px;
  padding: 24px;
  background: rgba(26, 21, 32, 0.6);
  border: 2px solid #3a2f48;
  border-radius: 12px;
}

.stats-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: #e0d4c0;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.stat-card {
  background: rgba(58, 47, 72, 0.5);
  padding: 16px;
  border-radius: 8px;
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #9a8a6a;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #fbbf24;
}
</style>
