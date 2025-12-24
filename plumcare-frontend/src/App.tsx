import { Loading, useMedplum, useMedplumProfile } from '@medplum/react';
import type { JSX } from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import { PlumCareShell } from './components/features/shell';
import './index.css';
import { AutomationPage } from './pages/automation/AutomationPage';
import { EhrIntegrationsPage } from './pages/ehr-integrations/EhrIntegrationsPage';
import { HomePage } from './pages/home/HomePage';
import { LoadingPage } from './pages/LoadingPage';
import { NewPatientPage } from './pages/patients/NewPatientPage';
import { PatientProfilePage } from './pages/patients/PatientProfilePage';
import { PatientsPage } from './pages/patients/PatientsPage';
import { SignInPage } from './pages/SignInPage';

export function App(): JSX.Element | null {
  const medplum = useMedplum();
  const profile = useMedplumProfile();
  const location = useLocation();

  if (medplum.isLoading()) {
    return null;
  }

  const handleSignOut = () => {
    medplum.signOut();
    window.location.href = '/signin';
  };

  // If not logged in, show sign in page
  if (!profile) {
    return (
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="*" element={<Navigate to="/signin" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // Loading page shown without shell after login
  if (location.pathname === '/loading') {
    return (
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/loading" element={<LoadingPage />} />
        </Routes>
      </Suspense>
    );
  }

  // Logged in - show PlumCare app
  return (
    <PlumCareShell onSignOut={handleSignOut}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/ehr-integrations" element={<EhrIntegrationsPage />} />
          <Route path="/automation" element={<AutomationPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:patientId" element={<PatientProfilePage />} />
          <Route path="/new-patient" element={<NewPatientPage />} />
          <Route path="/signin" element={<Navigate to="/loading" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </PlumCareShell>
  );
}
