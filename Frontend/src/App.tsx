import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ScrollToTop } from './components/ScrollToTop';
import { DashboardLayout } from './components/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';

// Eager routes for critical first-load performance
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';

// Lazy-loaded routes for code-splitting
const AboutPage = React.lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const ProgramsPage = React.lazy(() => import('./pages/ProgramsPage').then((m) => ({ default: m.ProgramsPage })));
const ProgramDetailPage = React.lazy(() => import('./pages/ProgramDetailPage').then((m) => ({ default: m.ProgramDetailPage })));
const CoachesPage = React.lazy(() => import('./pages/CoachesPage').then((m) => ({ default: m.CoachesPage })));
const CoachDetailPage = React.lazy(() => import('./pages/CoachDetailPage').then((m) => ({ default: m.CoachDetailPage })));
const TeamsPage = React.lazy(() => import('./pages/TeamsPage').then((m) => ({ default: m.TeamsPage })));
const TeamDetailPage = React.lazy(() => import('./pages/TeamDetailPage').then((m) => ({ default: m.TeamDetailPage })));
const AchievementsPage = React.lazy(() => import('./pages/AchievementsPage').then((m) => ({ default: m.AchievementsPage })));
const TournamentsPage = React.lazy(() => import('./pages/TournamentsPage').then((m) => ({ default: m.TournamentsPage })));
const TournamentDetailPage = React.lazy(() => import('./pages/TournamentDetailPage').then((m) => ({ default: m.TournamentDetailPage })));
const AthleteProfilePage = React.lazy(() => import('./pages/AthleteProfilePage').then((m) => ({ default: m.AthleteProfilePage })));
const GalleryPage = React.lazy(() => import('./pages/GalleryPage').then((m) => ({ default: m.GalleryPage })));
const NewsPage = React.lazy(() => import('./pages/NewsPage').then((m) => ({ default: m.NewsPage })));
const ContactPage = React.lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const PublicLiveMatchesPage = React.lazy(() => import('./pages/PublicLiveMatchesPage').then((m) => ({ default: m.PublicLiveMatchesPage })));
const PublicMatchDetailPage = React.lazy(() => import('./pages/PublicMatchDetailPage').then((m) => ({ default: m.PublicMatchDetailPage })));

