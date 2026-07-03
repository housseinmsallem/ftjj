import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Competitions from "./pages/Competitions";
import Rankings from "./pages/Rankings";
import Live from "./pages/Live";
import ClubDashboard from "./pages/ClubDashboard";
import AdminResourcePage from "./pages/AdminResourcePage";
import AdminLiveScoring from "./pages/AdminLiveScoring";
import AdminContentBuilder from "./pages/AdminContentBuilder";
import AdminNotifications from "./pages/AdminNotifications";
import AdminUploads from "./pages/AdminUploads";
import PublicDirectory from "./pages/PublicDirectory";
import ClubAffiliation from "./pages/ClubAffiliation";
import MemberDashboard from "./pages/MemberDashboard";
import FederationPage from "./pages/FederationPage";
import NewsPage from "./pages/NewsPage";
import MediaPage from "./pages/MediaPage";
import ContactPage from "./pages/ContactPage";
import LicensedSpacePage from "./pages/LicensedSpacePage";
import ProtectedRoute from "./routes/ProtectedRoute";
import AdminFederationModule from "./pages/admin/AdminFederationModule";
import AdminMediaLibrary from "./pages/AdminMediaLibrary";
import AdminCompetitionOperations from "./pages/admin/AdminCompetitionOperations";
import AdminAffiliationRequests from "./pages/admin/AdminAffiliationRequests";
import AdminTransfers from "./pages/admin/AdminTransfers";
import AdminRegistrations from "./pages/admin/AdminRegistrations";
import AdminAthleteCorrection from "./pages/admin/AdminAthleteCorrection";
import ScoringControl from "./pages/admin/ScoringControl";
import PublicFightDisplay from "./pages/public/PublicFightDisplay";
import ClubCompetitions from "./pages/club/ClubCompetitions";
import ClubCompetitionRegistration from "./pages/club/ClubCompetitionRegistration";
import ClubRegistrations from "./pages/club/ClubRegistrations";
import ClubAthleteImport from "./pages/club/ClubAthleteImport";
import ClubAthleteTransfer from "./pages/club/ClubAthleteTransfer";
import ClubDocuments from "./pages/club/ClubDocuments";

import "./assets/styles/ftjj-theme.css";
import "./assets/styles/app.css";
import "./assets/styles/production.css";

