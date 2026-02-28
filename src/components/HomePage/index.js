import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import Profile from "../ProfilePage";
import { supabase } from "../../supabaseClient";
import { LuEar } from "react-icons/lu";



function HomePage() {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // Redirect only if not on login page already
      if (!session && window.location.pathname !== "/") {
        navigate("/");
      }
    };

    checkSession();
  }, [navigate]); // ✅ empty deps → run once
  const handleViewReports = () => {
    setReportsLoading(true);

    setTimeout(() => {
      navigate("/reports");
    }, 500); // smooth UX
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    navigate("/");
  };

  return (
    <div className="hp-wrapper">
      {/* Navbar */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onProfileClick={() => setShowProfile(true)}
      />

      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onLogout={handleLogout} loading={loading} />

      {/* Main Content */}
      {/* Main Content */}
      {/* Main Content */}
      <div className="hp-main">
        {/* Hero Section */}
        <div className="hp-hero">
          <div className="hp-hero-text">
            <h1>Smart Hearing Tests & Clinical Reports</h1>
            <p>
              A modern audiology platform designed for doctors to perform accurate ear tests,
              generate instant reports, and manage patient hearing data with ease.
            </p>

            <div className="hp-hero-buttons">
              <button
                className="hp-btn-start"
                onClick={() => setIsSidebarOpen(true)}
              >
                Start New Test
              </button>

              <button
                className="hp-btn-learn"
                onClick={handleViewReports}
                disabled={reportsLoading}
              >
                {reportsLoading ? (
                  <LuEar className="animate-spin" size={18} />
                ) : (
                  "View Reports"
                )}
              </button>
            </div>
          </div>

          <div className="hp-hero-image">
            <iframe
              src="https://www.youtube.com/embed/Mwz3dU3Tl9M"
              title="Audiology Dashboard Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "12px"
              }}
            />
          </div>

        </div>

        {/* Features Section */}
        <div className="hp-features">
          <div className="hp-feature-card">
            <h3>🎧 Accurate Ear Tests</h3>
            <p>Perform Pure Tone Audiometry and impedance tests with clinical precision.</p>
          </div>

          <div className="hp-feature-card">
            <h3>📄 Instant Reports</h3>
            <p>Generate professional hearing reports ready for printing and sharing.</p>
          </div>

          <div className="hp-feature-card">
            <h3>👨‍⚕️ Doctor Friendly</h3>
            <p>Designed for daily clinical use with a simple and fast workflow.</p>
          </div>

          <div className="hp-feature-card">
            <h3>🔒 Secure Patient Data</h3>
            <p>Your patient records are stored safely with secure authentication.</p>
          </div>
        </div>
      </div>



      {/* Profile Popup */}
      {showProfile && <Profile onClose={() => setShowProfile(false)} />}
    </div>
  );
}

export default HomePage;
