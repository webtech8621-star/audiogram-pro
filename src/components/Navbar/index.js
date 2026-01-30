import React from "react";
import "./index.css";
import { LuEar } from "react-icons/lu";
import { IoNotificationsOutline } from "react-icons/io5";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { FaHome } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function Navbar({ onToggleSidebar, onProfileClick, profilePicture }) {
  const navigate = useNavigate();

  return (
    <div className="hp-navbar">
      <div className="hp-left">
        <span className="hp-menu-toggle" onClick={onToggleSidebar}>
          ☰
        </span>
        <div className="hp-logo">
          <LuEar className="hp-logo-icon" />
          <span className="hp-logo-text">AudiogramPro</span>
        </div>
      </div>

      <div className="hp-right">
        <div className="hp-icon-wrapper" onClick={() => navigate("/homepage")}>
          <FaHome className="hp-icon" />
          <span className="hp-icon-label">Home</span>
        </div>

        <div className="hp-icon-wrapper">
          <IoNotificationsOutline className="hp-icon" />
          <span className="hp-icon-label">Notifications</span>
        </div>

        <div className="hp-icon-wrapper">
          <AiOutlineQuestionCircle className="hp-icon" />
          <span className="hp-icon-label">About</span>
        </div>

        <div className="hp-icon-wrapper" onClick={onProfileClick}>
          <img
            src={profilePicture}
            alt="Profile"
            className="hp-profile-avatar"
            onError={(e) => (e.target.src = "https://i.pravatar.cc/40")}
          />
          <span className="hp-icon-label">Profile</span>
        </div>
      </div>
    </div>
  );
}

export default Navbar;