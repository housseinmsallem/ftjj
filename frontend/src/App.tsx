import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import AdminLayout from "./components/layout/AdminLayout";
import ClubLayout from "./components/layout/ClubLayout";

// --- Public pages ---
import Home from "./pages/Home";
import Login from "./pages/Login";
import Competitions from "./pages/Competitions";
import Rankings from "./pages/Rankings";
import Live from "./pages/Live";
import FederationPage from "./pages/FederationPage";
import NewsPage from "./pages/NewsPage";
import MediaPage from "./pages/MediaPage";
import ContactPage from "./pages/ContactPage";
import LicensedSpacePage from "./pages/LicensedSpacePage";
import PublicDirectory from "./pages/PublicDirectory";
import ClubAffiliation from "./pages/ClubAffiliation";
import RefereeRegister from "./pages/RefereeRegister";
import RefereeDashboard from "./pages/RefereeDashboard";
import PublicFightDisplay from "./pages/public/PublicFightDisplay";
import SpectatorWindow from "./pages/public/SpectatorWindow";
import IdentiteFederale from "./pages/IdentiteFederale";
import AthleteExport from "./pages/AthleteExport";
import ScoringPage from "./pages/ScoringPage";
import SpectatorPage from "./pages/SpectatorPage";
import BracketModeration from "./pages/BracketModeration";
import CompetitionDetail from "./pages/CompetitionDetail";

// --- Admin pages ---
import AdminFederationModule from "./pages/admin/AdminFederationModule";
import AdminMediaLibrary from "./pages/AdminMediaLibrary";
import AdminResourcePage from "./pages/AdminResourcePage";
import AdminContentBuilder from "./pages/AdminContentBuilder";
import AdminNotifications from "./pages/AdminNotifications";
import AdminUploads from "./pages/AdminUploads";
import AdminLiveScoring from "./pages/AdminLiveScoring";
import AdminCompetitionOperations from "./pages/admin/AdminCompetitionOperations";
import AdminAffiliationRequests from "./pages/admin/AdminAffiliationRequests";
import AdminTransfers from "./pages/admin/AdminTransfers";
import AdminRegistrations from "./pages/admin/AdminRegistrations";
import AdminAthleteCorrection from "./pages/admin/AdminAthleteCorrection";
import ScoringControl from "./pages/admin/ScoringControl";
import ClubsManagement from "./pages/admin/ClubsManagement";
import AthletesManagement from "./pages/admin/AthletesManagement";
import CoachesManagement from "./pages/admin/CoachesManagement";
import RefereesManagement from "./pages/admin/RefereesManagement";
import TechniciansManagement from "./pages/admin/TechniciansManagement";
import LicensesManagement from "./pages/admin/LicensesManagement";
import CompetitionsManagement from "./pages/admin/CompetitionsManagement";
import AdminSeasons from "./pages/admin/AdminSeasons";
import CsvImport from "./pages/admin/CsvImport";
import LiveMatchControl from "./pages/admin/LiveMatchControl";
import CmsDashboard from "./pages/admin/CmsDashboard";

// --- Club Owner pages ---
import ClubDashboard from "./pages/ClubDashboard";
import ClubCompetitions from "./pages/club/ClubCompetitions";
import ClubCompetitionRegistration from "./pages/club/ClubCompetitionRegistration";
import ClubRegistrations from "./pages/club/ClubRegistrations";
import ClubAthleteImport from "./pages/club/ClubAthleteImport";
import ClubAthleteTransfer from "./pages/club/ClubAthleteTransfer";
import ClubDocuments from "./pages/club/ClubDocuments";
import ClubDetails from "./pages/club/ClubDetails";
import ClubAthletes from "./pages/club/ClubAthletes";
import ClubCoaches from "./pages/club/ClubCoaches";
import ClubReferees from "./pages/club/ClubReferees";
import ClubTechnicians from "./pages/club/ClubTechnicians";
import ClubLicenses from "./pages/club/ClubLicenses";
import ClubImport from "./pages/club/ClubImport";

// --- Member pages ---
import MemberDashboard from "./pages/MemberDashboard";

import ProtectedRoute from "./routes/ProtectedRoute";

import "./assets/styles/ftjj-theme.css";
import "./assets/styles/app.css";
import "./assets/styles/production.css";

// Role wrappers — backend returns ADMIN and CLUB_OWNER
const adminRoute = (element: React.ReactElement): React.ReactElement => (
  <ProtectedRoute roles={["ADMIN"]}>
    <AdminLayout>{element}</AdminLayout>
  </ProtectedRoute>
);

const clubRoute = (element: React.ReactElement): React.ReactElement => (
  <ProtectedRoute roles={["CLUB_OWNER"]}>
    <ClubLayout>{element}</ClubLayout>
  </ProtectedRoute>
);

const authenticatedRoute = (
  element: React.ReactElement,
): React.ReactElement => (
  <ProtectedRoute
    roles={["ADMIN", "CLUB_OWNER", "ATHLETE", "COACH", "REFEREE"]}
  >
    {element}
  </ProtectedRoute>
);

