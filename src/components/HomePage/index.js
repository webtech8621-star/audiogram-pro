import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import Profile from "../ProfilePage";
import { supabase } from "../../supabaseClient";

function HomePage() {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();

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
      <div className="hp-main">
        <div className="hp-hero">
          <div className="hp-hero-text">
            <h2>
              Experience Precision <br /> Hearing Tests, Simplified.
            </h2>
            <p>
              Advanced audiology technology designed for accuracy and ease.
              Understand your hearing health with professional-grade diagnostics
              and insightful reports.
            </p>
            <div className="hp-hero-buttons">
              <button className="hp-btn-start" onClick={() => navigate("/puretone")}>
                Get Started
              </button>
              <button className="hp-btn-learn">Learn More</button>
            </div>
          </div>
          <div className="hp-hero-image">{/* Placeholder */}</div>
        </div>
      </div>

      {/* Profile Popup */}
      {showProfile && <Profile onClose={() => setShowProfile(false)} />}
    </div>
  );
}

export default HomePage;
