// ゲームモードの定義
export const GAME_MODES = {
  freePlay: {
    id: 'freePlay',
    name: 'フリープラクティス',
    icon: '🎯',
    description: '時間制限なし、自分のペースで練習',
    settings: {
      totalQuestions: null,  // 無制限
      timePerQuestion: 0,    // 制限なし
    },
  },
  quickFire: {
    id: 'quickFire',
    name: 'クイックファイア',
    icon: '⚡',
    description: '10問を5秒以内に素早く回答',
    settings: {
      totalQuestions: 10,
      timePerQuestion: 5,
    },
  },
  timeAttack: {
    id: 'timeAttack',
    name: 'タイムアタック',
    icon: '⏱️',
    description: '60秒でできるだけ多く正解',
    settings: {
      totalQuestions: null,  // 無制限
      timePerQuestion: 0,    // なし
      totalTime: 60,         // セッション全体の制限時間
    },
  },
  endless: {
    id: 'endless',
    name: 'エンドレスチャレンジ',
    icon: '♾️',
    description: '各5秒、ミスで終了。連続正解数を競う',
    settings: {
      totalQuestions: null,  // 無制限
      timePerQuestion: 5,
      failOnMistake: true,   // 不正解で終了
    },
  },
  learning: {
    id: 'learning',
    name: 'ラーニングモード',
    icon: '📚',
    description: '20問をじっくり学習',
    settings: {
      totalQuestions: 20,
      timePerQuestion: 0,    // 制限なし
    },
  },
}

/**
 * ゲームモードの設定を取得
 */
export function getGameModeSettings(gameModeId) {
  return GAME_MODES[gameModeId]?.settings || {}
}

/**
 * ゲームモードの情報を取得
 */
export function getGameModeInfo(gameModeId) {
  return GAME_MODES[gameModeId] || null
}

/**
 * すべてのゲームモードを取得
 */
export function getAllGameModes() {
  return Object.values(GAME_MODES)
}
