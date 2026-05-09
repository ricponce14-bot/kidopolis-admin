import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardHome from './pages/DashboardHome'
import SettingsPage from './pages/SettingsPage'
import TicketsPage from './pages/TicketsPage'
import ExpensesPage from './pages/ExpensesPage'
import AdsPage from './pages/AdsPage'
import BudgetPage from './pages/BudgetPage'
import NotesPage from './pages/NotesPage'
import FinanzasPage from './pages/FinanzasPage'
import PinGate from './components/PinGate'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a2e',
              color: '#f1f5f9',
              border: '1px solid rgba(108,99,255,0.25)',
              borderRadius: '0.5rem',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#1a1a2e' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#1a1a2e' } },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — any authenticated user */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<PinGate label="Dashboard"><DashboardHome /></PinGate>} />
              <Route path="/dashboard/budget" element={<PinGate label="Presupuesto Inicial"><BudgetPage /></PinGate>} />
              <Route path="/dashboard/tickets" element={<TicketsPage />} />
              <Route path="/dashboard/expenses" element={<PinGate label="Gastos Generales"><ExpensesPage /></PinGate>} />
              <Route path="/dashboard/finanzas" element={<PinGate label="Finanzas"><FinanzasPage /></PinGate>} />
              <Route path="/dashboard/ads" element={<AdsPage />} />
              {/* Admin only */}
              <Route element={<ProtectedRoute requiredRole="admin" />}>
                <Route path="/dashboard/notes" element={<NotesPage />} />
                <Route path="/dashboard/settings" element={<SettingsPage />} />
              </Route>
            </Route>
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
