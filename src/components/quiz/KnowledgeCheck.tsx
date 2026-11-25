import { useState } from 'react'
import type { QuizItem } from '@/types/curriculum'
import { useProgress } from '@/store/progress'
import './KnowledgeCheck.css'

export function KnowledgeCheck({
  lessonId,
  items,
}: {
  lessonId: string
  items: QuizItem[]
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [submitted, setSubmitted] = useState(false)
  const setQuizScore = useProgress((s) => s.setQuizScore)
  const markComplete = useProgress((s) => s.markComplete)

  function submit() {
    const correct = items.filter((q) => answers[q.id] === q.answerIndex).length
    const score = Math.round((correct / items.length) * 100)
    setQuizScore(lessonId, score)
    if (score >= 50) markComplete(lessonId)
    setSubmitted(true)
  }

  return (
    <div className="quiz">
      <p className="quiz-kicker">Knowledge check</p>
      <h3>Test what you learned</h3>
      {items.map((q) => (
        <fieldset key={q.id} className="quiz-item">
          <legend>{q.question}</legend>
          {q.options.map((opt, i) => (
            <label key={opt} className="opt">
              <input
                type="radio"
                name={q.id}
                disabled={submitted}
                checked={answers[q.id] === i}
                onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
              />
              <span>{opt}</span>
            </label>
          ))}
          {submitted ? (
            <p className={answers[q.id] === q.answerIndex ? 'explain ok' : 'explain bad'}>
              {q.explanation}
            </p>
          ) : null}
        </fieldset>
      ))}
      {!submitted ? (
        <button
          type="button"
          className="quiz-submit"
          disabled={Object.keys(answers).length < items.length}
          onClick={submit}
        >
          Check answers
        </button>
      ) : (
        <p className="quiz-done">
          Score saved. Keep going — mark lessons complete as you finish quizzes.
        </p>
      )}
    </div>
  )
}
