import { createBrowserRouter, Navigate } from 'react-router-dom'
import AuthPage        from '../pages/AuthPage'
import OnboardingPage  from '../pages/OnboardingPage'
import DashboardPage   from '../pages/DashboardPage'
import WorkspacePage   from '../pages/WorkspacePage'
import TemplatesPage   from '../pages/TemplatesPage'
import SettingsPage    from '../pages/SettingsPage'
import AppShell        from '../components/layout/AppShell'

export const router = createBrowserRouter([
  { path: '/',             element: <AuthPage /> },
  { path: '/onboarding',   element: <OnboardingPage /> },
  {
    element: <AppShell />,
    children: [
      { path: '/dashboard',          element: <DashboardPage /> },
      { path: '/workspace/:id',      element: <WorkspacePage /> },
      { path: '/templates',          element: <TemplatesPage /> },
      { path: '/settings',           element: <SettingsPage /> },
      { path: '/settings/:tab',      element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
