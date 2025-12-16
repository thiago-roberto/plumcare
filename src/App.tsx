import { Loading, useMedplum, useMedplumProfile } from '@medplum/react';
import type { JSX } from 'react';
import { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { PlumCareShell } from './components/shell/PlumCareShell';
import './index.css';
import { EhrIntegrationsPage } from './pages/ehr-integrations/EhrIntegrationsPage';
import { HomePage } from './pages/home/HomePage';
import { NewPatientPage } from './pages/patients/NewPatientPage';
import { PatientsPage } from './pages/patients/PatientsPage';
import { SignInPage } from './pages/SignInPage';

export function App(): JSX.Element | null {
  const medplum = useMedplum();
  const profile = useMedplumProfile();

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

  // Logged in - show PlumCare app
  return (
    <PlumCareShell onSignOut={handleSignOut}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/ehr-integrations" element={<EhrIntegrationsPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:patientId" element={<PatientsPage />} />
          <Route path="/new-patient" element={<NewPatientPage />} />
          <Route path="/signin" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </PlumCareShell>
  );
}
