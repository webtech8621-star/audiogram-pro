import React, { useState } from "react";
import "./index.css";
import { LuEar } from "react-icons/lu";
import { GoLock } from "react-icons/go";
import { MdOutlineMail } from "react-icons/md";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient"; // ✅ Supabase for signup

function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false); // ✅ loader
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "http://localhost:3000/login",
      },
    });

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Sign up successful ✅ Please login");
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="su-wrapper">
      <div className="su-card">
        <h1 className="su-title">
          <LuEar className="su-logo-icon" />
          Audiogram Pro
        </h1>
        <p className="su-subtext">
          Create your account to start using our professional audiogram tools.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="su-form-group">
            <label>Email</label>
            <div className="su-input-box">
              <MdOutlineMail className="su-input-icon" />
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="emial-input-su"
              />
            </div>
          </div>

          {/* Password */}
          <div className="su-form-group">
            <label>Password</label>
            <div className="su-input-box">
              <GoLock className="su-input-icon" />
              <input
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="emial-input-su"
              />
            </div>
          </div>

          {/* Sign Up button */}
          <button type="submit" className="su-btn-signup" disabled={loading}>
            {loading ? <LuEar className="animate-spin" size={20} /> : "Sign Up"}
          </button>
        </form>

        {message && <p style={{ color: "red", marginTop: "10px" }}>{message}</p>}

        <div className="su-signin-link">
          <p>
            Already have an account? <Link to="/">Sign In Here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUpPage;
