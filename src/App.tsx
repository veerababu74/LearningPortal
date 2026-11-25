import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Home } from '@/pages/Home'
import { Tracks } from '@/pages/Tracks'
import { TrackOverview } from '@/pages/TrackOverview'
import { LessonPage } from '@/pages/LessonPage'
import { LabsIndex } from '@/pages/labs/LabsIndex'
import { LabRouter } from '@/pages/LabRouter'
import { SearchPage } from '@/pages/SearchPage'
import { ProgressPage } from '@/pages/ProgressPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="tracks" element={<Tracks />} />
          <Route path="tracks/:trackId" element={<TrackOverview />} />
          <Route path="learn/:trackId/:lessonId" element={<LessonPage />} />
          <Route path="labs" element={<LabsIndex />} />
          <Route path="labs/:labId" element={<LabRouter />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
