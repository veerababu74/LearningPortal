import { Link, useParams } from 'react-router-dom'
import { getGeneratedTopic, getPythonGeneratedIndex } from '@/content/python/loadGenerated'
import '@/components/python/python.css'

export function PythonLibraryIndex() {
  const index = getPythonGeneratedIndex()
  return (
    <div className="py-page">
      <p className="py-kicker">Topic library</p>
      <h1>All parsed Python lessons</h1>
      <p>
        {index.topicCount} GenAI-style lessons from nested guides and <code>.py</code> files · generated{' '}
        {new Date(index.generatedAt).toLocaleString()}
      </p>
      <div className="py-modules">
        {index.topics.map((t) => (
          <Link key={t.id} to={`/learn/python/${t.id}`} className="py-module-link">
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{t.title}</h2>
            <p className="py-muted">{t.summary}</p>
            <p className="py-muted">
              {t.conceptualCount} quiz · {t.scenarioCount} scenarios · {t.codeCount} code blocks
            </p>
          </Link>
        ))}
      </div>
      <h2>OOP-focused</h2>
      <div className="py-modules">
        {index.oopSubtopics.map((t) => (
          <Link key={t.id} to={`/learn/python/${t.id}`} className="py-module-link">
            <h3 style={{ margin: 0 }}>{t.title}</h3>
            <p className="py-muted">{t.summary}</p>
          </Link>
        ))}
      </div>
      <div className="py-lesson-nav">
        <Link to="/python">Course home</Link>
        <Link to="/python">Python home →</Link>
      </div>
    </div>
  )
}

export function PythonLibraryTopic() {
  const { topicId = '' } = useParams()
  const topic = getGeneratedTopic(topicId)

  if (!topic) {
    return (
      <div className="py-page">
        <h1>Topic not found</h1>
        <Link to="/python/library">Back to library</Link>
      </div>
    )
  }

  return (
    <div className="py-page">
      <p className="py-kicker">{topic.file}</p>
      <h1>{topic.title}</h1>
      <p>{topic.summary}</p>
      <Link to={`/learn/python/${topic.id}`} className="py-btn">
        Open GenAI-style lesson
      </Link>
      <div className="py-lesson-nav">
        <Link to="/python/library">All topics</Link>
      </div>
    </div>
  )
}
