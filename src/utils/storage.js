// LocalStorage キー
const STORAGE_KEY = 'fretboard-master-data'

// デフォルトデータ構造
const DEFAULT_DATA = {
  mode1: {
    freePlay: { bestStreak: 0, totalCorrect: 0, totalAnswered: 0 },
    quickFire: { bestScore: 0, bestTime: null, playCount: 0, history: [] },
    timeAttack: { bestScore: 0, bestAccuracy: 0, playCount: 0, history: [] },
    endless: { bestStreak: 0, playCount: 0, history: [] },
    learning: { bestAccuracy: 0, bestTime: null, playCount: 0, history: [] },
  },
  mode2: {
    freePlay: { bestStreak: 0, totalCorrect: 0, totalAnswered: 0 },
    quickFire: { bestScore: 0, bestTime: null, playCount: 0, history: [] },
    timeAttack: { bestScore: 0, bestAccuracy: 0, playCount: 0, history: [] },
    endless: { bestStreak: 0, playCount: 0, history: [] },
    learning: { bestAccuracy: 0, bestTime: null, playCount: 0, history: [] },
  },
  mode3: {
    sessions: [],
    stats: {
      totalTime: 0,
      sessionCount: 0,
      last7Days: [0, 0, 0, 0, 0, 0, 0],
    },
  },
}

/**
 * データを読み込む
 */
export function loadData() {
  try {
    const str = localStorage.getItem(STORAGE_KEY)
    if (!str) return JSON.parse(JSON.stringify(DEFAULT_DATA))
    return { ...JSON.parse(JSON.stringify(DEFAULT_DATA)), ...JSON.parse(str) }
  } catch (e) {
    console.error('Failed to load data:', e)
    return JSON.parse(JSON.stringify(DEFAULT_DATA))
  }
}

/**
 * データを保存する
 */
export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (e) {
    console.error('Failed to save data:', e)
    return false
  }
}

/**
 * スコアを記録する
 */
export function recordScore(mode, gameMode, result) {
  const data = loadData()
  const modeData = data[mode][gameMode]
  
  // 履歴に追加（最新10件まで保持）
  if (modeData.history) {
    modeData.history.unshift({
      date: new Date().toISOString(),
      ...result,
    })
    if (modeData.history.length > 10) {
      modeData.history = modeData.history.slice(0, 10)
    }
  }
  
  // プレイ回数
  if (modeData.playCount !== undefined) {
    modeData.playCount++
  }
  
  // ゲームモード別のベストスコア更新
  switch (gameMode) {
    case 'freePlay':
      if (result.streak > modeData.bestStreak) {
        modeData.bestStreak = result.streak
      }
      modeData.totalCorrect += result.correctCount
      modeData.totalAnswered += result.totalCount
      break
      
    case 'quickFire':
      if (result.correctCount > modeData.bestScore) {
        modeData.bestScore = result.correctCount
      }
      if (!modeData.bestTime || result.avgTime < modeData.bestTime) {
        modeData.bestTime = result.avgTime
      }
      break
      
    case 'timeAttack':
      if (result.correctCount > modeData.bestScore) {
        modeData.bestScore = result.correctCount
      }
      if (result.accuracy > modeData.bestAccuracy) {
        modeData.bestAccuracy = result.accuracy
      }
      break
      
    case 'endless':
      if (result.streak > modeData.bestStreak) {
        modeData.bestStreak = result.streak
      }
      break
      
    case 'learning':
      if (result.accuracy > modeData.bestAccuracy) {
        modeData.bestAccuracy = result.accuracy
      }
      if (!modeData.bestTime || result.avgTime < modeData.bestTime) {
        modeData.bestTime = result.avgTime
      }
      break
  }
  
  saveData(data)
  return data
}

/**
 * モード3のセッションを記録
 */
export function recordMode3Session(duration, settings) {
  const data = loadData()
  
  // セッション追加
  data.mode3.sessions.unshift({
    date: new Date().toISOString(),
    duration,
    settings,
  })
  
  // 最新50件まで保持
  if (data.mode3.sessions.length > 50) {
    data.mode3.sessions = data.mode3.sessions.slice(0, 50)
  }
  
  // 統計更新
  data.mode3.stats.totalTime += duration
  data.mode3.stats.sessionCount++
  
  // 直近7日間の記録を更新
  updateLast7Days(data.mode3)
  
  saveData(data)
  return data
}

/**
 * 直近7日間の練習時間を計算
 */
function updateLast7Days(mode3Data) {
  const now = new Date()
  const days = [0, 0, 0, 0, 0, 0, 0]
  
  for (const session of mode3Data.sessions) {
    const sessionDate = new Date(session.date)
    const diffDays = Math.floor((now - sessionDate) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 7) {
      days[diffDays] += Math.round(session.duration / 60) // 分に変換
    }
  }
  
  mode3Data.stats.last7Days = days.reverse() // [6日前, 5日前, ..., 今日]
}

/**
 * スコアデータを取得
 */
export function getScoreData(mode, gameMode) {
  const data = loadData()
  return data[mode]?.[gameMode] || null
}

/**
 * モード3の統計を取得
 */
export function getMode3Stats() {
  const data = loadData()
  return data.mode3.stats
}

/**
 * すべてのデータをリセット（開発用）
 */
export function resetAllData() {
  localStorage.removeItem(STORAGE_KEY)
  return loadData()
}