function AppRoutes(): React.ReactElement {
  const location = useLocation();
  const isSpectator = location.pathname.startsWith("/scoring/spectator");

  return (
    <>
      {/* Layout-free routes (spectator, etc.) */}
      <Routes>
        <Route path="/scoring/spectator" element={<SpectatorPage />} />

      </Routes>
      {!isSpectator && <Header />}
      {!isSpectator && (
        <main>
          <Routes>
            {/* ========== PUBLIC ========== */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/federation" element={<FederationPage />} />
            <Route path="/actualites" element={<NewsPage />} />
            <Route path="/medias" element={<MediaPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/espace-licencie" element={<LicensedSpacePage />} />
            <Route path="/affiliation" element={<ClubAffiliation />} />
            <Route path="/arbitre/inscription" element={<RefereeRegister />} />
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
            <Route path="/en-direct/:competitionId" element={<CompetitionDetail />} />
            <Route path="/fight/:fightId" element={<PublicFightDisplay />} />
            <Route path="/spectator/:matchId" element={<SpectatorWindow />} />
            <Route path="/scoring" element={<ScoringPage />} />
            <Route path="/moderate/brackets/:competitionId" element={<BracketModeration />} />
            <Route
              path="/identite-federale/:personId"
              element={<IdentiteFederale />}
            />

            {/* ========== ADMIN ========== */}
            <Route
              path="/admin"
              element={adminRoute(<AdminFederationModule />)}
            />
            <Route
              path="/admin/dashboard"
              element={adminRoute(<AdminFederationModule />)}
            />
            <Route
              path="/admin/federation"
              element={adminRoute(<AdminFederationModule />)}
            />
            <Route
              path="/admin/media"
              element={adminRoute(<AdminMediaLibrary />)}
            />
            <Route
              path="/admin/resources"
              element={adminRoute(<AdminResourcePage />)}
            />
            <Route
              path="/admin/content"
              element={adminRoute(<AdminContentBuilder />)}
            />
            <Route
              path="/admin/notifications"
              element={adminRoute(<AdminNotifications />)}
            />
            <Route
              path="/admin/uploads"
              element={adminRoute(<AdminUploads />)}
            />

            <Route
              path="/admin/competitions/operations"
              element={adminRoute(<AdminCompetitionOperations />)}
            />
            <Route
              path="/admin/affiliations"
              element={adminRoute(<AdminAffiliationRequests />)}
            />
            <Route
              path="/admin/transfers"
              element={adminRoute(<AdminTransfers />)}
            />
            <Route
              path="/admin/registrations"
              element={adminRoute(<AdminRegistrations />)}
            />
            <Route
              path="/admin/athletes/correction"
              element={adminRoute(<AdminAthleteCorrection />)}
            />
            <Route
              path="/admin/scoring"
              element={adminRoute(<ScoringPage />)}
            />
            <Route
              path="/admin/clubs"
              element={adminRoute(<ClubsManagement />)}
            />
            <Route
              path="/admin/athletes"
              element={adminRoute(<AthletesManagement />)}
            />
            <Route
              path="/admin/coaches"
              element={adminRoute(<CoachesManagement />)}
            />
            <Route
              path="/admin/referees"
              element={adminRoute(<RefereesManagement />)}
            />
            <Route
              path="/admin/technicians"
              element={adminRoute(<TechniciansManagement />)}
            />
            <Route
              path="/admin/licenses"
              element={adminRoute(<LicensesManagement />)}
            />
            <Route
              path="/admin/competitions"
              element={adminRoute(<CompetitionsManagement />)}
            />
            <Route
              path="/admin/seasons"
              element={adminRoute(<AdminSeasons />)}
            />
            <Route path="/admin/import" element={adminRoute(<CsvImport />)} />
            <Route
              path="/admin/export"
              element={adminRoute(<AthleteExport />)}
            />

            <Route path="/admin/cms" element={adminRoute(<CmsDashboard />)} />

            {/* ========== CLUB OWNER ========== */}
            <Route path="/club" element={clubRoute(<ClubDashboard />)} />
            <Route
              path="/club/dashboard"
              element={clubRoute(<ClubDashboard />)}
            />
            <Route
              path="/club/competitions"
              element={clubRoute(<ClubCompetitions />)}
            />
            <Route
              path="/club/competitions/:id/register"
              element={clubRoute(<ClubCompetitionRegistration />)}
            />
            <Route
              path="/club/registrations"
              element={clubRoute(<ClubRegistrations />)}
            />
            <Route
              path="/club/athletes/import"
              element={clubRoute(<ClubAthleteImport />)}
            />
            <Route
              path="/club/athletes/transfer"
              element={clubRoute(<ClubAthleteTransfer />)}
            />
            <Route
              path="/club/documents"
              element={clubRoute(<ClubDocuments />)}
            />
            <Route path="/club/details" element={clubRoute(<ClubDetails />)} />
            <Route
              path="/club/athletes"
              element={clubRoute(<ClubAthletes />)}
            />
            <Route path="/club/coaches" element={clubRoute(<ClubCoaches />)} />
            <Route
              path="/club/referees"
              element={clubRoute(<ClubReferees />)}
            />
            <Route
              path="/club/technicians"
              element={clubRoute(<ClubTechnicians />)}
            />
            <Route
              path="/club/licenses"
              element={clubRoute(<ClubLicenses />)}
            />
            <Route path="/club/import" element={clubRoute(<ClubImport />)} />
            <Route path="/club/export" element={clubRoute(<AthleteExport />)} />

            {/* ========== MEMBER (athlete/coach/referee) ========== */}
            <Route
              path="/member/dashboard"
              element={authenticatedRoute(<MemberDashboard role="" />)}
            />
            <Route
              path="/athlete/dashboard"
              element={authenticatedRoute(<MemberDashboard role="ATHLETE" />)}
            />
            <Route
              path="/coach/dashboard"
              element={authenticatedRoute(<MemberDashboard role="COACH" />)}
            />
            <Route
              path="/referee/dashboard"
              element={authenticatedRoute(<RefereeDashboard />)}
            />

            {/* ========== FALLBACK ========== */}
            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      )}
      {!isSpectator && <Footer />}
    </>
  );
}

export default function App(): React.ReactElement {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
