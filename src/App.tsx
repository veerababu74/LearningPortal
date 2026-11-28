import { lazy, type ComponentType } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'

/**
 * Every page is its own chunk: the first visit downloads only the shell and the page you opened.
 * `page(loader, 'Name')` adapts our named exports to React.lazy.
 */
function page<M extends Record<string, unknown>>(loader: () => Promise<M>, name: keyof M) {
  return lazy(async () => ({ default: (await loader())[name] as ComponentType }))
}

const Landing = page(() => import('@/pages/Landing'), 'Landing')
const Topics = page(() => import('@/pages/Topics'), 'Topics')
const Tracks = page(() => import('@/pages/Tracks'), 'Tracks')
const TrackOverview = page(() => import('@/pages/TrackOverview'), 'TrackOverview')
const LessonPage = page(() => import('@/pages/LessonPage'), 'LessonPage')
const LabsIndex = page(() => import('@/pages/labs/LabsIndex'), 'LabsIndex')
const LabRouter = page(() => import('@/pages/LabRouter'), 'LabRouter')
const SearchPage = page(() => import('@/pages/SearchPage'), 'SearchPage')
const ProgressPage = page(() => import('@/pages/ProgressPage'), 'ProgressPage')

const DockerHome = page(() => import('@/pages/docker/DockerHome'), 'DockerHome')
const DockerModulePage = page(() => import('@/pages/docker/DockerModulePage'), 'DockerModulePage')
const DockerLessonPage = page(() => import('@/pages/docker/DockerLessonPage'), 'DockerLessonPage')
const DockerLabsIndex = page(() => import('@/pages/docker/DockerLabsIndex'), 'DockerLabsIndex')
const DockerLabRouter = page(() => import('@/pages/docker/DockerLabRouter'), 'DockerLabRouter')
const DockerCapstone = page(() => import('@/pages/docker/DockerCapstone'), 'DockerCapstone')

const PythonHome = page(() => import('@/pages/python/PythonHome'), 'PythonHome')
const PythonPhasePage = page(() => import('@/pages/python/PythonPhasePage'), 'PythonPhasePage')
const PythonTopicPage = page(() => import('@/pages/python/PythonPath'), 'PythonTopicPage')
const PythonInterviewHub = page(() => import('@/pages/python/PythonPath'), 'PythonInterviewHub')
const AgentsTopicPage = page(() => import('@/pages/agents/AgentsPath'), 'AgentsTopicPage')
const AgentsInterviewHub = page(() => import('@/pages/agents/AgentsPath'), 'AgentsInterviewHub')
const PythonModuleBrowsePage = page(() => import('@/pages/python/PythonModuleBrowsePage'), 'PythonModuleBrowsePage')
const PythonLabsIndex = page(() => import('@/pages/python/PythonLabsIndex'), 'PythonLabsIndex')
const PythonLabRouter = page(() => import('@/pages/python/PythonLabRouter'), 'PythonLabRouter')
const PythonInterviewArena = page(() => import('@/pages/python/PythonInterviewArena'), 'PythonInterviewArena')
const PythonLibraryIndex = page(() => import('@/pages/python/PythonLibrary'), 'PythonLibraryIndex')
const PythonLibraryTopic = page(() => import('@/pages/python/PythonLibrary'), 'PythonLibraryTopic')

const AsyncHome = page(() => import('@/pages/asyncconcur/AsyncHome'), 'AsyncHome')
const AsyncPhasePage = page(() => import('@/pages/asyncconcur/AsyncPhasePage'), 'AsyncPhasePage')
const AsyncModuleBrowsePage = page(() => import('@/pages/asyncconcur/AsyncModuleBrowsePage'), 'AsyncModuleBrowsePage')

