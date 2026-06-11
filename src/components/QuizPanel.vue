<script setup>
import { NOTES } from '../utils/music.js'

const props = defineProps({
  mode: { type: String, required: true },       // 'mode1' | 'mode2'
  question: { type: Object, default: null },     // { string, fret, note, stringLabel }
  phase: { type: String, default: 'question' }, // 'question' | 'answered'
  isCorrect: { type: Boolean, default: null },
})

const emit = defineEmits(['answer', 'next'])

function selectNote(note) {
  if (props.phase === 'question') {
    emit('answer', note)
  }
}
</script>

<template>
  <div class="quiz-panel">

    <!-- 問題文 -->
    <div v-if="question" class="question-box">
      <p class="question-label">問題</p>
      <p v-if="mode === 'mode1'" class="question-text">
        <span class="q-accent">{{ question.stringLabel }}</span> の
        <span class="q-accent">{{ question.fret }}フレット</span> の音は？
      </p>
      <p v-else class="question-text">
        <span class="q-accent">{{ question.stringLabel }}</span> の
        <span class="q-accent">{{ question.note }}</span> はどのフレット？
      </p>
    </div>

    <!-- Mode1: 音名ボタン（フィードバックオーバーレイのコンテナ） -->
    <div v-if="mode === 'mode1'" class="note-grid-container">
      
      <!-- 正解・不正解フィードバック（オーバーレイ） -->
      <Transition name="fade-scale">
        <div
          v-if="phase === 'answered'"
          class="feedback-overlay"
          :class="isCorrect ? 'fb-correct' : 'fb-incorrect'"
        >
          <span class="fb-icon">{{ isCorrect ? '✓' : '✗' }}</span>
          <span class="fb-msg">{{ isCorrect ? '正解！' : '不正解…' }}</span>
          <span v-if="isCorrect === false" class="fb-ans">正解: {{ question?.note }}</span>
        </div>
      </Transition>

      <!-- 音名ボタングリッド -->
      <div class="note-grid">
        <button
          v-for="note in NOTES"
          :key="note"
          class="note-btn"
          :class="{
            'btn-answered': phase === 'answered',
            'btn-is-correct': phase === 'answered' && note === question?.note,
          }"
          :disabled="phase === 'answered'"
          @click="selectNote(note)"
        >{{ note }}</button>
      </div>
    </div>

    <!-- Mode2: 指板クリックの案内 -->
    <div v-else-if="phase === 'question'" class="mode2-hint">
      👆 指板上の正しいフレットをクリックしてください
    </div>

    <!-- 次の問題ボタン -->
    <button v-if="phase === 'answered'" class="next-btn" @click="$emit('next')">
      次の問題 →
    </button>

  </div>
</template>

<style scoped>
.quiz-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 800px; /* 指板と同じ幅に統一 */
  padding: 8px 0;
}

/* 問題文 */
.question-box {
  text-align: center;
}
.question-label {
  margin: 0 0 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #6a5a40;
}
.question-text {
  margin: 0;
  font-size: 20px;
  color: #e0d4c0;
  line-height: 1.6;
}
.q-accent {
  font-size: 28px;
  font-weight: 900;
  color: #fbbf24;
}

/* フィードバックオーバーレイのコンテナ */
.note-grid-container {
  position: relative;
  width: 100%;
  /* max-widthを削除して親要素（quiz-panel: 800px）に従う */
}

/* フィードバックオーバーレイ */
.feedback-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 32px;
  border-radius: 16px;
  font-size: 22px;
  font-weight: 800;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  pointer-events: none;
  white-space: nowrap;
  min-width: max-content;
}
.fb-correct   { background: rgba(22,163,74,0.95);  color: #fff; border: 2px solid #4ade80; }
.fb-incorrect { background: rgba(220,38,38,0.95);  color: #fff; border: 2px solid #f87171; }
.fb-icon { font-size: 32px; line-height: 1; }
.fb-msg  { font-size: 24px; line-height: 1; }
.fb-ans  { font-size: 18px; color: #dbeafe; margin-left: 4px; font-weight: 700; }

/* 音名ボタングリッド */
.note-grid {
  display: flex;
  flex-wrap: nowrap; /* 折り返さない */
  gap: 6px;
  justify-content: center;
  width: 100%; /* 親要素の幅に合わせる */
}
.note-btn {
  flex: 1; /* 均等に幅を分配 */
  min-width: 50px; /* 最小幅を確保 */
  padding: 12px 4px;
  font-size: 15px;
  font-weight: 700;
  border: 2px solid #4a3828;
  border-radius: 8px;
  background: #1e1408;
  color: #d0c0a0;
  cursor: pointer;
  transition: all 0.12s;
}
.note-btn:hover:not(:disabled) {
  border-color: #fbbf24;
  background: #2e2010;
  color: #fbbf24;
  transform: translateY(-2px);
}
.note-btn.btn-answered:not(.btn-is-correct) {
  opacity: 0.3;
}
.note-btn.btn-is-correct {
  border-color: #16a34a;
  background: #052e16;
  color: #4ade80;
  opacity: 1;
}

/* Mode2 案内テキスト */
.mode2-hint {
  color: #9a8a6a;
  font-size: 15px;
}

/* 次の問題ボタン */
.next-btn {
  padding: 14px 44px;
  font-size: 17px;
  font-weight: 700;
  background: #1e3a8a;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
}
.next-btn:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
}

/* フィードバックのアニメーション */
.fade-scale-enter-active {
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-scale-leave-active {
  transition: all 0.15s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  transform: translate(-50%, -50%) scale(0.7);
  opacity: 0;
}
</style>
