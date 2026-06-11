<script setup>
import { ref, computed, watch } from 'vue'
import Fretboard from './components/Fretboard.vue'
import QuizPanel from './components/QuizPanel.vue'
import Mode3Panel from './components/Mode3Panel.vue'
import GameModeSelector from './components/GameModeSelector.vue'
import GameResults from './components/GameResults.vue'
import { generateQuestion, getNoteAtFret, MAX_FRET } from './utils/music.js'
import { GameSession } from './utils/session.js'
import { recordScore } from './utils/storage.js'
import { getGameModeSettings } from './utils/gameModes.js'

// ─── 状態 ─────────────────────────────────────────────────────────
const currentMode  = ref('mode1')   // 'mode1' | 'mode2' | 'mode3'
const screen = ref('modeSelect') // 'modeSelect' | 'playing' | 'results'
const selectedGameMode = ref(null) // ゲームモードID
const gameSession = ref(null)      // GameSession インスタンス
const question     = ref(null)
const phase        = ref('question') // 'question' | 'answered'
const isCorrect    = ref(null)
const selectedPos  = ref(null)       // Mode2 でユーザーがクリックした位置
const results = ref(null)            // ゲーム結果

// ゲーム進行用タイマー
const sessionTimer = ref(null)       // タイムアタック用タイマーID
const questionTimer = ref(null)      // 1問ごとのタイマーID
const questionTimerInterval = ref(null) // 1問ごとのカウントダウン表示用
const remainingTime = ref(0)         // セッション全体の残り時間（秒）
const questionRemainingTime = ref(0) // 1問ごとの残り時間（秒）

// Mode3 専用の状態
const mode3Question = ref(null) // { note, string, stringLabel, showGuide }

// ─── 指板ハイライトの計算 ─────────────────────────────────────────
const highlights = computed(() => {
  // Mode3: メトロノームモード
  if (currentMode.value === 'mode3') {
    if (!mode3Question.value || !mode3Question.value.showGuide) return []
    
    // 対象の弦にある、指定音名のすべてのポジションを表示
    const h = []
    for (let fret = 0; fret <= MAX_FRET; fret++) {
      const noteAtPos = getNoteAtFret(mode3Question.value.string, fret)
      if (noteAtPos === mode3Question.value.note) {
        h.push({
          string: mode3Question.value.string,
          fret,
          type: 'answer',
          showLabel: true,
        })
      }
    }
    return h
  }
  
  // Mode1 & Mode2
  if (!question.value) return []
  const h = []
  const q = question.value

  if (currentMode.value === 'mode1') {
    // Mode1: 問題のポジションをハイライト
    // 質問中は音名を隠す（showLabel: false）、回答後は表示する
    h.push({
      string: q.string,
      fret:   q.fret,
      type:   phase.value === 'question'
                ? 'question'
                : (isCorrect.value ? 'correct' : 'incorrect'),
      showLabel: phase.value !== 'question',  // 質問中は音名を非表示
    })
  } else if (phase.value === 'answered') {
    // Mode2 回答後: ユーザーがクリックした場所
    if (selectedPos.value) {
      h.push({ 
        ...selectedPos.value, 
        type: isCorrect.value ? 'correct' : 'incorrect',
        showLabel: true,
      })
    }
    // 不正解の場合は正解位置を青で表示
    if (isCorrect.value === false) {
      const correctFret = findFretForNote(q.string, q.note)
      if (correctFret !== null) {
        h.push({ 
          string: q.string, 
          fret: correctFret, 
          type: 'answer',
          showLabel: true,
        })
      }
    }
  }
  return h
})

// Mode2 で対象弦を強調 (質問中のみ)
// Mode3 でも対象弦を強調
const activeString = computed(() => {
  if (currentMode.value === 'mode2' && phase.value === 'question' && question.value) {
    return question.value.string
  }
  if (currentMode.value === 'mode3' && mode3Question.value) {
    return mode3Question.value.string
  }
  return null
})

