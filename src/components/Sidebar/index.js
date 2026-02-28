import React, { useState } from "react";
import "./index.css";
import { useRef, useEffect } from "react";
import {
  FaCog,
  FaFileAlt,
  FaChevronDown,
  FaFolder,
  FaUserMd,
} from "react-icons/fa";
import { IoLogOutSharp } from "react-icons/io5";
import { LuEar } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import AudiologistDetailsSettings from "../AudiologistDetailsSettings";

function Sidebar({ isOpen, onLogout, loading, onClose }) {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const sidebarRef = useRef(null);

  const handleNavigateWithLoader = (path) => {
    setNavLoading(true);

    // Small delay so loader is visible
    setTimeout(() => {
      navigate(path);
      setNavLoading(false);
    }, 400);
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        onClose && onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);
  return (
    <>
      <div className={`hp-sidebar ${isOpen ? "open" : ""}`}>
        {/* Audiologist Details */}
        <div className="hp-menu-item" onClick={() => setIsModalOpen(true)}>
          <FaUserMd className="hp-menu-icon" />
          Audiologist Details
        </div>

        <div className="hp-menu-item" onClick={() => navigate("/settings")}>
          <FaCog className="hp-menu-icon" />
          Settings
        </div>

        <div className="hp-menu-item hp-dropdown">
          <span>
            <FaFileAlt className="hp-menu-icon" />
            Tests
          </span>
          <FaChevronDown className="hp-dropdown-icon" />
        </div>

        {/* SUB MENU */}
        <div className="hp-submenu">
          <p onClick={() => handleNavigateWithLoader("/puretoneaudiometry")}>
            {navLoading ? (
              <LuEar className="animate-spin" size={20} />
            ) : (
              "Pure Tone Audiometry"
            )}
          </p>

          <p onClick={() => navigate("/impedanceaudiometry")}>
            Impedance Audiometry
          </p>
        </div>

        <div className="hp-menu-item" onClick={() => navigate("/reports")}>
          <FaFolder className="hp-menu-icon" />
          Saved Reports
        </div>

        <div className="hp-menu-item" onClick={onLogout}>
          {loading ? (
            <LuEar className="animate-spin" size={18} />
          ) : (
            <>
              <IoLogOutSharp style={{ marginRight: "6px", fontSize: "22px" }} />
              Logout
            </>
          )}
        </div>
      </div>

      {isModalOpen && (
        <AudiologistDetailsSettings onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}

export default Sidebar;
