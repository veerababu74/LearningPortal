import { Link } from 'react-router-dom'
import { getCurriculumIndex } from '@/content/loadCurriculum'
import { useProgress } from '@/store/progress'
import './Home.css'

const PIPELINE = ['Load', 'Chunk', 'Embed', 'Retrieve', 'Guard', 'Generate']

export function Home() {
  const index = getCurriculumIndex()
  const totalLessons = index.tracks.reduce((n, t) => n + t.lessonCount, 0)
  const completed = useProgress((s) => s.completedLessonIds.length)
  const last = useProgress((s) => s.lastLessonId)

  let continueTo = '/tracks'
  if (last) {
    for (const [trackId, list] of Object.entries(index.lessonsByTrack)) {
      if (list.some((l) => l.id === last)) {
        continueTo = `/learn/${trackId}/${last}`
        break
      }
    }
  }

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Clear visual GenAI learning</p>
          <h1 className="brand-hero">LearnGenAI</h1>
          <p className="lede">
            Every concept explained point by point — with a flow diagram, a visual explanation, and
            a clear textual explanation for each idea across RAG, agents, security, and gateways.
          </p>
          <div className="cta-row">
            <Link to="/tracks" className="cta primary">
              Start learning
            </Link>
            <Link to={continueTo} className="cta ghost">
              {last ? 'Continue' : 'Browse tracks'}
            </Link>
          </div>
          <p className="hero-meta">
            {totalLessons} lessons · {index.tracks.length} tracks · {completed} completed
          </p>
        </div>

        <div className="hero-visual" aria-hidden>
          <div className="hero-glow" />
          <div className="pipe">
            {PIPELINE.map((label, i) => (
              <div key={label} className="pipe-node">
                <span>{label}</span>
                {i < PIPELINE.length - 1 ? <i className="pipe-edge" /> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
