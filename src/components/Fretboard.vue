<script setup>
import { OPEN_STRINGS, FRET_MARKERS, MAX_FRET, getNoteAtFret } from '../utils/music.js'

const props = defineProps({
  // ハイライトするポジションのリスト
  // 例: [{ string: 6, fret: 5, type: 'question', showLabel: false }]
  // type は 'question' | 'correct' | 'incorrect' | 'answer'
  // showLabel: 音名を表示するか（省略時はtrue）
  highlights: {
    type: Array,
    default: () => [],
  },
  // Mode2 でクリック可能にするか
  clickable: {
    type: Boolean,
    default: false,
  },
  // Mode2 でどの弦を探しているかを強調表示する
  activeString: {
    type: Number,
    default: null,
  },
})

const emit = defineEmits(['position-click'])

// [0, 1, 2, ..., 12]
const FRETS = Array.from({ length: MAX_FRET + 1 }, (_, i) => i)

// 弦の太さ (px): 6弦が最も太く、1弦が最も細い
const STRING_PX = { 6: 3.5, 5: 2.8, 4: 2.2, 3: 1.8, 2: 1.3, 1: 1 }

function getHighlight(stringNum, fret) {
  return props.highlights.find(h => h.string === stringNum && h.fret === fret)
}

function onCellClick(stringNum, fret) {
  if (props.clickable) {
    emit('position-click', { string: stringNum, fret })
  }
}
</script>

<template>
  <div class="fretboard-scroll">
    <div class="fretboard">

      <!-- フレット番号ヘッダー -->
      <div class="fb-row header-row">
        <div class="fb-label"></div>
        <div
          v-for="f in FRETS"
          :key="`fn${f}`"
          class="fb-cell header-cell"
          :class="{ 'is-open': f === 0 }"
        >{{ f }}</div>
      </div>

      <!-- 弦の行 (1弦〜6弦: ギターを構えたときの見た目に合わせて逆順) -->
      <div
        v-for="str in [...OPEN_STRINGS].reverse()"
        :key="`str${str.string}`"
        class="fb-row string-row"
        :class="{ 'active-string': activeString === str.string }"
      >
        <div class="fb-label" :class="{ 'active-label': activeString === str.string }">
          {{ str.label }}
        </div>

        <div
          v-for="f in FRETS"
          :key="`cell${str.string}-${f}`"
          class="fb-cell fret-cell"
          :class="{
            'is-open': f === 0,
            'is-clickable': clickable,
            [`hl-${getHighlight(str.string, f)?.type}`]: !!getHighlight(str.string, f),
          }"
          @click="onCellClick(str.string, f)"
        >
          <!-- 弦の線 -->
          <div
            class="string-wire"
            :style="{ height: STRING_PX[str.string] + 'px' }"
          ></div>

          <!-- 音名ドット（ハイライトされているときのみ表示） -->
          <Transition name="dot">
            <div
              v-if="getHighlight(str.string, f)"
              class="note-dot"
            >
              <!-- showLabel が false の場合は音名を表示しない（空ドット） -->
              <template v-if="getHighlight(str.string, f).showLabel !== false">
                {{ getNoteAtFret(str.string, f) }}
              </template>
            </div>
          </Transition>
        </div>
      </div>

      <!-- フレットマーカー行（3, 5, 7, 9, 12フレット） -->
      <div class="fb-row marker-row">
        <div class="fb-label"></div>
        <div
          v-for="f in FRETS"
          :key="`mk${f}`"
          class="fb-cell marker-cell"
          :class="{ 'is-open': f === 0 }"
        >
          <template v-if="FRET_MARKERS.includes(f)">
            <span class="mdot">●</span>
            <span v-if="f === 12" class="mdot">●</span>
          </template>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* スクロール対応（横幅が足りない場合に横スクロール） */
.fretboard-scroll {
  overflow-x: auto;
  padding: 4px 0 8px;
  width: 100%;
  display: flex;
  justify-content: center;
}

/* 指板本体 */
.fretboard {
  display: inline-flex;
  flex-direction: column;
  background: #2b1806;
  border: 3px solid #6b4220;
  border-radius: 12px;
  padding: 10px 16px 6px;
  min-width: max-content;
}

/* 行 */
.fb-row {
  display: flex;
  align-items: center;
}

.header-row { margin-bottom: 2px; }
.marker-row { margin-top: 4px; }

/* 弦名ラベル列 */
.fb-label {
  width: 52px;
  min-width: 52px;
  text-align: right;
  padding-right: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #a08060;
  user-select: none;
}

.active-label { color: #fbbf24; }

/* セル（基本スタイル） */
.fb-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 44px;
  width: 56px;
  min-width: 56px;
  border-right: 2px solid #807060; /* フレットワイヤー */
  box-sizing: border-box;
}

/* 開放弦のセル: 幅を狭くしてナットを右ボーダーで表現 */
.fb-cell.is-open {
  width: 36px;
  min-width: 36px;
  border-right: 5px solid #e0ccaa; /* ナット */
}

/* フレット番号ヘッダー */
.header-cell {
  font-size: 12px;
  color: #806040;
  border-right: none;
  height: 22px;
}
.header-cell.is-open { border-right: none; }

/* Mode2: クリック可能なセル */
.fret-cell.is-clickable {
  cursor: pointer;
}
.fret-cell.is-clickable:hover {
  background: rgba(255, 255, 255, 0.07);
}

/* Mode2: 対象弦の強調 */
.string-row.active-string {
  background: rgba(251, 191, 36, 0.05);
  border-radius: 4px;
}

/* 弦の線（細いグラデーション） */
.string-wire {
  position: absolute;
  left: 0;
  right: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 220, 0.35) 0%,
    #b09060 30%,
    #c8a870 50%,
    #b09060 70%,
    rgba(255, 255, 220, 0.35) 100%
  );
  pointer-events: none;
  border-radius: 1px;
}

/* 音名ドット */
.note-dot {
  position: absolute;
  z-index: 3;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  pointer-events: none;
  user-select: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

/* ハイライトの種類ごとの色 */
.hl-question  .note-dot { background: #d97706; box-shadow: 0 0 10px #fbbf24; }
.hl-correct   .note-dot { background: #16a34a; box-shadow: 0 0 10px #4ade80; }
.hl-incorrect .note-dot { background: #dc2626; box-shadow: 0 0 10px #f87171; }
.hl-answer    .note-dot { background: #1d4ed8; box-shadow: 0 0 10px #60a5fa; }

/* フレットマーカーのドット */
.marker-cell {
  height: 20px;
  border-right: none;
  gap: 3px;
}
.mdot {
  color: #d4c0a0;
  font-size: 11px;
  line-height: 1;
}

/* ドットのアニメーション */
.dot-enter-active {
  transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
              opacity 0.15s ease;
}
.dot-leave-active {
  transition: transform 0.1s ease, opacity 0.1s ease;
}
.dot-enter-from,
.dot-leave-to {
  transform: scale(0);
  opacity: 0;
}
</style>
