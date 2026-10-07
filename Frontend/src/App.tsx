import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { DashboardLayout } from './components/DashboardLayout';

import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { ProgramsPage } from './pages/ProgramsPage';
import { ProgramDetailPage } from './pages/ProgramDetailPage';
import { CoachesPage } from './pages/CoachesPage';
import { CoachDetailPage } from './pages/CoachDetailPage';
import { TeamsPage } from './pages/TeamsPage';
import { TeamDetailPage } from './pages/TeamDetailPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { TournamentDetailPage } from './pages/TournamentDetailPage';
import { AthleteProfilePage } from './pages/AthleteProfilePage';
import { GalleryPage } from './pages/GalleryPage';
import { NewsPage } from './pages/NewsPage';
import { ContactPage } from './pages/ContactPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';

import { AdminDashboard } from './pages/dashboard/AdminDashboard';
import { CoachDashboard } from './pages/dashboard/CoachDashboard';
import { AthleteDashboard } from './pages/dashboard/AthleteDashboard';
import { AthleteManagementPage } from './pages/dashboard/AthleteManagementPage';
import { CoachManagementPage } from './pages/dashboard/CoachManagementPage';
import { TeamManagementPage } from './pages/dashboard/TeamManagementPage';
import { SportManagementPage } from './pages/dashboard/SportManagementPage';
import { RosterManagementPage } from './pages/dashboard/RosterManagementPage';
import { DocumentsPage } from './pages/dashboard/DocumentsPage';
import { AnnouncementsPage } from './pages/dashboard/AnnouncementsPage';
import { TrainingCalendarPage } from './pages/dashboard/TrainingCalendarPage';
import { TournamentManagementPage } from './pages/dashboard/TournamentManagementPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Management Routes */}
          <Route path="/dashboard/admin" element={<DashboardLayout><AdminDashboard /></DashboardLayout>} />
          <Route path="/dashboard/coach" element={<DashboardLayout><CoachDashboard /></DashboardLayout>} />
          <Route path="/dashboard/athlete" element={<DashboardLayout><AthleteDashboard /></DashboardLayout>} />
          <Route path="/dashboard/athletes" element={<DashboardLayout><AthleteManagementPage /></DashboardLayout>} />
          <Route path="/dashboard/coaches" element={<DashboardLayout><CoachManagementPage /></DashboardLayout>} />
          <Route path="/dashboard/teams" element={<DashboardLayout><TeamManagementPage /></DashboardLayout>} />
          <Route path="/dashboard/sports" element={<DashboardLayout><SportManagementPage /></DashboardLayout>} />
          <Route path="/dashboard/rosters" element={<DashboardLayout><RosterManagementPage /></DashboardLayout>} />
          <Route path="/dashboard/documents" element={<DashboardLayout><DocumentsPage /></DashboardLayout>} />
          <Route path="/dashboard/announcements" element={<DashboardLayout><AnnouncementsPage /></DashboardLayout>} />
          <Route path="/dashboard/training" element={<DashboardLayout><TrainingCalendarPage /></DashboardLayout>} />
          <Route path="/dashboard/tournaments" element={<DashboardLayout><TournamentManagementPage /></DashboardLayout>} />

          {/* Public Website Routes */}
          <Route
            path="*"
            element={
              <div className="min-h-screen bg-[#F7F1E8] text-[#111111] font-sans antialiased flex flex-col justify-between">
                <Navbar />
                <main className="flex-grow">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/programs" element={<ProgramsPage />} />
                    <Route path="/programs/:id" element={<ProgramDetailPage />} />
                    <Route path="/coaches" element={<CoachesPage />} />
                    <Route path="/coaches/:id" element={<CoachDetailPage />} />
                    <Route path="/teams" element={<TeamsPage />} />
                    <Route path="/teams/:id" element={<TeamDetailPage />} />
                    <Route path="/achievements" element={<AchievementsPage />} />
                    <Route path="/tournaments" element={<TournamentsPage />} />
                    <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
                    <Route path="/athlete/:id" element={<AthleteProfilePage />} />
                    <Route path="/gallery" element={<GalleryPage />} />
                    <Route path="/news" element={<NewsPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