// Mode2 の質問中のみ指板をクリック可能にする
const fretboardClickable = computed(() =>
  currentMode.value === 'mode2' && phase.value === 'question'
)

// ─── ヘルパー ─────────────────────────────────────────────────────
function findFretForNote(stringNum, noteName) {
  for (let f = 0; f <= MAX_FRET; f++) {
    if (getNoteAtFret(stringNum, f) === noteName) return f
  }
  return null
}

// ─── アクション ───────────────────────────────────────────────────

// ゲームモード選択
function handleGameModeSelect(gameModeId) {
  selectedGameMode.value = gameModeId
  startGame()
}

// ゲーム開始
function startGame() {
  // まず既存のタイマーを完全にクリア（念のため）
  clearInterval(sessionTimer.value)
  clearInterval(questionTimerInterval.value)
  clearTimeout(questionTimer.value)
  questionRemainingTime.value = 0
  remainingTime.value = 0
  
  const settings = getGameModeSettings(selectedGameMode.value)
  gameSession.value = new GameSession(currentMode.value, selectedGameMode.value, settings)
  
  // 問題を生成
  const questions = []
  const count = settings.totalQuestions || 100 // 無制限の場合は多めに生成
  for (let i = 0; i < count; i++) {
    questions.push(generateQuestion())
  }
  
  gameSession.value.start(questions)
  screen.value = 'playing'
  
  // 最初の問題を表示
  loadNextQuestion()
  
  // タイムアタックの場合、セッション全体のタイマーを開始
  if (settings.totalTime) {
    remainingTime.value = settings.totalTime
    sessionTimer.value = setInterval(() => {
      remainingTime.value--
      if (remainingTime.value <= 0) {
        endGame()
      }
    }, 1000)
  }
  
  // 時間制限がある場合、1問目のタイマー開始
  if (settings.timePerQuestion > 0) {
    startQuestionTimer()
  }
}

// 次の問題を読み込み
function loadNextQuestion() {
  if (!gameSession.value || gameSession.value.currentIndex >= gameSession.value.questions.length) {
    return
  }
  
  question.value = gameSession.value.questions[gameSession.value.currentIndex]
  phase.value = 'question'
  isCorrect.value = null
  selectedPos.value = null
}

// 1問ごとのタイマー開始
function startQuestionTimer() {
  // 既存のタイマーをクリア
  if (questionTimer.value) {
    clearTimeout(questionTimer.value)
  }
  if (questionTimerInterval.value) {
    clearInterval(questionTimerInterval.value)
  }
  
  const settings = gameSession.value.settings
  if (settings.timePerQuestion > 0) {
    // 残り時間の初期化
    questionRemainingTime.value = settings.timePerQuestion
    
    // カウントダウン表示用のインターバル（100ms毎）
    questionTimerInterval.value = setInterval(() => {
      questionRemainingTime.value = Math.max(0, questionRemainingTime.value - 0.1)
    }, 100)
    
    // タイムアウト処理
    questionTimer.value = setTimeout(() => {
      handleTimeoutOrWrongAnswer()
    }, settings.timePerQuestion * 1000)
  } else {
    questionRemainingTime.value = 0
  }
}

// タイムアウト時の処理
function handleTimeoutOrWrongAnswer() {
  clearTimeout(questionTimer.value)
  clearInterval(questionTimerInterval.value)
  
  // タイムアウトを不正解として記録
  gameSession.value.recordAnswer(false, null)
  isCorrect.value = false
  phase.value = 'answered'
  
  // エンドレスチャレンジの場合のみ、不正解でゲーム終了
  if (gameSession.value.settings.failOnMistake) {
    setTimeout(() => endGame(), 1500)
  }
  
  // 通常モード：「次へ」ボタンを押して次に進む（自動では進まない）
}