// Legal Pages
const PrivacyPolicyPage = React.lazy(() => import('./pages/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })));
const TermsPage = React.lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const CodeOfConductPage = React.lazy(() => import('./pages/CodeOfConductPage').then((m) => ({ default: m.CodeOfConductPage })));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

// Dashboard Lazy Routes
const AdminDashboard = React.lazy(() => import('./pages/dashboard/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const CoachDashboard = React.lazy(() => import('./pages/dashboard/CoachDashboard').then((m) => ({ default: m.CoachDashboard })));
const AthleteDashboard = React.lazy(() => import('./pages/dashboard/AthleteDashboard').then((m) => ({ default: m.AthleteDashboard })));
const OrganizerDashboard = React.lazy(() => import('./pages/dashboard/OrganizerDashboard').then((m) => ({ default: m.OrganizerDashboard })));
const NotificationsPage = React.lazy(() => import('./pages/dashboard/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const AnalyticsPage = React.lazy(() => import('./pages/dashboard/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const ContactMessagesPage = React.lazy(() => import('./pages/dashboard/ContactMessagesPage').then((m) => ({ default: m.ContactMessagesPage })));
const AthleteManagementPage = React.lazy(() => import('./pages/dashboard/AthleteManagementPage').then((m) => ({ default: m.AthleteManagementPage })));
const CoachManagementPage = React.lazy(() => import('./pages/dashboard/CoachManagementPage').then((m) => ({ default: m.CoachManagementPage })));
const TeamManagementPage = React.lazy(() => import('./pages/dashboard/TeamManagementPage').then((m) => ({ default: m.TeamManagementPage })));
const SportManagementPage = React.lazy(() => import('./pages/dashboard/SportManagementPage').then((m) => ({ default: m.SportManagementPage })));
const RosterManagementPage = React.lazy(() => import('./pages/dashboard/RosterManagementPage').then((m) => ({ default: m.RosterManagementPage })));
const DocumentsPage = React.lazy(() => import('./pages/dashboard/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
const AnnouncementsPage = React.lazy(() => import('./pages/dashboard/AnnouncementsPage').then((m) => ({ default: m.AnnouncementsPage })));
const TrainingCalendarPage = React.lazy(() => import('./pages/dashboard/TrainingCalendarPage').then((m) => ({ default: m.TrainingCalendarPage })));
const TournamentManagementPage = React.lazy(() => import('./pages/dashboard/TournamentManagementPage').then((m) => ({ default: m.TournamentManagementPage })));
const DashboardTournamentDetailPage = React.lazy(() => import('./pages/dashboard/TournamentDetailPage').then((m) => ({ default: m.TournamentDetailPage })));
const VenuesPage = React.lazy(() => import('./pages/dashboard/VenuesPage').then((m) => ({ default: m.VenuesPage })));
const UserAccountsPage = React.lazy(() => import('./pages/dashboard/UserAccountsPage').then((m) => ({ default: m.UserAccountsPage })));
const LiveMatchesConsoleListPage = React.lazy(() => import('./pages/dashboard/LiveMatchesConsoleListPage').then((m) => ({ default: m.LiveMatchesConsoleListPage })));
const ScorerConsolePage = React.lazy(() => import('./pages/dashboard/ScorerConsolePage').then((m) => ({ default: m.ScorerConsolePage })));
const DashboardAchievementsPage = React.lazy(() => import('./pages/dashboard/AchievementsPage').then((m) => ({ default: m.AchievementsPage })));
const ProfilePage = React.lazy(() => import('./pages/dashboard/ProfilePage').then((m) => ({ default: m.ProfilePage })));

const PageLoadingFallback: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    className="min-h-[400px] flex items-center justify-center p-8 text-[#171044]"
  >
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-[#171044]/20 border-t-[#FF5A00] rounded-full animate-spin" />
      <span className="text-xs font-bold uppercase tracking-wider text-[#171044]/70">
        Loading view...
      </span>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Suspense fallback={<PageLoadingFallback />}>
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
              path="/dashboard/organizer"
              element={
                <ProtectedRoute allowedRoles={['Organizer', 'Admin']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <OrganizerDashboard />
                    </ErrorBoundary>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/live"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Organizer']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <LiveMatchesConsoleListPage />
                    </ErrorBoundary>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/live/:matchId"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Organizer']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <ScorerConsolePage />
                    </ErrorBoundary>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/matches/:id/score"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Organizer']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <ScorerConsolePage />
                    </ErrorBoundary>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/notifications"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Coach', 'Athlete', 'Organizer']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <NotificationsPage />
                    </ErrorBoundary>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/profile"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Coach', 'Athlete', 'Organizer']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <ProfilePage />
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
                <ProtectedRoute allowedRoles={['Admin', 'Organizer', 'Coach', 'Athlete']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <TournamentManagementPage />
                    </ErrorBoundary>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/tournaments/:id"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Organizer', 'Coach', 'Athlete']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <DashboardTournamentDetailPage />
                    </ErrorBoundary>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/venues"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Organizer']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <VenuesPage />
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
              path="/dashboard/messages"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <ContactMessagesPage />
                    </ErrorBoundary>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/inquiries"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <ContactMessagesPage />
                    </ErrorBoundary>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/achievements"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <DashboardAchievementsPage />
                    </ErrorBoundary>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/analytics"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Coach', 'Athlete']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <AnalyticsPage />
                    </ErrorBoundary>
                  </DashboardLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/athlete/:id"
              element={
                <ProtectedRoute allowedRoles={['Admin', 'Coach', 'Athlete']}>
                  <DashboardLayout>
                    <ErrorBoundary>
                      <AthleteProfilePage />
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
                      {/* Eager public routes */}
                      <Route path="/" element={<HomePage />} />
                      <Route path="/login" element={<LoginPage />} />

                      {/* Lazy public routes */}
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
                      <Route
                        path="/athlete/me"
                        element={
                          <ProtectedRoute allowedRoles={['Athlete']}>
                            <ErrorBoundary>
                              <AthleteProfilePage />
                            </ErrorBoundary>
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/matches/live"
                        element={
                          <ErrorBoundary>
                            <PublicLiveMatchesPage />
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/live"
                        element={
                          <ErrorBoundary>
                            <PublicLiveMatchesPage />
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/matches/:id"
                        element={
                          <ErrorBoundary>
                            <PublicMatchDetailPage />
                          </ErrorBoundary>
                        }
                      />
                      <Route path="/gallery" element={<GalleryPage />} />
                      <Route path="/news" element={<NewsPage />} />
                      <Route path="/contact" element={<ContactPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="/reset-password" element={<ResetPasswordPage />} />

                      {/* Public Legal Routes */}
                      <Route
                        path="/privacy"
                        element={
                          <ErrorBoundary>
                            <PrivacyPolicyPage />
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/terms"
                        element={
                          <ErrorBoundary>
                            <TermsPage />
                          </ErrorBoundary>
                        }
                      />
                      <Route
                        path="/code-of-conduct"
                        element={
                          <ErrorBoundary>
                            <CodeOfConductPage />
                          </ErrorBoundary>
                        }
                      />

                      {/* Fallback 404 Route */}
                      <Route
                        path="*"
                        element={
                          <ErrorBoundary>
                            <NotFoundPage />
                          </ErrorBoundary>
                        }
                      />
                    </Routes>
                  </main>
                  <Footer />
                </div>
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
