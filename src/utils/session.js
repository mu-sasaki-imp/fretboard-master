/**
 * ゲームセッションを管理するクラス
 */
export class GameSession {
  constructor(mode, gameMode, settings) {
    this.mode = mode              // 'mode1' | 'mode2'
    this.gameMode = gameMode      // 'freePlay' | 'quickFire' | 'timeAttack' | 'endless' | 'learning'
    this.settings = settings      // { totalQuestions, timePerQuestion, ... }
    
    this.questions = []           // 問題リスト
    this.currentIndex = 0         // 現在の問題番号
    this.answers = []             // 回答履歴
    this.startTime = null
    this.endTime = null
    this.isActive = false
    
    // ゲームモード別の追加状態
    this.currentStreak = 0        // 連続正解数
    this.lives = 3                // ライフ（サバイバル用、将来拡張）
    this.questionStartTime = null // 現在の問題の開始時刻
  }
  
  /**
   * セッション開始
   */
  start(questions) {
    this.questions = questions
    this.currentIndex = 0
    this.answers = []
    this.startTime = Date.now()
    this.isActive = true
    this.currentStreak = 0
    this.questionStartTime = Date.now()
  }
  
  /**
   * 回答を記録
   */
  recordAnswer(isCorrect, userAnswer = null) {
    const responseTime = (Date.now() - this.questionStartTime) / 1000 // 秒
    
    this.answers.push({
      questionIndex: this.currentIndex,
      question: this.questions[this.currentIndex],
      isCorrect,
      userAnswer,
      responseTime,
      timestamp: Date.now(),
    })
    
    // 連続正解数の更新
    if (isCorrect) {
      this.currentStreak++
    } else {
      this.currentStreak = 0
    }
    
    return { isCorrect, responseTime, streak: this.currentStreak }
  }
  
  /**
   * 次の問題へ
   */
  nextQuestion() {
    this.currentIndex++
    this.questionStartTime = Date.now()
  }
  
  /**
   * セッション終了
   */
  end() {
    this.endTime = Date.now()
    this.isActive = false
    return this.getResults()
  }
  
  /**
   * 結果を計算
   */
  getResults() {
    const correctAnswers = this.answers.filter(a => a.isCorrect)
    const correctCount = correctAnswers.length
    const totalCount = this.answers.length
    const accuracy = totalCount > 0 ? correctCount / totalCount : 0
    
    // 平均回答時間（正解のみ）
    const avgTime = correctAnswers.length > 0
      ? correctAnswers.reduce((sum, a) => sum + a.responseTime, 0) / correctAnswers.length
      : 0
    
    // 総経過時間
    const totalTime = this.endTime ? (this.endTime - this.startTime) / 1000 : 0
    
    // 最高連続正解数
    let maxStreak = 0
    let currentStreak = 0
    for (const answer of this.answers) {
      if (answer.isCorrect) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }
    
    return {
      mode: this.mode,
      gameMode: this.gameMode,
      correctCount,
      totalCount,
      accuracy,
      avgTime,
      totalTime,
      maxStreak,
      answers: this.answers,
      settings: this.settings,
    }
  }
  
  /**
   * 現在の進捗状況
   */
  getProgress() {
    return {
      currentIndex: this.currentIndex,
      totalQuestions: this.questions.length,
      correctCount: this.answers.filter(a => a.isCorrect).length,
      currentStreak: this.currentStreak,
      elapsedTime: (Date.now() - this.startTime) / 1000,
    }
  }
  
  /**
   * タイムアウトチェック
   */
  isTimeout() {
    if (!this.settings.timePerQuestion || this.settings.timePerQuestion === 0) {
      return false
    }
    const elapsed = (Date.now() - this.questionStartTime) / 1000
    return elapsed > this.settings.timePerQuestion
  }
  
  /**
   * 残り時間を取得（秒）
   */
  getRemainingTime() {
    if (!this.settings.timePerQuestion || this.settings.timePerQuestion === 0) {
      return null
    }
    const elapsed = (Date.now() - this.questionStartTime) / 1000
    return Math.max(0, this.settings.timePerQuestion - elapsed)
  }
  
  /**
   * セッション全体の残り時間（タイムアタック用）
   */
  getSessionRemainingTime() {
    if (!this.settings.totalTime) return null
    const elapsed = (Date.now() - this.startTime) / 1000
    return Math.max(0, this.settings.totalTime - elapsed)
  }
}
