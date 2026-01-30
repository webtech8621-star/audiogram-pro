import React, { useState, useEffect } from "react";
import "./index.css";
import {
  FaIdCard,
  FaMicroscope,
  FaEnvelope,
  FaLock,
  FaChevronRight,
  FaSignOutAlt,
  FaCamera,
} from "react-icons/fa";

function Profile({ onClose, profilePicture, onProfilePictureChange }) {
  const [activeTab, setActiveTab] = useState("personal");

  // Local preview while popup is open
  const [previewUrl, setPreviewUrl] = useState(profilePicture);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = URL.createObjectURL(file);
    setPreviewUrl(imageUrl);
    onProfilePictureChange(imageUrl); // updates Navbar too

    // In real app → upload file to server here and get permanent URL
    // Example:
    // uploadImage(file).then((serverUrl) => {
    //   onProfilePictureChange(serverUrl);
    //   setPreviewUrl(serverUrl);
    // });
  };

  // Cleanup blob URLs when component unmounts or picture changes
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // ────────────────────────────────────────────────
  // Form states (your original fields)
  // ────────────────────────────────────────────────
  const [personalInfo, setPersonalInfo] = useState({
    fullName: "",
    age: "",
    dob: "",
    title: "",
    gender: "",
  });

  const [audiologyInfo, setAudiologyInfo] = useState({
    specialization: "",
    experience: "",
    affiliation: "",
    license: "",
    otherAffiliations: "",
    membership: "",
    expertise: "",
  });

  const [contactInfo, setContactInfo] = useState({
    email: "",
    phone: "",
    clinicAddress: "",
    website: "",
  });

  const [securityInfo, setSecurityInfo] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const handlePersonalChange = (e) => {
    const { name, value } = e.target;
    setPersonalInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleAudiologyChange = (e) => {
    const { name, value } = e.target;
    setAudiologyInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleSecurityChange = (e) => {
    const { name, value } = e.target;
    setSecurityInfo((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="profile-popup-overlay" onClick={onClose}>
      <div className="profile-popup" onClick={(e) => e.stopPropagation()}>
        {/* Top-right mini header */}
        <div className="profile-header-container">
          <div className="profile-header-info">
            <span className="profile-header-name">Dr. Dileep Raju</span>
            <img
              src={previewUrl}
              alt="Profile"
              className="profile-header-avatar"
              onError={(e) => (e.target.src = "https://via.placeholder.com/40")}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="profile-sidebar">
          <div className="profile-sidebar-header">
            <div className="avatar-upload-wrapper">
              <img
                src={previewUrl}
                alt="Profile"
                className="profile-avatar-big"
              />
              <label className="avatar-upload-btn" htmlFor="profile-pic-upload">
                <FaCamera />
              </label>
              <input
                id="profile-pic-upload"
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleImageChange}
              />
            </div>
            <div className="profile-name">Dr. Dileep Raju</div>
          </div>

          <ul className="profile-sidebar-menu">
            <li
              className={activeTab === "personal" ? "active" : ""}
              onClick={() => setActiveTab("personal")}
            >
              <span className="list-item-content">
                <FaIdCard className="icon" /> Personal Info
              </span>
              <FaChevronRight className="chevron-icon" />
            </li>
            <li
              className={activeTab === "audiology" ? "active" : ""}
              onClick={() => setActiveTab("audiology")}
            >
              <span className="list-item-content">
                <FaMicroscope className="icon" /> Audiology Details
              </span>
              <FaChevronRight className="chevron-icon" />
            </li>
            <li
              className={activeTab === "email" ? "active" : ""}
              onClick={() => setActiveTab("email")}
            >
              <span className="list-item-content">
                <FaEnvelope className="icon" /> Email Management
              </span>
              <FaChevronRight className="chevron-icon" />
            </li>
            <li
              className={activeTab === "security" ? "active" : ""}
              onClick={() => setActiveTab("security")}
            >
              <span className="list-item-content">
                <FaLock className="icon" /> Account Security
              </span>
              <FaChevronRight className="chevron-icon" />
            </li>
          </ul>

          <button className="logout-btn">
            <FaSignOutAlt className="logout-icon" /> Log Out
          </button>
        </div>

        {/* Main content area */}
        <div className="profile-main">
          <h2>Dr. Dileep Raju's Profile</h2>

          {activeTab === "personal" && (
            <div className="profile-section">
              <div className="section-header">
                <h3>Personal Information</h3>
                <FaIdCard className="edit-icon" />
              </div>
              <div className="profile-details-grid">
                <div>
                  <strong>Full Name</strong>
                  <input
                    type="text"
                    name="fullName"
                    value={personalInfo.fullName}
                    onChange={handlePersonalChange}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <strong>Age</strong>
                  <input
                    type="number"
                    name="age"
                    value={personalInfo.age}
                    onChange={handlePersonalChange}
                    placeholder="Enter age"
                  />
                </div>
                <div>
                  <strong>Date of Birth</strong>
                  <input
                    type="date"
                    name="dob"
                    value={personalInfo.dob}
                    onChange={handlePersonalChange}
                  />
                </div>
                <div>
                  <strong>Title</strong>
                  <input
                    type="text"
                    name="title"
                    value={personalInfo.title}
                    onChange={handlePersonalChange}
                    placeholder="Enter your title"
                  />
                </div>
                <div>
                  <strong>Gender</strong>
                  <select
                    name="gender"
                    value={personalInfo.gender}
                    onChange={handlePersonalChange}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <button className="update-btn">Save Personal Info</button>
            </div>
          )}

          {activeTab === "audiology" && (
            <div className="profile-section">
              <div className="section-header">
                <h3>Audiology Information</h3>
                <FaMicroscope className="edit-icon" />
              </div>
              <div className="profile-details-grid">
                <div>
                  <strong>Specialization</strong>
                  <input
                    type="text"
                    name="specialization"
                    value={audiologyInfo.specialization}
                    onChange={handleAudiologyChange}
                    placeholder="Enter specialization"
                  />
                </div>
                <div>
                  <strong>Year of Experience</strong>
                  <input
                    type="number"
                    name="experience"
                    value={audiologyInfo.experience}
                    onChange={handleAudiologyChange}
                    placeholder="Enter years of experience"
                  />
                </div>
                <div>
                  <strong>Affiliation</strong>
                  <input
                    type="text"
                    name="affiliation"
                    value={audiologyInfo.affiliation}
                    onChange={handleAudiologyChange}
                    placeholder="Enter affiliation"
                  />
                </div>
                <div>
                  <strong>License Number</strong>
                  <input
                    type="text"
                    name="license"
                    value={audiologyInfo.license}
                    onChange={handleAudiologyChange}
                    placeholder="Enter license number"
                  />
                </div>
                <div>
                  <strong>Other Affiliations</strong>
                  <input
                    type="text"
                    name="otherAffiliations"
                    value={audiologyInfo.otherAffiliations}
                    onChange={handleAudiologyChange}
                    placeholder="Enter other affiliations"
                  />
                </div>
                <div>
                  <strong>Membership</strong>
                  <input
                    type="text"
                    name="membership"
                    value={audiologyInfo.membership}
                    onChange={handleAudiologyChange}
                    placeholder="Enter membership"
                  />
                </div>
                <div className="full-width">
                  <strong>Area of Expertise</strong>
                  <input
                    type="text"
                    name="expertise"
                    value={audiologyInfo.expertise}
                    onChange={handleAudiologyChange}
                    placeholder="Enter areas of expertise"
                  />
                </div>
              </div>
              <button className="update-btn">Save Audiology Info</button>
            </div>
          )}

          {activeTab === "email" && (
            <div className="profile-section">
              <div className="section-header">
                <h3>Email & Communication Preferences</h3>
                <FaEnvelope className="edit-icon" />
              </div>
              <div className="profile-details-grid">
                <div>
                  <strong>Current Email</strong>
                  <input
                    type="email"
                    name="email"
                    value={contactInfo.email}
                    onChange={handleContactChange}
                    placeholder="Enter current email"
                  />
                </div>
                <div>
                  <strong>Phone</strong>
                  <input
                    type="tel"
                    name="phone"
                    value={contactInfo.phone}
                    onChange={handleContactChange}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="full-width">
                  <strong>Clinic Address</strong>
                  <input
                    type="text"
                    name="clinicAddress"
                    value={contactInfo.clinicAddress}
                    onChange={handleContactChange}
                    placeholder="Enter clinic address"
                  />
                </div>
                <div>
                  <strong>Website</strong>
                  <input
                    type="url"
                    name="website"
                    value={contactInfo.website}
                    onChange={handleContactChange}
                    placeholder="Enter website"
                  />
                </div>
                <div className="full-width">
                  <input type="checkbox" id="update-email" />
                  <label htmlFor="update-email">
                    I'd like to receive important updates and health news.
                  </label>
                </div>
              </div>
              <button className="update-btn">Update Details</button>
            </div>
          )}

          {activeTab === "security" && (
            <>
              <div className="profile-section">
                <div className="section-header">
                  <h3>Account Security</h3>
                  <FaLock className="edit-icon" />
                </div>
                <div className="profile-details-grid">
                  <div>
                    <strong>Current Password</strong>
                    <input
                      type="password"
                      name="currentPassword"
                      value={securityInfo.currentPassword}
                      onChange={handleSecurityChange}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <strong>New Password</strong>
                    <input
                      type="password"
                      name="newPassword"
                      value={securityInfo.newPassword}
                      onChange={handleSecurityChange}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <strong>Confirm New Password</strong>
                    <input
                      type="password"
                      name="confirmNewPassword"
                      value={securityInfo.confirmNewPassword}
                      onChange={handleSecurityChange}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <button className="change-password-btn">Change Password</button>
              </div>

              <div className="delete-account-section">
                <div className="delete-account-content">
                  <h4>Delete Account</h4>
                  <p>Permanently remove your account and all associated data.</p>
                </div>
                <button className="delete-btn">Delete Account</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Profile;