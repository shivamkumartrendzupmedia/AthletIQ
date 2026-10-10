import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { DashboardLayout } from './components/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

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
import { UserAccountsPage } from './pages/dashboard/UserAccountsPage';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Management Routes (Protected by Authentication & Role) */}
          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <DashboardLayout>
                  <ErrorBoundary>
                    <AdminDashboard />
                  </ErrorBoundary>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/coach"
            element={
              <ProtectedRoute allowedRoles={['Coach']}>
                <DashboardLayout>
                  <ErrorBoundary>
                    <CoachDashboard />
                  </ErrorBoundary>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/athlete"
            element={
              <ProtectedRoute allowedRoles={['Athlete']}>
                <DashboardLayout>
                  <ErrorBoundary>
                    <AthleteDashboard />
                  </ErrorBoundary>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/athletes"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Coach']}>
                <DashboardLayout>
                  <ErrorBoundary>
                    <AthleteManagementPage />
                  </ErrorBoundary>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/coaches"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <DashboardLayout>
                  <ErrorBoundary>
                    <CoachManagementPage />
                  </ErrorBoundary>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/teams"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Coach', 'Organizer']}>
                <DashboardLayout>
                  <ErrorBoundary>
                    <TeamManagementPage />
                  </ErrorBoundary>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/sports"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <DashboardLayout>
                  <ErrorBoundary>
                    <SportManagementPage />
                  </ErrorBoundary>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/rosters"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <DashboardLayout>
                  <ErrorBoundary>
                    <RosterManagementPage />
                  </ErrorBoundary>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/users"
            element={
              <ProtectedRoute allowedRoles={['Admin']}>
                <DashboardLayout>
                  <ErrorBoundary>
                    <UserAccountsPage />
                  </ErrorBoundary>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/documents"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Coach', 'Athlete', 'Organizer']}>
                <DashboardLayout>
                  <ErrorBoundary>
                    <DocumentsPage />
                  </ErrorBoundary>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/announcements"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Coach', 'Athlete', 'Organizer']}>
                <DashboardLayout>
                  <ErrorBoundary>
                    <AnnouncementsPage />
                  </ErrorBoundary>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/training"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Coach', 'Athlete', 'Organizer']}>
                <DashboardLayout>
                  <ErrorBoundary>
                    <TrainingCalendarPage />
                  </ErrorBoundary>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/tournaments"
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Coach', 'Organizer']}>
                <DashboardLayout>
                  <ErrorBoundary>
                    <TournamentManagementPage />
                  </ErrorBoundary>
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

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
                    <Route
                      path="/programs"
                      element={
                        <ErrorBoundary>
                          <ProgramsPage />
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/programs/:id"
                      element={
                        <ErrorBoundary>
                          <ProgramDetailPage />
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/coaches"
                      element={
                        <ErrorBoundary>
                          <CoachesPage />
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/coaches/:id"
                      element={
                        <ErrorBoundary>
                          <CoachDetailPage />
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/teams"
                      element={
                        <ErrorBoundary>
                          <TeamsPage />
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/teams/:id"
                      element={
                        <ErrorBoundary>
                          <TeamDetailPage />
                        </ErrorBoundary>
                      }
                    />
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
