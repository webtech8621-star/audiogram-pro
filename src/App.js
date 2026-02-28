import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { supabase } from "./supabaseClient";

import LoginPage from "./components/LoginPage";
import SignUpPage from "./components/SignUpPage";
import ForgetPassword from "./components/ForgetPasswordPage";
import HomePage from "./components/HomePage";
import PuretoneAudiometry from "./components/PuretoneAudiometry";
import ImpedanceAudiometry from "./components/ImpedanceAudiometry";
import SavedReports from "./components/SavedReports";
import Settings from "./components/Settings"
import "./App.css";

// ── Protected Route ─────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) return null; // or loading spinner

  if (!session) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgetpassword" element={<ForgetPassword />} />

        {/* Protected */}
        <Route
          path="/homepage"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/puretoneaudiometry"
          element={
            <ProtectedRoute>
              <PuretoneAudiometry />
            </ProtectedRoute>
          }
        />

        <Route
          path="/puretoneaudiometry/:sessionId"
          element={
            <ProtectedRoute>
              <PuretoneAudiometry />
            </ProtectedRoute>
          }
        />

        <Route
          path="/impedanceaudiometry"
          element={
            <ProtectedRoute>
              <ImpedanceAudiometry />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <SavedReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        {/* Report format selector is usually a modal — not a page */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;