const AgentsHome = page(() => import('@/pages/agents/AgentsHome'), 'AgentsHome')
const AgentsPhasePage = page(() => import('@/pages/agents/AgentsPhasePage'), 'AgentsPhasePage')
const AgentsModuleBrowsePage = page(() => import('@/pages/agents/AgentsModuleBrowsePage'), 'AgentsModuleBrowsePage')
const AgentVisualizerIndex = page(() => import('@/pages/agents/AgentVisualizer'), 'AgentVisualizerIndex')
const AgentVisualizerPage = page(() => import('@/pages/agents/AgentVisualizer'), 'AgentVisualizerPage')
const PythonVisualizerIndex = page(() => import('@/pages/agents/AgentVisualizer'), 'PythonVisualizerIndex')
const PythonVisualizerPage = page(() => import('@/pages/agents/AgentVisualizer'), 'PythonVisualizerPage')
const RagVisualizerIndex = page(() => import('@/pages/agents/AgentVisualizer'), 'RagVisualizerIndex')
const RagVisualizerPage = page(() => import('@/pages/agents/AgentVisualizer'), 'RagVisualizerPage')
const RagHome = page(() => import('@/pages/rag/RagPages'), 'RagHome')
const RagPhasePage = page(() => import('@/pages/rag/RagPages'), 'RagPhasePage')
const RagModulePage = page(() => import('@/pages/rag/RagPages'), 'RagModulePage')
const RagTopicPage = page(() => import('@/pages/rag/RagPages'), 'RagTopicPage')
const RagInterviewHub = page(() => import('@/pages/rag/RagPages'), 'RagInterviewHub')

const ProjectVisualizerIndex = page(() => import('@/pages/agents/AgentVisualizer'), 'ProjectVisualizerIndex')
const ProjectVisualizerPage = page(() => import('@/pages/agents/AgentVisualizer'), 'ProjectVisualizerPage')
const ProjectHome = page(() => import('@/pages/project/ProjectPages'), 'ProjectHome')
const ProjectPhasePage = page(() => import('@/pages/project/ProjectPages'), 'ProjectPhasePage')
const ProjectModulePage = page(() => import('@/pages/project/ProjectPages'), 'ProjectModulePage')
const ProjectTopicPage = page(() => import('@/pages/project/ProjectPages'), 'ProjectTopicPage')
const ProjectInterviewHub = page(() => import('@/pages/project/ProjectPages'), 'ProjectInterviewHub')

const MlVisualizerIndex = page(() => import('@/pages/agents/AgentVisualizer'), 'MlVisualizerIndex')
const MlVisualizerPage = page(() => import('@/pages/agents/AgentVisualizer'), 'MlVisualizerPage')
const MlHome = page(() => import('@/pages/ml/MlPages'), 'MlHome')
const MlPhasePage = page(() => import('@/pages/ml/MlPages'), 'MlPhasePage')
const MlModulePage = page(() => import('@/pages/ml/MlPages'), 'MlModulePage')
const MlTopicPage = page(() => import('@/pages/ml/MlPages'), 'MlTopicPage')
const MlInterviewHub = page(() => import('@/pages/ml/MlPages'), 'MlInterviewHub')

const SystemVisualizerIndex = page(() => import('@/pages/agents/AgentVisualizer'), 'SystemVisualizerIndex')
const SystemVisualizerPage = page(() => import('@/pages/agents/AgentVisualizer'), 'SystemVisualizerPage')
const SystemHome = page(() => import('@/pages/system/SystemPages'), 'SystemHome')
const SystemPhasePage = page(() => import('@/pages/system/SystemPages'), 'SystemPhasePage')
const SystemModulePage = page(() => import('@/pages/system/SystemPages'), 'SystemModulePage')
const SystemTopicPage = page(() => import('@/pages/system/SystemPages'), 'SystemTopicPage')
const SystemInterviewHub = page(() => import('@/pages/system/SystemPages'), 'SystemInterviewHub')

