import { Box } from '@chakra-ui/react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AuthNavigation from './components/AuthNavigation';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import CompanyAdminHome from './pages/CompanyAdminHome';
import ConditionCheck from './pages/ConditionCheck';
import ContinuousMeetingRoom from './pages/ContinuousMeetingRoom';
import ConsultantHome from './pages/ConsultantHome';
import DemographicsSetup from './pages/DemographicsSetup';
import InitialMeetingRoom from './pages/InitialMeetingRoom';
import Login from './pages/Login';
import OperationsAdminHome from './pages/OperationsAdminHome';
import UserHome from './pages/UserHome';
import {
  clearDemoAuthSession,
  getDefaultRouteForRole,
  loadDemoAuthSession,
  type DemoAuthRole,
  type DemoAuthSession,
} from './lib/demoAuth';
import { useState } from 'react';

type ProtectedRouteProps = {
  session: DemoAuthSession | null;
  allowedRoles: DemoAuthRole[];
  onLogout: () => void;
  children: JSX.Element;
};

const ProtectedRoute = ({ session, allowedRoles, onLogout, children }: ProtectedRouteProps) => {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (!session) {
    const loginPath = isAdminRoute ? '/admin/login' : '/login';
    return <Navigate to={`${loginPath}?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to={getDefaultRouteForRole(session.role)} replace />;
  }

  return (
    <>
      <AuthNavigation session={session} onLogout={onLogout} />
      {children}
    </>
  );
};

function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState<DemoAuthSession | null>(() => loadDemoAuthSession());

  const handleLogout = () => {
    const wasAdmin = session?.role === 'admin';
    clearDemoAuthSession();
    setSession(null);
    navigate(wasAdmin ? '/admin/login' : '/login', { replace: true });
  };

  return (
    <Box minH="100vh" bg="#f7f7f8">
      <Routes>
        <Route path="/login" element={<Login session={session} onLogin={setSession} />} />
        <Route path="/admin/login" element={<AdminLogin session={session} onLogin={setSession} />} />
        <Route path="/" element={<Navigate to={session ? getDefaultRouteForRole(session.role) : '/login'} replace />} />
        <Route
          path="/user"
          element={
            <ProtectedRoute session={session} allowedRoles={['user', 'company-admin']} onLogout={handleLogout}>
              <UserHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/condition-check"
          element={
            <ProtectedRoute session={session} allowedRoles={['user', 'company-admin']} onLogout={handleLogout}>
              <ConditionCheck />
            </ProtectedRoute>
          }
        />
        <Route
          path="/user/demographics"
          element={
            <ProtectedRoute session={session} allowedRoles={['user', 'company-admin']} onLogout={handleLogout}>
              <DemographicsSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/consultant"
          element={
            <ProtectedRoute session={session} allowedRoles={['consultant']} onLogout={handleLogout}>
              <ConsultantHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute session={session} allowedRoles={['admin']} onLogout={handleLogout}>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations-admin"
          element={
            <ProtectedRoute session={session} allowedRoles={['operations-admin']} onLogout={handleLogout}>
              <OperationsAdminHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company-admin"
          element={
            <ProtectedRoute session={session} allowedRoles={['company-admin']} onLogout={handleLogout}>
              <CompanyAdminHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/initial"
          element={
            <ProtectedRoute session={session} allowedRoles={['user', 'company-admin']} onLogout={handleLogout}>
              <InitialMeetingRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/continuous"
          element={
            <ProtectedRoute session={session} allowedRoles={['user', 'company-admin']} onLogout={handleLogout}>
              <ContinuousMeetingRoom />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={session ? getDefaultRouteForRole(session.role) : '/login'} replace />} />
      </Routes>
    </Box>
  );
}

export default App;
