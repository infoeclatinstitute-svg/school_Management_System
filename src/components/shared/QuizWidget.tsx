import { useState } from 'react'
import type { Quiz } from '@/lib/database.types'
import { Button } from '@/components/ui/Button'

interface QuizWidgetProps {
  quizzes: Quiz[]
  onComplete: (allCorrect: boolean, attempts: Array<{ quizId: string; selectedIndex: number; isCorrect: boolean }>) => void
  alreadyPassed?: boolean
}

export function QuizWidget({ quizzes, onComplete, alreadyPassed = false }: QuizWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userSelections, setUserSelections] = useState<Record<number, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const [quizResults, setQuizResults] = useState<{ score: number; total: number; passed: boolean } | null>(null)

  if (!quizzes || quizzes.length === 0) return null

  if (alreadyPassed) {
    return (
      <div className="quiz-card" style={{ borderColor: 'var(--color-success)' }}>
        <div className="quiz-heading" style={{ color: 'var(--color-success)' }}>
          <span>✅</span> Module Quiz Completed ({quizzes.length} Question{quizzes.length > 1 ? 's' : ''})
        </div>
        <div className="quiz-feedback quiz-feedback-correct">
          You have already passed this module's knowledge check and unlocked the next lesson! 🎉
        </div>
      </div>
    )
  }

  const currentQuiz = quizzes[currentIndex]
  const letters = ['A', 'B', 'C', 'D']

  const handleSelectOption = (optIndex: number) => {
    if (submitted) return
    setUserSelections((prev) => ({ ...prev, [currentIndex]: optIndex }))
  }

  const handleNext = () => {
    if (currentIndex < quizzes.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleSubmitAll = () => {
    let correctCount = 0
    const attemptList: Array<{ quizId: string; selectedIndex: number; isCorrect: boolean }> = []

    quizzes.forEach((q, idx) => {
      const selected = userSelections[idx] ?? -1
      const isCorrect = selected === q.correct_option_index
      if (isCorrect) correctCount++
      attemptList.push({
        quizId: q.id,
        selectedIndex: selected,
        isCorrect,
      })
    })

    const allCorrect = correctCount === quizzes.length
    setQuizResults({
      score: correctCount,
      total: quizzes.length,
      passed: allCorrect,
    })
    setSubmitted(true)
    onComplete(allCorrect, attemptList)
  }

  const handleRetry = () => {
    setUserSelections({})
    setCurrentIndex(0)
    setSubmitted(false)
    setQuizResults(null)
  }

  const isAllAnswered = quizzes.every((_, idx) => userSelections[idx] !== undefined)

  return (
    <div className="quiz-card">
      <div className="quiz-heading flex justify-between items-center mb-4">
        <span>❓ Module Knowledge Check</span>
        <span className="badge badge-primary text-xs">
          Question {currentIndex + 1} of {quizzes.length}
        </span>
      </div>

      {/* Progress Stepper for Multiple Questions */}
      {quizzes.length > 1 && (
        <div className="flex gap-2 mb-6">
          {quizzes.map((_, idx) => (
            <div
              key={idx}
              onClick={() => !submitted && setCurrentIndex(idx)}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 4,
                cursor: submitted ? 'default' : 'pointer',
                backgroundColor:
                  userSelections[idx] !== undefined
                    ? 'var(--color-primary)'
                    : 'var(--color-border-light)',
                border: currentIndex === idx ? '2px solid var(--color-accent)' : 'none',
              }}
              title={`Question ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Question Text */}
      <p className="quiz-question">{currentQuiz.question}</p>

      {/* Options */}
      <div className="quiz-options">
        {currentQuiz.options.map((optionText, idx) => {
          const selected = userSelections[currentIndex] === idx
          let optionClass = 'quiz-option'
          if (selected) optionClass += ' selected'
          if (submitted) {
            if (idx === currentQuiz.correct_option_index) optionClass += ' correct'
            else if (selected && idx !== currentQuiz.correct_option_index) optionClass += ' wrong'
          }

          return (
            <button
              key={idx}
              type="button"
              className={optionClass}
              onClick={() => handleSelectOption(idx)}
              disabled={submitted}
            >
              <div className="quiz-option-letter">{letters[idx]}</div>
              <span>{optionText}</span>
            </button>
          )
        })}
      </div>

      {/* Navigation & Submit Controls */}
      {!submitted ? (
        <div className="flex justify-between items-center gap-3 mt-6">
          {quizzes.length > 1 && (
            <Button
              type="button"
              variant="outline"
              disabled={currentIndex === 0}
              onClick={handlePrev}
            >
              ← Previous
            </Button>
          )}

          {currentIndex < quizzes.length - 1 ? (
            <Button
              type="button"
              variant="primary"
              disabled={userSelections[currentIndex] === undefined}
              onClick={handleNext}
            >
              Next Question →
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled={!isAllAnswered}
              onClick={handleSubmitAll}
            >
              Submit All Answers ({quizzes.length} Questions) 🚀
            </Button>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 'var(--space-6)' }}>
          {quizResults?.passed ? (
            <div className="quiz-feedback quiz-feedback-correct">
              🎉 Outstanding! You scored {quizResults.score} / {quizResults.total} (100%). You may now proceed to the next module!
            </div>
          ) : (
            <div>
              <div className="quiz-feedback quiz-feedback-wrong">
                ❌ You scored {quizResults?.score} / {quizResults?.total}. Review the video and questions, then try again to achieve 100%!
              </div>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Button variant="outline" fullWidth onClick={handleRetry}>
                  Try Quiz Again 🔄
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
