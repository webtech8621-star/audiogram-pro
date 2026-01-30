import React, { useState, useEffect } from "react";
import "./index.css";
import { LuEar } from "react-icons/lu";
import { FaRegUser } from "react-icons/fa";
import { GoLock } from "react-icons/go";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient"; // ✅ connect Supabase

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false); // ✅ loader
  const navigate = useNavigate();

  // ✅ If already logged in, redirect to homepage
  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        navigate("/homepage");
      }
    };

    checkSession();
  }, [navigate]);

  // ✅ Login handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("Invalid credentials ❌");
    } else {
      setMessage("Login successful ✅");
      navigate("/homepage");
    }

    setLoading(false);
  };

  return (
    <div className="lp-wrapper">
      <div className="lp-card">
        {/* Title */}
        <h1 className="lp-title">
          <span className="lp-ear-icon">
            <LuEar className="lp-logo-icon" />
          </span>
          Welcome To Audiogram Pro
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="lp-form-group">
            <label>Email</label>
            <div className="lp-input-box">
              <FaRegUser className="lp-input-icon" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="lp-form-group">
            <label>Password</label>
            <div className="lp-input-box">
              <GoLock className="lp-input-icon" />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Login button */}
          <button
            type="submit"
            className="lp-btn-signin"
            style={{ color: "black" }}
            disabled={loading}
          >
            {loading ? (
              <LuEar className="animate-spin" size={20} />
            ) : (
              "Login"
            )}
          </button>
        </form>

        {/* Show login status */}
        {message && (
          <p style={{ color: "red", marginTop: "10px" }}>{message}</p>
        )}

        {/* Extra Links */}
        <div className="lp-extra-links">
          <p>
            Don’t have an account?{" "}
            <Link to="/signup">Sign Up Here</Link>
          </p>
          <p>
            <Link to="/forgetpassword">Forgot your password?</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
