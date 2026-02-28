import React, { useEffect, useState } from "react";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import { supabase } from "../../supabaseClient";
import {
    FaUserCircle,
    FaKey,
    FaFileAlt,
    FaInfoCircle,
    FaQuestionCircle,
} from "react-icons/fa";
import "./index.css";

function Settings() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeSection, setActiveSection] = useState(null);

    const [impedanceMargin, setImpedanceMargin] = useState("");
    const [puretoneMargin, setPuretoneMargin] = useState("");
    const [previewType, setPreviewType] = useState("impedance");
    const [isSaved, setIsSaved] = useState(false);

    const previewMargin =
        previewType === "impedance" ? impedanceMargin : puretoneMargin;

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from("report_layout_settings")
            .select("report_type, margin_top")
            .eq("user_id", user.id);

        if (data) {
            const imp = data.find((d) => d.report_type === "impedance");
            const pure = data.find((d) => d.report_type === "puretone");

            if (imp) setImpedanceMargin(imp.margin_top);
            if (pure) setPuretoneMargin(pure.margin_top);
        }
    };

    const handleSave = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return alert("User not logged in");

        const updates = [
            { user_id: user.id, report_type: "impedance", margin_top: Number(impedanceMargin) },
            { user_id: user.id, report_type: "puretone", margin_top: Number(puretoneMargin) },
        ];

        const { error } = await supabase
            .from("report_layout_settings")
            .upsert(updates, { onConflict: "user_id,report_type" });

        if (error) {
            alert("Failed to save ❌");
            setIsSaved(false);
        } else {
            setIsSaved(true); // ✅ mark as saved
        }
    };
    return (
        <div className="settings-main">
            <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

            <div className="layout">
                <Sidebar isOpen={isSidebarOpen} />

                <div
                    className={`settings-container ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"
                        }`}
                >

                    {/* LEFT MENU */}
                    <div className="settings-left">
                        <div className="settings-item" onClick={() => setActiveSection("profile")}>
                            <FaUserCircle /> <span>Profile Settings</span>
                        </div>

                        <div className="settings-item" onClick={() => setActiveSection("credentials")}>
                            <FaKey /> <span>Credentials Management</span>
                        </div>

                        <div className="settings-item" onClick={() => setActiveSection("layout")}>
                            <FaFileAlt /> <span>Report Layout Settings</span>
                        </div>

                        <div className="settings-item" onClick={() => setActiveSection("about")}>
                            <FaInfoCircle /> <span>About Us</span>
                        </div>

                        <div className="settings-item" onClick={() => setActiveSection("help")}>
                            <FaQuestionCircle /> <span>Help</span>
                        </div>
                    </div>

                    {/* RIGHT PANEL */}
                    <div className="settings-right">

                        {!activeSection && (
                            <p className="empty-text">Select a setting from the left menu</p>
                        )}



                        {(activeSection === "profile" || activeSection === "credentials" ||
                            activeSection === "about" ||
                            activeSection === "help") && (
                                <div className="settings-panel-small">
                                    <h3>{activeSection.toUpperCase()}</h3>
                                    <p>Section content coming soon...</p>
                                </div>
                            )}

                        {activeSection === "layout" && (
                            <div className="settings-panel-small">

                                <h3>Report Layout Settings</h3>

                                <table className="settings-table">
                                    <thead>
                                        <tr>
                                            <th>Report</th>
                                            <th>Margin Top (px)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Impedance</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={impedanceMargin}
                                                    onChange={(e) => {
                                                        setImpedanceMargin(e.target.value);
                                                        setIsSaved(false); // 👈 reset button back to "Save Settings"
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                        <tr>
                                            <td>Puretone</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    value={puretoneMargin}
                                                    onChange={(e) => {
                                                        setPuretoneMargin(e.target.value);
                                                        setIsSaved(false); // 👈 reset button back to "Save Settings"
                                                    }}
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="preview-selector">
                                    <label>Preview Type</label>
                                    <select
                                        value={previewType}
                                        onChange={(e) => setPreviewType(e.target.value)}
                                    >
                                        <option value="impedance">Impedance</option>
                                        <option value="puretone">Puretone</option>
                                    </select>
                                </div>

                                <div className="preview-page small-preview">
                                    <div
                                        className="preview-report-box"
                                        style={{ marginTop: `${previewMargin}px` }}
                                    >
                                        Sample {previewType} Report
                                    </div>
                                </div>

                                <button
                                    className={`save-btn ${isSaved ? "saved" : ""}`}
                                    onClick={handleSave}
                                >
                                    {isSaved ? "Saved ✓" : "Save Settings"}
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}

export default Settings;