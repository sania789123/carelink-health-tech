import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';
import InviteAccept from './pages/InviteAccept.jsx';
import PublicShare from './pages/PublicShare.jsx';

import PatientDashboard from './pages/patient/Dashboard.jsx';
import PatientProfile from './pages/patient/Profile.jsx';
import PatientMedicines from './pages/patient/Medicines.jsx';
import PatientMedicineUpload from './pages/patient/MedicineUpload.jsx';
import PatientMedicineHistory from './pages/patient/MedicineHistory.jsx';
import PatientReports from './pages/patient/Reports.jsx';
import PatientReportUpload from './pages/patient/ReportUpload.jsx';
import PatientReportDetail from './pages/patient/ReportDetail.jsx';
import PatientHealthChange from './pages/patient/HealthChange.jsx';
import PatientDoctorConnect from './pages/patient/DoctorConnect.jsx';
import PatientCareCircle from './pages/patient/CareCircle.jsx';
import PatientRecoveryTrack from './pages/patient/RecoveryTrack.jsx';
import PatientNotifications from './pages/patient/Notifications.jsx';
import PatientSettings from './pages/patient/Settings.jsx';

import DoctorDashboard from './pages/doctor/Dashboard.jsx';
import DoctorPatients from './pages/doctor/Patients.jsx';
import DoctorPatientDetail from './pages/doctor/PatientDetail.jsx';
import DoctorReports from './pages/doctor/Reports.jsx';
import DoctorHealthChange from './pages/doctor/HealthChange.jsx';
import DoctorCarePlans from './pages/doctor/CarePlans.jsx';
import DoctorFollowUps from './pages/doctor/FollowUps.jsx';
import DoctorQRAccess from './pages/doctor/QRAccess.jsx';
import DoctorNotifications from './pages/doctor/Notifications.jsx';
import DoctorSettings from './pages/doctor/Settings.jsx';

import CaregiverDashboard from './pages/caregiver/Dashboard.jsx';
import CaregiverPatients from './pages/caregiver/Patients.jsx';
import CaregiverMedicines from './pages/caregiver/Medicines.jsx';
import CaregiverReports from './pages/caregiver/Reports.jsx';
import CaregiverCareCircle from './pages/caregiver/CareCircle.jsx';
import CaregiverFollowUps from './pages/caregiver/FollowUps.jsx';
import CaregiverNotifications from './pages/caregiver/Notifications.jsx';
import CaregiverSettings from './pages/caregiver/Settings.jsx';

/**
 * Home route:
 *  - Logged OUT → show the public homepage (hero + features)
 *  - Logged IN  → redirect to the appropriate dashboard
 */
function HomeRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={'/' + user.role + '/dashboard'} replace />;
  return <Home />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/invite/:token" element={<InviteAccept />} />
      <Route path="/share/:token" element={<PublicShare />} />

      {/* Patient */}
      <Route path="/patient/dashboard" element={<ProtectedRoute role="patient"><Layout><PatientDashboard /></Layout></ProtectedRoute>} />
      <Route path="/patient/profile" element={<ProtectedRoute role="patient"><Layout><PatientProfile /></Layout></ProtectedRoute>} />
      <Route path="/patient/medicines" element={<ProtectedRoute role="patient"><Layout><PatientMedicines /></Layout></ProtectedRoute>} />
      <Route path="/patient/medicines/upload" element={<ProtectedRoute role="patient"><Layout><PatientMedicineUpload /></Layout></ProtectedRoute>} />
      <Route path="/patient/medicines/history" element={<ProtectedRoute role="patient"><Layout><PatientMedicineHistory /></Layout></ProtectedRoute>} />
      <Route path="/patient/reports" element={<ProtectedRoute role="patient"><Layout><PatientReports /></Layout></ProtectedRoute>} />
      <Route path="/patient/reports/upload" element={<ProtectedRoute role="patient"><Layout><PatientReportUpload /></Layout></ProtectedRoute>} />
      <Route path="/patient/reports/:reportId" element={<ProtectedRoute role="patient"><Layout><PatientReportDetail /></Layout></ProtectedRoute>} />
      <Route path="/patient/health-change" element={<ProtectedRoute role="patient"><Layout><PatientHealthChange /></Layout></ProtectedRoute>} />
      <Route path="/patient/doctor-connect" element={<ProtectedRoute role="patient"><Layout><PatientDoctorConnect /></Layout></ProtectedRoute>} />
      <Route path="/patient/care-circle" element={<ProtectedRoute role="patient"><Layout><PatientCareCircle /></Layout></ProtectedRoute>} />
      <Route path="/patient/recovery-track" element={<ProtectedRoute role="patient"><Layout><PatientRecoveryTrack /></Layout></ProtectedRoute>} />
      <Route path="/patient/notifications" element={<ProtectedRoute role="patient"><Layout><PatientNotifications /></Layout></ProtectedRoute>} />
      <Route path="/patient/settings" element={<ProtectedRoute role="patient"><Layout><PatientSettings /></Layout></ProtectedRoute>} />

      {/* Doctor */}
      <Route path="/doctor/dashboard" element={<ProtectedRoute role="doctor"><Layout><DoctorDashboard /></Layout></ProtectedRoute>} />
      <Route path="/doctor/patients" element={<ProtectedRoute role="doctor"><Layout><DoctorPatients /></Layout></ProtectedRoute>} />
      <Route path="/doctor/patients/:patientId" element={<ProtectedRoute role="doctor"><Layout><DoctorPatientDetail /></Layout></ProtectedRoute>} />
      <Route path="/doctor/reports" element={<ProtectedRoute role="doctor"><Layout><DoctorReports /></Layout></ProtectedRoute>} />
      <Route path="/doctor/health-change" element={<ProtectedRoute role="doctor"><Layout><DoctorHealthChange /></Layout></ProtectedRoute>} />
      <Route path="/doctor/care-plans" element={<ProtectedRoute role="doctor"><Layout><DoctorCarePlans /></Layout></ProtectedRoute>} />
      <Route path="/doctor/follow-ups" element={<ProtectedRoute role="doctor"><Layout><DoctorFollowUps /></Layout></ProtectedRoute>} />
      <Route path="/doctor/qr-access" element={<ProtectedRoute role="doctor"><Layout><DoctorQRAccess /></Layout></ProtectedRoute>} />
      <Route path="/doctor/notifications" element={<ProtectedRoute role="doctor"><Layout><DoctorNotifications /></Layout></ProtectedRoute>} />
      <Route path="/doctor/settings" element={<ProtectedRoute role="doctor"><Layout><DoctorSettings /></Layout></ProtectedRoute>} />

      {/* Caregiver */}
      <Route path="/caregiver/dashboard" element={<ProtectedRoute role="caregiver"><Layout><CaregiverDashboard /></Layout></ProtectedRoute>} />
      <Route path="/caregiver/patients" element={<ProtectedRoute role="caregiver"><Layout><CaregiverPatients /></Layout></ProtectedRoute>} />
      <Route path="/caregiver/medicines" element={<ProtectedRoute role="caregiver"><Layout><CaregiverMedicines /></Layout></ProtectedRoute>} />
      <Route path="/caregiver/reports" element={<ProtectedRoute role="caregiver"><Layout><CaregiverReports /></Layout></ProtectedRoute>} />
      <Route path="/caregiver/care-circle" element={<ProtectedRoute role="caregiver"><Layout><CaregiverCareCircle /></Layout></ProtectedRoute>} />
      <Route path="/caregiver/follow-ups" element={<ProtectedRoute role="caregiver"><Layout><CaregiverFollowUps /></Layout></ProtectedRoute>} />
      <Route path="/caregiver/notifications" element={<ProtectedRoute role="caregiver"><Layout><CaregiverNotifications /></Layout></ProtectedRoute>} />
      <Route path="/caregiver/settings" element={<ProtectedRoute role="caregiver"><Layout><CaregiverSettings /></Layout></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}