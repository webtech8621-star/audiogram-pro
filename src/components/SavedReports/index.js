import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import { supabase } from "../../supabaseClient";
import { LuEar } from "react-icons/lu";
import "./index.css";

function SavedReports() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [reports, setReports] = useState([]);
    const [filteredReports, setFilteredReports] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    // POPUP STATES
    const [showPopup, setShowPopup] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [popupSessions, setPopupSessions] = useState([]);

    const navigate = useNavigate();

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            // FETCH SESSIONS
            const { data: sessionsData, error } = await supabase
                .from("sessions")
                .select("id, patient_id, session_type, created_at, status")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            if (!sessionsData || sessionsData.length === 0) {
                setReports([]);
                setFilteredReports([]);
                setLoading(false);
                return;
            }

            const patientIds = [...new Set(sessionsData.map((s) => s.patient_id))];

            // FETCH PATIENT DETAILS INCLUDING LOCATION
            const { data: patients, error: patientError } = await supabase
                .from("patients")
                .select("id, name, age, patient_id, location")
                .in("id", patientIds);

            if (patientError) throw patientError;

            const grouped = sessionsData.reduce((acc, session) => {
                const pid = session.patient_id;

                if (!acc[pid]) {
                    const patient = patients.find((p) => p.id === pid) || {};

                    acc[pid] = {
                        patientId: pid,
                        name: patient.name || "Unknown",
                        age: patient.age || "-",
                        location: patient.location || "No Location",
                        patientIdDisplay:
                            patient.patient_id || pid.substring(0, 8),
                        sessions: [],
                    };
                }

                acc[pid].sessions.push({
                    sessionId: session.id,
                    testType: session.session_type || "Unknown",
                    date: new Date(session.created_at).toLocaleString(),
                    status: session.status,
                });

                return acc;
            }, {});

            // CONVERT TO ARRAY AND ADD LATEST DATE FOR MAIN TABLE
            const formatted = Object.values(grouped).map((group) => {
                return {
                    ...group,
                    latestDate:
                        group.sessions.length > 0
                            ? group.sessions[0].date
                            : "No Sessions",
                };
            });

            setReports(formatted);
            setFilteredReports(formatted);
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        const value = e.target.value.toLowerCase();
        setSearchTerm(value);

        const filtered = reports.filter((r) =>
            r.name.toLowerCase().includes(value)
        );

        setFilteredReports(filtered);
    };

    const handleSessionClick = (group, session) => {
        let path = "/puretoneaudiometry";

        if (session.testType.toLowerCase().includes("impedance")) {
            path = "/impedanceaudiometry";
        }

        navigate(path, {
            state: {
                patientId: group.patientId,
                sessionId: session.sessionId,
                loadExistingData: true,
            },
        });
    };

    const openPopup = (e, group) => {
        e.stopPropagation();

        setSelectedPatient(group);
        setPopupSessions(group.sessions);
        setShowPopup(true);
    };

    const closePopup = () => {
        setShowPopup(false);
        setSelectedPatient(null);
        setPopupSessions([]);
    };

    // LOADER SCREEN
    if (loading) {
        return (
            <div className="saved-reports-main">
                <Navbar
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                />
                <div className="layout">
                    <Sidebar isOpen={isSidebarOpen} />

                    <div className="content">
                        <div className="icon-loader-container">
                            <LuEar className="icon-loader" />
                            <p className="loader-text">Loading Reports...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="saved-reports-main">
            <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <div className="layout">
                <Sidebar isOpen={isSidebarOpen} />

                <div className="content">
                    <input
                        className="search-bar"
                        placeholder="Search patient..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />

                    <table className="reports-table">
                        <thead>
                            <tr>
                                <th>S.n.o</th>
                                <th>Name</th>
                                <th>Age</th>
                                <th>Patient ID</th>
                                <th>Location</th>
                                <th>Latest Date</th>
                                <th>Sessions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredReports.map((group, i) => (
                                <tr
                                    key={group.patientId}
                                    className="patient-row"
                                >
                                    <td>{i + 1}</td>

                                    <td
                                        className="patient-name-link"
                                        onClick={(e) => openPopup(e, group)}
                                    >
                                        {group.name}
                                    </td>

                                    <td>{group.age}</td>

                                    <td>{group.patientIdDisplay}</td>

                                    <td className="address-cell">
                                        {group.location}
                                    </td>

                                    <td>{group.latestDate}</td>

                                    <td>{group.sessions.length}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* POPUP SECTION */}
                    {showPopup && (
                        <div className="popup-overlay">
                            <div className="popup-container">
                                <div className="popup-header">
                                    <div className="icon-header-cont">
                                        <LuEar className="pt-logo-icon" />
                                        <h1 className="pt-logo-icon">
                                            AudiogramPro
                                        </h1>
                                    </div>

                                    <button
                                        className="close-btn"
                                        onClick={closePopup}
                                    >
                                        X
                                    </button>
                                </div>

                                {popupSessions.length === 0 ? (
                                    <p>No sessions available</p>
                                ) : (
                                    <div className="popup-body">
                                        <table className="reports-table">
                                            <thead>
                                                <tr>
                                                    <th>Type</th>
                                                    <th>Date</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {popupSessions.map((s) => (
                                                    <tr
                                                        key={s.sessionId}
                                                        onClick={() =>
                                                            handleSessionClick(
                                                                selectedPatient,
                                                                s
                                                            )
                                                        }
                                                    >
                                                        <td>{s.testType}</td>

                                                        <td>{s.date}</td>

                                                        <td>
                                                            <span
                                                                className={`session-status ${s.status}`}
                                                            >
                                                                {s.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SavedReports;