// 回答処理
function handleAnswer(noteName) {
  if (phase.value !== 'question') return
  clearTimeout(questionTimer.value)
  clearInterval(questionTimerInterval.value)
  
  const correct = (noteName === question.value.note)
  isCorrect.value = correct
  phase.value = 'answered'
  
  // セッションに記録
  gameSession.value.recordAnswer(correct, noteName)
  
  // エンドレスで不正解 → ゲーム終了
  if (gameSession.value.settings.failOnMistake && !correct) {
    setTimeout(() => endGame(), 1500)
  }
}

// Mode2: ポジションクリック
function handlePositionClick({ string, fret }) {
  if (!fretboardClickable.value) return
  clearTimeout(questionTimer.value)
  clearInterval(questionTimerInterval.value)
  
  selectedPos.value = { string, fret }
  const correct = 
    string === question.value.string &&
    getNoteAtFret(string, fret) === question.value.note
  
  isCorrect.value = correct
  phase.value = 'answered'
  
  gameSession.value.recordAnswer(correct, { string, fret })
  
  if (gameSession.value.settings.failOnMistake && !correct) {
    setTimeout(() => endGame(), 1500)
  }
}

// 次の問題へ
function handleNext() {
  // セッション全体の終了チェック
  if (gameSession.value.settings.totalQuestions && 
      gameSession.value.currentIndex >= gameSession.value.settings.totalQuestions - 1) {
    endGame()
    return
  }
  
  gameSession.value.nextQuestion()
  loadNextQuestion()
  
  // 時間制限があれば次の問題のタイマー開始
  if (gameSession.value.settings.timePerQuestion > 0) {
    startQuestionTimer()
  }
}

// ゲーム終了
function endGame() {
  clearInterval(sessionTimer.value)
  clearInterval(questionTimerInterval.value)
  clearTimeout(questionTimer.value)
  
  results.value = gameSession.value.end()
  
  // スコアを保存
  recordScore(currentMode.value, selectedGameMode.value, results.value)
  
  screen.value = 'results'
}

// リトライ
function handleRetry() {
  startGame()
}

// メニューに戻る
function handleBackToMenu() {
  screen.value = 'modeSelect'
  gameSession.value = null
  results.value = null
  clearInterval(sessionTimer.value)
  clearInterval(questionTimerInterval.value)
  clearTimeout(questionTimer.value)
}

// モード切り替え（メイン画面のタブ）
function switchMode(mode) {
  // タイマーを完全にクリア
  clearInterval(sessionTimer.value)
  clearInterval(questionTimerInterval.value)
  clearTimeout(questionTimer.value)
  questionRemainingTime.value = 0
  remainingTime.value = 0
  
  currentMode.value = mode
  screen.value = (mode === 'mode3') ? 'mode3' : 'modeSelect'
  gameSession.value = null
  results.value = null
  question.value = null
  mode3Question.value = null
}

// Mode3: 問題変更時
function handleMode3QuestionChange(data) {
  mode3Question.value = data
}
</script>

