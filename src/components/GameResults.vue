<script setup>
import { computed } from 'vue'
import { getScoreData } from '../utils/storage.js'
import { GAME_MODES } from '../utils/gameModes.js'

const props = defineProps({
  results: { type: Object, required: true },
})

const emit = defineEmits(['retry', 'menu'])

const gameModeInfo = computed(() => GAME_MODES[props.results.gameMode])

const isNewRecord = computed(() => {
  const data = getScoreData(props.results.mode, props.results.gameMode)
  if (!data) return false
  
  switch (props.results.gameMode) {
    case 'freePlay':
      return props.results.maxStreak > data.bestStreak
    case 'quickFire':
      return props.results.correctCount > data.bestScore
    case 'timeAttack':
      return props.results.correctCount > data.bestScore
    case 'endless':
      return props.results.maxStreak > data.bestStreak
    case 'learning':
      return props.results.accuracy > data.bestAccuracy
    default:
      return false
  }
})

function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}秒`
  }
  const min = Math.floor(seconds / 60)
  const sec = Math.round(seconds % 60)
  return `${min}分${sec}秒`
}
</script>

<template>
  <div class="results-screen">
    <div class="results-container">
      <!-- タイトル -->
      <div class="results-header">
        <div class="results-icon">{{ gameModeInfo.icon }}</div>
        <h2 class="results-title">{{ gameModeInfo.name }}</h2>
        <div v-if="isNewRecord" class="new-record">🎉 NEW RECORD!</div>
      </div>
      
      <!-- スコア -->
      <div class="score-main">
        <div class="score-label">スコア</div>
        <div class="score-value">{{ results.correctCount }} / {{ results.totalCount }}</div>
        <div class="score-accuracy">正解率: {{ Math.round(results.accuracy * 100) }}%</div>
      </div>
      
      <!-- 統計情報 -->
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-label">平均回答時間</div>
          <div class="stat-value">{{ results.avgTime.toFixed(2) }}秒</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-label">総時間</div>
          <div class="stat-value">{{ formatTime(results.totalTime) }}</div>
        </div>
        
        <div class="stat-item">
          <div class="stat-label">最高連続正解</div>
          <div class="stat-value">{{ results.maxStreak }}問</div>
        </div>
      </div>
      
      <!-- 間違えた問題 -->
      <div v-if="results.answers.some(a => !a.isCorrect)" class="mistakes-section">
        <h3 class="mistakes-title">間違えた問題</h3>
        <div class="mistakes-list">
          <div
            v-for="(answer, idx) in results.answers.filter(a => !a.isCorrect)"
            :key="idx"
            class="mistake-item"
          >
            <span class="mistake-question">
              {{ results.mode === 'mode1' 
                  ? `${answer.question.string + 1}弦 ${answer.question.fret}フレット`
                  : `${answer.question.string + 1}弦の「${answer.question.targetNote}」`
              }}
            </span>
            <span class="mistake-arrow">→</span>
            <span class="mistake-answer">
              {{ results.mode === 'mode1'
                  ? answer.question.correctNote
                  : `${answer.question.correctFret}フレット`
              }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- ボタン -->
      <div class="results-actions">
        <button class="btn btn-retry" @click="emit('retry')">
          もう一度
        </button>
        <button class="btn btn-menu" @click="emit('menu')">
          メニューに戻る
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.results-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.results-container {
  background: #1a1520;
  border: 2px solid #3a2f48;
  border-radius: 16px;
  padding: 40px 32px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.results-header {
  text-align: center;
  margin-bottom: 32px;
}

.results-icon {
  font-size: 64px;
  margin-bottom: 12px;
  line-height: 1;
}

.results-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: #fbbf24;
}

.new-record {
  display: inline-block;
  padding: 6px 16px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  color: #1a1520;
  animation: bounce 0.5s ease-in-out;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.score-main {
  text-align: center;
  padding: 24px;
  background: rgba(251, 191, 36, 0.1);
  border-radius: 12px;
  margin-bottom: 24px;
}

.score-label {
  font-size: 14px;
  color: #9a8a6a;
  margin-bottom: 8px;
}

.score-value {
  font-size: 48px;
  font-weight: 700;
  color: #fbbf24;
  line-height: 1;
  margin-bottom: 8px;
}

.score-accuracy {
  font-size: 18px;
  color: #e0d4c0;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  font-size: 12px;
  color: #9a8a6a;
  margin-bottom: 6px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #e0d4c0;
}

.mistakes-section {
  margin-bottom: 32px;
}

.mistakes-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 700;
  color: #e0d4c0;
}

.mistakes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mistake-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  font-size: 13px;
}

.mistake-question {
  color: #e0d4c0;
  font-weight: 600;
}

.mistake-arrow {
  margin: 0 12px;
  color: #9a8a6a;
}

.mistake-answer {
  color: #fbbf24;
  font-weight: 700;
}

.results-actions {
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  padding: 14px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-retry {
  background: #fbbf24;
  color: #1a1520;
}

.btn-retry:hover {
  background: #f59e0b;
  transform: translateY(-2px);
}

.btn-menu {
  background: rgba(224, 212, 192, 0.1);
  color: #e0d4c0;
  border: 1px solid #3a2f48;
}

.btn-menu:hover {
  background: rgba(224, 212, 192, 0.2);
  border-color: #9a8a6a;
}
</style>