const admin = (element) => (
  <ProtectedRoute
    roles={[
      "SUPER_ADMIN",
      "FEDERATION_ADMIN",
      "COMPETITION_MANAGER",
      "MEDIA_MANAGER",
    ]}
  >
    {element}
  </ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/federation" element={<FederationPage />} />
            <Route path="/actualites" element={<NewsPage />} />
            <Route path="/medias" element={<MediaPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/espace-licencie" element={<LicensedSpacePage />} />
            <Route path="/affiliation" element={<ClubAffiliation />} />
            <Route path="/clubs" element={<PublicDirectory type="clubs" />} />
            <Route
              path="/athletes"
              element={<PublicDirectory type="athletes" />}
            />
            <Route
              path="/coaches"
              element={<PublicDirectory type="coaches" />}
            />
            <Route
              path="/referees"
              element={<PublicDirectory type="referees" />}
            />
            <Route path="/competitions" element={<Competitions />} />
            <Route path="/rankings" element={<Rankings />} />
            <Route path="/ranking" element={<Rankings />} />
            <Route path="/live" element={<Live />} />
            <Route path="/en-direct" element={<Live />} />
            <Route
              path="/admin"
              element={admin(<Navigate to="/admin/dashboard" replace />)}
            />

            {/* <Route path="/events" element={<NewsPage />} /> */}
            <Route
              path="/live/fight/:fightId/display"
              element={<PublicFightDisplay />}
            />
            <Route
              path="/admin/dashboard"
              element={admin(<AdminFederationModule module="dashboard" />)}
            />
            <Route
              path="/admin/homepage"
              element={admin(<AdminFederationModule module="homepage" />)}
            />
            <Route
              path="/admin/cms"
              element={admin(<Navigate to="/admin/homepage" replace />)}
            />
            <Route
              path="/admin/site-builder"
              element={admin(<Navigate to="/admin/homepage" replace />)}
            />
            <Route
              path="/admin/homepage-editor"
              element={admin(<Navigate to="/admin/homepage" replace />)}
            />
            <Route
              path="/admin/platform-settings"
              element={admin(<AdminFederationModule module="settings" />)}
            />
            <Route
              path="/admin/media-library"
              element={admin(<AdminMediaLibrary />)}
            />
            <Route
              path="/admin/events"
              element={admin(<AdminFederationModule module="events" />)}
            />
            <Route
              path="/admin/news"
              element={admin(<AdminFederationModule module="news" />)}
            />
            <Route
              path="/admin/affiliations"
              element={admin(<AdminAffiliationRequests />)}
            />
            <Route
              path="/admin/registrations"
              element={admin(<AdminRegistrations />)}
            />
            <Route
              path="/admin/transfers"
              element={admin(<AdminTransfers />)}
            />

            <Route
              path="/admin/competitions/operations"
              element={admin(<AdminCompetitionOperations />)}
            />
            <Route
              path="/admin/competitions/:competitionId/registrations"
              element={admin(<AdminFederationModule module="registrations" />)}
            />
            <Route
              path="/admin/competitions/:competitionId/categories"
              element={admin(<AdminFederationModule module="categories" />)}
            />
            <Route
              path="/admin/competitions/:competitionId/bracket-builder"
              element={admin(<AdminFederationModule module="brackets" />)}
            />
            <Route
              path="/admin/live-scoring/:sessionId/control"
              element={admin(<ScoringControl />)}
            />
            <Route
              path="/admin/scoring-settings"
              element={admin(
                <AdminFederationModule module="scoringSettings" />,
              )}
            />
            <Route
              path="/club/competitions"
              element={
                <ProtectedRoute roles={["CLUB_ADMIN", "COACH"]}>
                  <ClubCompetitions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/club/competitions/:competitionId/register"
              element={
                <ProtectedRoute roles={["CLUB_ADMIN", "COACH"]}>
                  <ClubCompetitionRegistration />
                </ProtectedRoute>
              }
            />
            <Route
              path="/club/registrations"
              element={
                <ProtectedRoute roles={["CLUB_ADMIN", "COACH"]}>
                  <ClubRegistrations />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/clubs"
              element={admin(<AdminResourcePage type="clubs" />)}
            />
            <Route
              path="/admin/athletes"
              element={admin(<AdminResourcePage type="athletes" />)}
            />
            <Route
              path="/admin/coaches"
              element={admin(<AdminResourcePage type="coaches" />)}
            />
            <Route
              path="/admin/referees"
              element={admin(<AdminResourcePage type="referees" />)}
            />
            <Route
              path="/admin/technicians"
              element={admin(<AdminResourcePage type="technicians" />)}
            />
            <Route
              path="/admin/competitions"
              element={admin(<AdminResourcePage type="competitions" />)}
            />
            <Route
              path="/admin/content-builder"
              element={admin(<AdminContentBuilder />)}
            />
            <Route path="/admin/documents" element={admin(<AdminUploads />)} />
            <Route
              path="/admin/payments"
              element={admin(<AdminResourcePage type="payments" />)}
            />
            <Route
              path="/admin/licenses"
              element={admin(<AdminResourcePage type="licenses" />)}
            />
            <Route
              path="/admin/live-scoring"
              element={admin(<AdminLiveScoring />)}
            />
            <Route
              path="/admin/audit"
              element={admin(<AdminResourcePage type="audit-logs" />)}
            />
            <Route
              path="/admin/settings"
              element={admin(
                <Navigate to="/admin/platform-settings" replace />,
              )}
            />
            <Route
              path="/admin/notifications"
              element={admin(<AdminNotifications />)}
            />
            <Route
              path="/club"
              element={
                <ProtectedRoute roles={["CLUB_ADMIN"]}>
                  <ClubDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/club/dashboard"
              element={
                <ProtectedRoute roles={["CLUB_ADMIN"]}>
                  <ClubDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/club/import"
              element={
                <ProtectedRoute
                  roles={["CLUB_ADMIN", "FEDERATION_ADMIN", "SUPER_ADMIN"]}
                >
                  <ClubAthleteImport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/club/transfer"
              element={
                <ProtectedRoute
                  roles={["CLUB_ADMIN", "FEDERATION_ADMIN", "SUPER_ADMIN"]}
                >
                  <ClubAthleteTransfer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/club/documents"
              element={
                <ProtectedRoute
                  roles={["CLUB_ADMIN", "FEDERATION_ADMIN", "SUPER_ADMIN"]}
                >
                  <ClubDocuments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/athlete-import"
              element={admin(<ClubAthleteImport />)}
            />
            <Route
              path="/athlete/dashboard"
              element={
                <ProtectedRoute roles={["ATHLETE"]}>
                  <MemberDashboard role="ATHLETE" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach/dashboard"
              element={
                <ProtectedRoute roles={["COACH"]}>
                  <MemberDashboard role="COACH" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/referee/dashboard"
              element={
                <ProtectedRoute roles={["REFEREE"]}>
                  <MemberDashboard role="REFEREE" />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
