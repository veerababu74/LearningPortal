import { useCallback, useMemo, useState } from 'react'
import type { FlowSpec, TeachingPoint } from '@/types/curriculum'
import { FlowPlayer } from '@/components/visuals/FlowPlayer'
import { MarkdownBody } from '@/components/lesson/MarkdownBody'
import './PointCard.css'

function displayTitle(title: string) {
  const t = title.replace(/\s+/g, ' ').trim()
  if (t.length <= 90) return t
  return `${t.slice(0, 90).replace(/\s+\S*$/, '').trim()}…`
}

export function PointCard({
  point,
  index,
}: {
  point: TeachingPoint
  index: number
}) {
  const steps = point.diagram?.steps || []
  const [activeStep, setActiveStep] = useState(steps[0] || null)

  const onStepChange = useCallback((_i: number, step: FlowSpec['steps'][number]) => {
    setActiveStep(step)
  }, [])

  const stepText = useMemo(() => {
    if (!activeStep?.narration) return point.textExplanation
    return activeStep.narration
  }, [activeStep, point.textExplanation])

  const supportingText = useMemo(() => {
    // Show deeper lesson prose once, not duplicated with the active step text
    const base = point.textExplanation?.trim() || ''
    const step = stepText?.trim() || ''
    if (!base) return ''
    if (!step) return base
    if (base === step) return ''
    if (base.includes(step) || step.includes(base.slice(0, 80))) return ''
    return base
  }, [point.textExplanation, stepText])

  return (
    <article className="point-card" id={point.id}>
      <header className="point-head">
        <span className="point-num">Point {index + 1}</span>
        <h3 title={point.title}>{displayTitle(point.title)}</h3>
      </header>

      <div className="point-grid">
        <div className="point-visual">
          <p className="panel-label">Visual explanation</p>
          <FlowPlayer diagram={point.diagram} compact onStepChange={onStepChange} />
          <p className="visual-text">
            {activeStep
              ? `Follow step “${activeStep.label}” in the diagram, then read the explanation on the right.`
              : point.visualExplanation}
          </p>
        </div>

        <div className="point-text">
          <p className="panel-label">Textual explanation</p>
          <p className="step-badge">
            {activeStep ? `Step: ${activeStep.label}` : 'Overview'}
          </p>
          <p className="text-lead" key={activeStep?.id || 'overview'}>
            {stepText}
          </p>
          {supportingText ? (
            <div className="support-block">
              <p className="panel-label">Why this matters</p>
              <p className="text-lead">{supportingText}</p>
            </div>
          ) : null}
          {point.body && point.body.trim().length > 120 ? (
            <details className="point-detail" open={point.body.trim().length < 900}>
              <summary>Full lesson detail for this point</summary>
              <MarkdownBody content={point.body} />
            </details>
          ) : null}
        </div>
      </div>
    </article>
  )
}
