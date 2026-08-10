import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Questionnaire from "./pages/Questionnaire";
import CreateEntreprise from "./pages/CreateEntreprise";
import CreateEmploye from "./pages/CreateEmploye";
import EntrepriseDetail from "./pages/EntrepriseDetail";

function RequireAuth({ children }) {
  const { token, loadingUser } = useAuth();
  if (loadingUser) return null;
  if (!token) return <Navigate to="/connexion" replace />;
  return children;
}

function RequireRole({ roles, children }) {
  const { user, loadingUser } = useAuth();
  if (loadingUser) return null;
  if (!user) return <Navigate to="/connexion" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/tableau-de-bord" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/connexion" element={<Login />} />
          <Route
            path="/tableau-de-bord"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/questionnaire"
            element={
              <RequireAuth>
                <Questionnaire />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/nouvelle-entreprise"
            element={
              <RequireAuth>
                <RequireRole roles={["super_admin"]}>
                  <CreateEntreprise />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/entreprises/:id"
            element={
              <RequireAuth>
                <RequireRole roles={["super_admin"]}>
                  <EntrepriseDetail />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route
            path="/drh/nouvel-employe"
            element={
              <RequireAuth>
                <RequireRole roles={["drh"]}>
                  <CreateEmploye />
                </RequireRole>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/connexion" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
