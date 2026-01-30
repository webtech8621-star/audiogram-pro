import React, { useState } from "react";
import "./index.css";
import { LuEar } from "react-icons/lu";
import { FaEnvelope } from "react-icons/fa";
import { Link } from "react-router-dom";
import { supabase } from "../../supabaseClient";

function ForgetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password",
    });

    if (error) {
      setMessage(`❌ ${error.message}`);
    } else {
      setMessage("📧 Password reset link sent. Please check your email.");
    }

    setLoading(false);
  };

  return (
    <div className="fp-wrapper">
      <div className="fp-card">
        {/* Header */}
        <h1 className="fp-title">
          <LuEar className="fp-logo-icon" />
          Audiogram Pro
        </h1>

        <p className="fp-subtext">
          Enter your registered email to reset your password.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="fp-form-group">
            <label>Email</label>
            <div className="fp-input-box">
              <FaEnvelope className="fp-input-icon" />
              <input
                className="fp-input"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="fp-btn-reset"
            disabled={loading}
          >
            {loading ? "Sending..." : "Reset Password"}
          </button>
        </form>

        {/* Message */}
        {message && (
          <p
            style={{
              marginTop: "12px",
              color: message.startsWith("📧") ? "green" : "red",
              fontWeight: "500",
            }}
          >
            {message}
          </p>
        )}

        {/* Links */}
        <div className="fp-signin-link">
          <p>
            Remember your password?{" "}
            <Link to="/">Sign In Here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgetPassword;
