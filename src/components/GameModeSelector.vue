<script setup>
import { ref, computed } from 'vue'
import { getAllGameModes } from '../utils/gameModes.js'
import { getScoreData } from '../utils/storage.js'

const props = defineProps({
  mode: { type: String, required: true }, // 'mode1' | 'mode2'
})

const emit = defineEmits(['select'])

const gameModes = getAllGameModes()

// 各ゲームモードのベストスコアを取得
function getBestScore(gameModeId) {
  const data = getScoreData(props.mode, gameModeId)
  if (!data) return null
  
  switch (gameModeId) {
    case 'freePlay':
      return data.bestStreak > 0 ? `連続 ${data.bestStreak}問` : null
    case 'quickFire':
      return data.bestScore > 0 ? `${data.bestScore} / 10問` : null
    case 'timeAttack':
      return data.bestScore > 0 ? `${data.bestScore}問` : null
    case 'endless':
      return data.bestStreak > 0 ? `連続 ${data.bestStreak}問` : null
    case 'learning':
      return data.bestAccuracy > 0 ? `正解率 ${Math.round(data.bestAccuracy * 100)}%` : null
    default:
      return null
  }
}

function selectMode(gameModeId) {
  emit('select', gameModeId)
}
</script>

<template>
  <div class="mode-selector">
    <h2 class="selector-title">
      {{ mode === 'mode1' ? 'モード1: 音名を当てる' : 'モード2: ポジションを当てる' }}
    </h2>
    <p class="selector-subtitle">ゲームモードを選択してください</p>
    
    <div class="mode-grid">
      <button
        v-for="gm in gameModes"
        :key="gm.id"
        class="mode-card"
        @click="selectMode(gm.id)"
      >
        <div class="mode-icon">{{ gm.icon }}</div>
        <h3 class="mode-name">{{ gm.name }}</h3>
        <p class="mode-desc">{{ gm.description }}</p>
        <div v-if="getBestScore(gm.id)" class="mode-best">
          🏆 {{ getBestScore(gm.id) }}
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.mode-selector {
  width: 100%;
  max-width: 800px;
  padding: 20px;
}

.selector-title {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: #fbbf24;
  text-align: center;
}

.selector-subtitle {
  margin: 0 0 32px;
  font-size: 14px;
  color: #9a8a6a;
  text-align: center;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.mode-card {
  background: rgba(26, 21, 32, 0.6);
  border: 2px solid #3a2f48;
  border-radius: 12px;
  padding: 24px 20px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.mode-card:hover {
  background: rgba(36, 30, 42, 0.8);
  border-color: #fbbf24;
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(251, 191, 36, 0.2);
}

.mode-icon {
  font-size: 48px;
  margin-bottom: 12px;
  line-height: 1;
}

.mode-name {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: #e0d4c0;
}

.mode-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: #9a8a6a;
  line-height: 1.5;
}

.mode-best {
  padding: 6px 12px;
  background: rgba(251, 191, 36, 0.1);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #fbbf24;
  display: inline-block;
}
</style>
