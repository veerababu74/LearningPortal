import { Link } from 'react-router-dom'
import { PYTHON_LABS } from '@/content/python/modules'
import '@/components/python/python.css'

export function PythonLabsIndex() {
  return (
    <div className="py-page">
      <p className="py-kicker">Lab workspace</p>
      <h1>Python interactive labs</h1>
      <p>Browser simulations with immediate visual feedback. Linked from curated lessons.</p>
      <div className="py-modules">
        {PYTHON_LABS.map((lab, i) => (
          <Link key={lab.id} to={`/python/labs/${lab.id}`} className="py-module-link">
            <span className="py-kicker">
              Lab {String(i + 1).padStart(2, '0')} · Browser simulation
            </span>
            <h2 style={{ margin: '0.3rem 0', fontSize: '1.15rem' }}>{lab.title}</h2>
            <p>{lab.blurb}</p>
          </Link>
        ))}
      </div>
      <div className="py-lesson-nav">
        <Link to="/python">Course home</Link>
        <Link to="/python/m1/names-and-objects">Module 1 lesson →</Link>
      </div>
    </div>
  )
}