<template>
  <div class="app">

    <!-- ヘッダー -->
    <header class="app-header">
      <h1 class="title">🎸 FretboardMaster</h1>
      <p class="subtitle">ギター指板の音名をマスターしよう</p>
    </header>

    <!-- モード切り替えタブ（メイン） -->
    <nav class="mode-nav">
      <button
        class="mode-tab"
        :class="{ active: currentMode === 'mode1' }"
        @click="switchMode('mode1')"
      >
        モード1<span class="tab-sub">音名</span>
      </button>
      <button
        class="mode-tab"
        :class="{ active: currentMode === 'mode2' }"
        @click="switchMode('mode2')"
      >
        モード2<span class="tab-sub">ポジション</span>
      </button>
      <button
        class="mode-tab"
        :class="{ active: currentMode === 'mode3' }"
        @click="switchMode('mode3')"
      >
        モード3<span class="tab-sub">練習</span>
      </button>
    </nav>

    <!-- Mode3: 練習アシストモード -->
    <template v-if="currentMode === 'mode3'">
      <section class="fretboard-section">
        <Fretboard
          :highlights="highlights"
          :active-string="activeString"
        />
      </section>
      <Mode3Panel @question-change="handleMode3QuestionChange" />
    </template>

    <!-- Mode1 & Mode2: ゲームモード選択 or プレイ画面 -->
    <template v-else>
      <!-- ゲームモード選択画面 -->
      <GameModeSelector
        v-if="screen === 'modeSelect'"
        :mode="currentMode"
        @select="handleGameModeSelect"
      />

      <!-- プレイ画面 -->
      <template v-else-if="screen === 'playing'">
        <!-- 進捗表示 -->
        <div v-if="gameSession" class="progress-bar">
          <div class="progress-info">
            <span v-if="gameSession.settings.totalQuestions">
              {{ gameSession.currentIndex + 1 }} / {{ gameSession.settings.totalQuestions }}問
            </span>
            <span v-else-if="gameSession.settings.totalTime">
              残り {{ remainingTime }}秒
            </span>
            <span v-else>
              {{ gameSession.currentIndex + 1 }}問目
            </span>
            
            <!-- 1問ごとの残り時間 -->
            <span v-if="questionRemainingTime > 0" class="progress-timer" :class="{ 'timer-warning': questionRemainingTime < 2 }">
              ⏱️ {{ questionRemainingTime.toFixed(1) }}秒
            </span>
            
            <span class="progress-streak">
              🔥 {{ gameSession.currentStreak }}連続
            </span>
          </div>
        </div>

        <!-- 指板 -->
        <section class="fretboard-section">
          <Fretboard
            :highlights="highlights"
            :clickable="fretboardClickable"
            :active-string="activeString"
            @position-click="handlePositionClick"
          />
        </section>

        <!-- クイズパネル -->
        <QuizPanel
          :mode="currentMode"
          :question="question"
          :phase="phase"
          :is-correct="isCorrect"
          @answer="handleAnswer"
          @next="handleNext"
        />
      </template>

      <!-- 結果画面 -->
      <GameResults
        v-else-if="screen === 'results'"
        :results="results"
        @retry="handleRetry"
        @menu="handleBackToMenu"
      />
    </template>

  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 16px 48px;
  gap: 28px;
  box-sizing: border-box;
}

/* ヘッダー */
.app-header { text-align: center; }
.title {
  margin: 0;
  font-size: 34px;
  font-weight: 900;
  color: #fbbf24;
  letter-spacing: -0.5px;
}
.subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  color: #7a6a50;
}

/* モードタブ */
.mode-nav {
  display: flex;
  gap: 4px;
  background: #1a1520;
  padding: 4px;
  border-radius: 12px;
}
.mode-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 22px 8px;
  border: none;
  border-radius: 9px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s;
  background: transparent;
  color: #7a6a50;
  line-height: 1.4;
}
.tab-sub {
  font-size: 11px;
  font-weight: 400;
  opacity: 0.8;
}
.mode-tab.active {
  background: #fbbf24;
  color: #1a1000;
}
.mode-tab:hover:not(.active) {
  background: #241e2e;
  color: #c0a880;
}

/* 進捗バー */
.progress-bar {
  width: 100%;
  max-width: 800px;
  padding: 16px 24px;
  background: rgba(26, 21, 32, 0.6);
  border: 2px solid #3a2f48;
  border-radius: 12px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #e0d4c0;
  flex-wrap: wrap;
}

.progress-timer {
  color: #10b981;
  font-variant-numeric: tabular-nums;
}

.progress-timer.timer-warning {
  color: #ef4444;
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.progress-streak {
  color: #fbbf24;
}

/* 指板セクション */
.fretboard-section {
  width: 100%;
  max-width: 960px;
  display: flex;
  justify-content: center;
}
</style>
