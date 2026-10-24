import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Security Route Guard
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Layouts
import { PublicLayout } from './components/layout/PublicLayout';
import { StudentLayout } from './components/layout/StudentLayout';
import { OrganizerLayout } from './components/layout/OrganizerLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { AboutPage } from './pages/public/AboutPage';
import { HelpPage } from './pages/public/HelpPage';
import { SignInPage } from './pages/public/SignInPage';
import { SignUpPage } from './pages/public/SignUpPage';
import { CollegesPage } from './pages/public/CollegesPage';
import { VerifyCertificatePage } from './pages/public/VerifyCertificatePage';
import { EventCertificateCollectionPage } from './pages/public/EventCertificateCollectionPage';

// Events
import { EventsDiscoveryPage } from './pages/events/EventsDiscoveryPage';
import { EventDetailPage } from './pages/events/EventDetailPage';

// Student
import { StudentDashboard } from './pages/student/StudentDashboard';
import { MyRegistrationsPage } from './pages/student/MyRegistrationsPage';
import { MyTimetablePage } from './pages/student/MyTimetablePage';
import { SavedEventsPage } from './pages/student/SavedEventsPage';
import { CertificatesPage } from './pages/student/CertificatesPage';
import { NotificationsPage } from './pages/student/NotificationsPage';
import { StudentProfilePage } from './pages/student/StudentProfilePage';

// Organizer
import { OrganizerDashboard } from './pages/organizer/OrganizerDashboard';
import { MyEventsPage } from './pages/organizer/MyEventsPage';
import { CreateEventPage } from './pages/organizer/CreateEventPage';
import { AttendancePage } from './pages/organizer/AttendancePage';
import { QuestionsPage } from './pages/organizer/QuestionsPage';
import { CertificateManagementPage } from './pages/organizer/CertificateManagementPage';
import { LogisticsSettingsPage } from './pages/organizer/LogisticsSettingsPage';

// Not Found
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Layout Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/events" element={<EventsDiscoveryPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/colleges" element={<CollegesPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/verify-certificate/:certId" element={<VerifyCertificatePage />} />
              <Route path="/verify-certificate" element={<VerifyCertificatePage />} />
              <Route path="/certificates/collection/:eventId" element={<EventCertificateCollectionPage />} />
              <Route path="/404" element={<NotFoundPage />} />
            </Route>

            {/* Student App Routes (Protected for Students and Admins) */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student', 'admin']}>
                  <StudentLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="registrations" element={<MyRegistrationsPage />} />
              <Route path="timetable" element={<MyTimetablePage />} />
              <Route path="saved" element={<SavedEventsPage />} />
              <Route path="certificates" element={<CertificatesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<StudentProfilePage />} />
            </Route>

            {/* Organizer App Routes (Protected for Organizers and Admins) */}
            <Route
              path="/organizer"
              element={
                <ProtectedRoute allowedRoles={['organizer', 'admin']}>
                  <OrganizerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/organizer/dashboard" replace />} />
              <Route path="dashboard" element={<OrganizerDashboard />} />
              <Route path="events" element={<MyEventsPage />} />
              <Route path="create-event" element={<CreateEventPage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="questions" element={<QuestionsPage />} />
              <Route path="certificates" element={<CertificateManagementPage />} />
              <Route path="logistics" element={<LogisticsSettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