function NotFound() {
  return (
    <div className="track-page" style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.25rem' }}>
      <p style={{ fontWeight: 800, color: 'var(--focus)', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.8rem' }}>404</p>
      <h1>Page not found</h1>
      <p>This address does not exist. It may have moved when the site was reorganized.</p>
      <p style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link to="/">← Home</Link>
        <Link to="/topics">All topics</Link>
        <Link to="/search">Search</Link>
      </p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Landing />} />
          <Route path="home" element={<Navigate to="/" replace />} />
          <Route path="topics" element={<Topics />} />

          <Route path="python" element={<PythonHome />} />
          <Route path="python/labs" element={<PythonLabsIndex />} />
          <Route path="python/visualizer" element={<PythonVisualizerIndex />} />
          <Route path="python/visualizer/:simId" element={<PythonVisualizerPage />} />
          <Route path="python/labs/:labId" element={<PythonLabRouter />} />
          <Route path="python/interview-arena" element={<PythonInterviewArena />} />
          <Route path="python/library" element={<PythonLibraryIndex />} />
          <Route path="python/library/:topicId" element={<PythonLibraryTopic />} />
          <Route path="python/path/:topicId" element={<PythonTopicPage />} />
          <Route path="python/interview" element={<PythonInterviewHub />} />
          <Route path="python/learn" element={<Navigate to="/python" replace />} />
          <Route path="python/learn/:moduleId" element={<PythonModuleBrowsePage />} />
          <Route path="python/:phaseId" element={<PythonPhasePage />} />

          <Route path="async" element={<AsyncHome />} />
          <Route path="async/learn/:moduleId" element={<AsyncModuleBrowsePage />} />
          <Route path="async/:phaseId" element={<AsyncPhasePage />} />

          <Route path="agents" element={<AgentsHome />} />
          <Route path="agents/visualizer" element={<AgentVisualizerIndex />} />
          <Route path="agents/visualizer/:simId" element={<AgentVisualizerPage />} />
          <Route path="agents/path/:topicId" element={<AgentsTopicPage />} />
          <Route path="agents/interview" element={<AgentsInterviewHub />} />
          <Route path="agents/learn/:moduleId" element={<AgentsModuleBrowsePage />} />
          <Route path="agents/:phaseId" element={<AgentsPhasePage />} />

          <Route path="rag" element={<RagHome />} />
          <Route path="rag/visualizer" element={<RagVisualizerIndex />} />
          <Route path="rag/visualizer/:simId" element={<RagVisualizerPage />} />
          <Route path="rag/path/:topicId" element={<RagTopicPage />} />
          <Route path="rag/interview" element={<RagInterviewHub />} />
          <Route path="rag/learn/:moduleId" element={<RagModulePage />} />
          <Route path="rag/:phaseId" element={<RagPhasePage />} />

          <Route path="project" element={<ProjectHome />} />
          <Route path="project/visualizer" element={<ProjectVisualizerIndex />} />
          <Route path="project/visualizer/:simId" element={<ProjectVisualizerPage />} />
          <Route path="project/path/:topicId" element={<ProjectTopicPage />} />
          <Route path="project/interview" element={<ProjectInterviewHub />} />
          <Route path="project/learn/:moduleId" element={<ProjectModulePage />} />
          <Route path="project/:phaseId" element={<ProjectPhasePage />} />

          <Route path="ml" element={<MlHome />} />
          <Route path="ml/visualizer" element={<MlVisualizerIndex />} />
          <Route path="ml/visualizer/:simId" element={<MlVisualizerPage />} />
          <Route path="ml/path/:topicId" element={<MlTopicPage />} />
          <Route path="ml/interview" element={<MlInterviewHub />} />
          <Route path="ml/learn" element={<Navigate to="/ml" replace />} />
          <Route path="ml/learn/:moduleId" element={<MlModulePage />} />
          <Route path="ml/:phaseId" element={<MlPhasePage />} />

          <Route path="system-design" element={<SystemHome />} />
          <Route path="system-design/visualizer" element={<SystemVisualizerIndex />} />
          <Route path="system-design/visualizer/:simId" element={<SystemVisualizerPage />} />
          <Route path="system-design/path/:topicId" element={<SystemTopicPage />} />
          <Route path="system-design/interview" element={<SystemInterviewHub />} />
          <Route path="system-design/learn" element={<Navigate to="/system-design" replace />} />
          <Route path="system-design/learn/:moduleId" element={<SystemModulePage />} />
          <Route path="system-design/:phaseId" element={<SystemPhasePage />} />

          <Route path="docker" element={<DockerHome />} />
          <Route path="docker/labs" element={<DockerLabsIndex />} />
          <Route path="docker/labs/:labId" element={<DockerLabRouter />} />
          <Route path="docker/capstone" element={<DockerCapstone />} />
          <Route path="docker/:moduleId" element={<DockerModulePage />} />
          <Route path="docker/:moduleId/:lessonId" element={<DockerLessonPage />} />

          <Route path="tracks" element={<Tracks />} />
          <Route path="tracks/python" element={<Navigate to="/python" replace />} />
          <Route path="tracks/asyncconcur" element={<Navigate to="/async" replace />} />
          <Route path="tracks/agents" element={<Navigate to="/agents" replace />} />
          <Route path="tracks/veerarag" element={<Navigate to="/rag" replace />} />
          <Route path="tracks/veeraproject" element={<Navigate to="/project" replace />} />
          <Route path="tracks/veeraml" element={<Navigate to="/ml" replace />} />
          <Route path="tracks/veerasys" element={<Navigate to="/system-design" replace />} />
          <Route path="tracks/:trackId" element={<TrackOverview />} />
          <Route path="learn/:trackId/:lessonId" element={<LessonPage />} />
          <Route path="labs" element={<LabsIndex />} />
          <Route path="labs/:labId" element={<LabRouter />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
