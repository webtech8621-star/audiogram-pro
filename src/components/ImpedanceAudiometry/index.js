import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2"; import { LuEar } from "react-icons/lu";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import ImpedanceReportItems from "../ImpedanceReportItems";
import PatientDetails from "../PatientDetails";
import MakeIaReport from "./MakeIaReport";
import "./index.css";
import FormatSelectorIMP from "../FormatSelectorIMP";
import {
    Chart as ChartJS,
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import annotationPlugin from "chartjs-plugin-annotation";
import { supabase } from "../../supabaseClient";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend, annotationPlugin);

function ImpedanceAudiometry() {
    const location = useLocation();
    const navigate = useNavigate();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingSession, setLoadingSession] = useState(false);
    const [showPatientDetails, setShowPatientDetails] = useState(true);
    const [currentPatientId, setCurrentPatientId] = useState(null);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [user, setUser] = useState(null);
    const [patientInfo, setPatientInfo] = useState(null);
    const [sessionSaved, setSessionSaved] = useState(false);

    const [rightEar, setRightEar] = useState({
        pressure: 0,
        volume: 0,
        compliance: 0,
    });

    const [leftEar, setLeftEar] = useState({
        pressure: 0,
        volume: 0,
        compliance: 0,
    });

    const [rightEarData, setRightEarData] = useState({ datasets: [] });
    const [leftEarData, setLeftEarData] = useState({ datasets: [] });
    useEffect(() => {
        // ONLY AUTO-FILL FIRST TIME
        if (!location.state?.ptaValues) return;

        const rightPTA = location.state.ptaValues?.right;
        const leftPTA = location.state.ptaValues?.left;

        // ONLY IF SESSION NOT ALREADY SAVED
        if (!location.state?.loadExistingData) return;

        // RIGHT EAR
        setRightEar((prev) => ({
            ...prev,

            pressure:
                rightPTA > 40
                    ? -120
                    : rightPTA > 25
                        ? -70
                        : 0,

            compliance:
                rightPTA > 40
                    ? 0.3
                    : rightPTA > 25
                        ? 0.6
                        : 1.2,

            volume: 1.1,
        }));

        // LEFT EAR
        setLeftEar((prev) => ({
            ...prev,

            pressure:
                leftPTA > 40
                    ? -120
                    : leftPTA > 25
                        ? -70
                        : 0,

            compliance:
                leftPTA > 40
                    ? 0.3
                    : leftPTA > 25
                        ? 0.6
                        : 1.2,

            volume: 1.1,
        }));
    }, [
        location.state?.ptaValues,
        location.state?.loadExistingData
    ]);
    const reportRef = useRef(null);
    const [showIaReport, setShowIaReport] = useState(false);
    const [showFormatSelector, setShowFormatSelector] = useState(false);

    const [reportSections, setReportSections] = useState({
        patient_info: true,
        right_tympanogram: true,
        left_tympanogram: true,
        tymp_results_table: true,
        acoustic_reflex: true,
        interpretation: true,
        provisional_diagnosis: true,
        recommendations: true,
        audiologist_details: true,
    });

    const [currentFormatName, setCurrentFormatName] = useState('Default (Full)');

    useEffect(() => {
        const loadLatestReportFormat = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user?.id) return;

                const { data, error } = await supabase
                    .from('report_formats')
                    .select('name, sections')
                    .eq('user_id', session.user.id)
                    .eq('type', 'impedance')           // ← important difference
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error(error);
                    return;
                }

                if (data) {
                    setReportSections(data.sections);
                    setCurrentFormatName(data.name);
                }
                // else keep default
            } catch (err) {
                console.error('Cannot load latest format', err);
            }
        };

        loadLatestReportFormat();
    }, []);
    const loadSessionData = useCallback(async (sessionId = currentSessionId) => {
        if (!sessionId) return;
        setLoadingSession(true);
        try {
            const { data, error } = await supabase
                .from("sessions")
                .select(`
          pressure_right, pressure_left,
          volume_right, volume_left,
          compliance_right, compliance_left,
          report_data, audiometry_data,
          pta_right, pta_left,
          session_type
        `)
                .eq("id", sessionId)
                .single();

            if (error) throw error;



            setRightEar({
                pressure: data.pressure_right ?? 0,
                volume: data.volume_right ?? 1.0,
                compliance: data.compliance_right ?? 1.2,
            });
            setLeftEar({
                pressure: data.pressure_left ?? 0,
                volume: data.volume_left ?? 1.0,
                compliance: data.compliance_left ?? 1.2,
            });

            if (data.report_data && reportRef.current?.setReportData) {
                setTimeout(() => reportRef.current.setReportData(data.report_data), 100);
            }
        } catch (err) {
            console.error("Failed to load session:", err);
        } finally {
            setLoadingSession(false);
        }
    }, [currentSessionId]);
    useEffect(() => {
        const state = location.state;
        if (state) {
            const impedanceSessionId =
                state.impedanceSessionId || state.sessionId || null;

            // const puretoneSessionId =
            //     state.puretoneSessionId || null;

            setCurrentPatientId(state.patientId || null);

            setCurrentSessionId(impedanceSessionId);

            setShowPatientDetails(!state.patientId);

            if (state.loadExistingData && impedanceSessionId) {
                loadSessionData(impedanceSessionId);
            } else {
                resetAllStates();
            }
        }
    }, [location.state, loadSessionData]);   // ← add it here

    const resetAllStates = () => {
        setRightEar({ pressure: 0, volume: 0, compliance: 0 });
        setLeftEar({ pressure: 0, volume: 0, compliance: 0 });
        if (reportRef.current?.setReportData) {
            reportRef.current.setReportData({});
        }
        setSessionSaved(false);
    };

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) navigate("/");
            else setUser(session.user);
        };
        checkSession();
    }, [navigate]);

    useEffect(() => {
        const fetchPatientInfo = async () => {
            if (!currentPatientId) {
                setPatientInfo(null);
                return;
            }
            try {
                const { data, error } = await supabase
                    .from("patients")
                    .select("name, age, gender, location, patient_id")
                    .eq("id", currentPatientId)
                    .single();
                if (error) throw error;
                setPatientInfo(data);
            } catch (err) {
                console.error("Error fetching patient:", err);
            }
        };
        fetchPatientInfo();
    }, [currentPatientId]);



    useEffect(() => {
        if (currentSessionId && !currentPatientId) {
            const fetchPatientFromSession = async () => {
                const { data } = await supabase.from("sessions").select("patient_id").eq("id", currentSessionId).single();
                if (data) setCurrentPatientId(data.patient_id);
            };
            fetchPatientFromSession();
        }
    }, [currentSessionId, currentPatientId]);

    const generateTympanogram = ({ pressure, compliance }) => {
        const peakPressure = Number(pressure);
        const peakCompliance = Number(compliance);

        const points = [];

        // If compliance is 0 or invalid → draw flat line
        if (!peakCompliance || peakCompliance <= 0) {
            for (let p = -300; p <= 200; p += 5) {
                points.push({ x: p, y: 0 });
            }
            return points;
        }

        const stdDev = 40;

        for (let p = -300; p <= 200; p += 5) {
            const y =
                peakCompliance *
                Math.exp(-(Math.pow(p - peakPressure, 2) / (2 * stdDev ** 2)));

            points.push({ x: p, y: Math.max(0, y) });
        }

        return points;
    };

    useEffect(() => {
        setRightEarData({
            datasets: [{
                label: "Right Ear",
                data: generateTympanogram(rightEar),
                borderColor: "red",
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
            }],
        });
    }, [rightEar]);

    useEffect(() => {
        setLeftEarData({
            datasets: [{
                label: "Left Ear",
                data: generateTympanogram(leftEar),
                borderColor: "blue",
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
            }],
        });
    }, [leftEar]);
    const handleLogout = async () => {
        setLoading(true);
        await supabase.auth.signOut();
        setLoading(false);
        navigate("/");
    };
    const handleChange = (setter) => (e) => {
        const { name, value } = e.target;
        setter((prev) => ({ ...prev, [name]: value }));
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: "linear",
                min: -300,
                max: 200,
                ticks: { stepSize: 100 },
                title: { display: true, text: "Middle ear pressure (daPa)" },
                style: { color: "black" },
            },
            y: {
                min: 0,
                max: 2.5,
                ticks: { stepSize: 0.5 },
                title: { display: true, text: "Compliance (ml)", color: "black" },
                style: { color: "black" },

            },
        },
        plugins: {
            legend: { display: false },
            annotation: {
                annotations: {
                    box: {
                        type: "box",
                        xMin: -150,
                        xMax: 100,
                        yMin: 0.12,
                        yMax: 1.50,
                        borderColor: "black",
                        borderWidth: 1,
                        borderDash: [5, 5],
                        backgroundColor: "rgba(0,0,0,0)",
                        style: { color: "black" },
                    },
                },
            },
        },
    };

    const handleSaveSession = async () => {
        if (!currentSessionId) {
            return;
        }

        setLoading(true);

        try {
            const reportData = reportRef.current?.getReportData?.() || {};

            const updateData = {
                pressure_right: parseFloat(rightEar.pressure) || null,
                pressure_left: parseFloat(leftEar.pressure) || null,
                volume_right: parseFloat(rightEar.volume) || null,
                volume_left: parseFloat(leftEar.volume) || null,
                compliance_right: parseFloat(rightEar.compliance) || null,
                compliance_left: parseFloat(leftEar.compliance) || null,
                report_data: reportData,
                status: "completed",
                updated_at: new Date().toISOString(),
            };

            if (location.state?.puretoneSessionId) {
                updateData.session_type = "impedance";
            } else {
                updateData.session_type = "impedance";
            }

            const { error } = await supabase
                .from("sessions")
                .update(updateData)
                .eq("id", currentSessionId);

            if (error) throw error;

            setSessionSaved(true);
        } catch (err) {
            console.error("Save error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePatientDetailsClose = () => {
        setShowPatientDetails(false);
    };

    if (loadingSession) {
        return (
            <div className="loading-overlay">
                <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                <Sidebar isOpen={isSidebarOpen} onLogout={handleLogout} loading={loading} />
                <div className="spinner"></div>
                <LuEar className="icon-loader animate-spin" size={20} />
                <p className="loader-text">Loading....</p>
            </div>
        );
    }

    return (
        <div className="imp-wrapper">
            <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
            <Sidebar isOpen={isSidebarOpen} onLogout={handleLogout} loading={loading} />

            <div className="imp-main">
                <div className="buttons-header-cont">
                    <div className="space-cont"></div>
                    <h1 className="imp-title">IMPEDANCE AUDIOMETRY</h1>
                    <div className="IA-button-container">

                        <button
                            className="IA-make-report-button"
                            onClick={() => setShowIaReport(true)}
                            disabled={loadingSession}
                        >
                            Make Report
                        </button>

                        <button
                            className="IA-format-select-button"
                            onClick={() => setShowFormatSelector(true)}
                        >
                            {currentFormatName
                                ? `Format : ${currentFormatName}`
                                : "Select Report Format"}
                        </button>

                        <button
                            className="IA-save-button"
                            onClick={handleSaveSession}
                            disabled={loading || loadingSession}
                        >
                            {loading
                                ? "Saving..."
                                : sessionSaved
                                    ? "Saved ✓"
                                    : "Save Session"}
                        </button>

                        <button
                            className="IA-save-button"
                            onClick={() =>
                                navigate("/puretoneaudiometry", {
                                    state: {
                                        patientId: currentPatientId,
                                        puretoneSessionId:
                                            location.state?.puretoneSessionId,
                                        impedanceSessionId: currentSessionId,
                                        loadExistingData: true,
                                    },
                                })
                            }
                        >
                            ← Back To Puretone
                        </button>

                    </div>
                </div>

                <div className="ear-container">
                    <div className="ear-section">
                        <h2 className="imp-title-right-ear">RIGHT EAR</h2>
                        <div className="ear-card brown-card">
                            <div className="chart-box">
                                <Line data={rightEarData} options={options} />
                            </div>
                            <div className="inputs">
                                <label>Mid Ear Pressure (daPa)</label>
                                <input
                                    type="number"
                                    name="pressure"
                                    value={rightEar.pressure}
                                    onChange={handleChange(setRightEar)}
                                    disabled={loadingSession}
                                />
                                <label>Ear Canal Volume (cm³)</label>
                                <input
                                    type="number"
                                    name="volume"
                                    value={rightEar.volume}
                                    onChange={handleChange(setRightEar)}
                                    step="0.1"
                                    disabled={loadingSession}
                                />
                                <label>Compliance (ml)</label>
                                <input
                                    type="number"
                                    name="compliance"
                                    value={rightEar.compliance}
                                    onChange={handleChange(setRightEar)}
                                    step="0.1"
                                    disabled={loadingSession}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="ear-section">
                        <h2 className="imp-title-left-ear">LEFT EAR</h2>
                        <div className="ear-card brown-card">
                            <div className="chart-box">
                                <Line data={leftEarData} options={options} />
                            </div>
                            <div className="inputs">
                                <label>Mid Ear Pressure (daPa)</label>
                                <input
                                    type="number"
                                    name="pressure"
                                    value={leftEar.pressure}
                                    onChange={handleChange(setLeftEar)}
                                    disabled={loadingSession}
                                />
                                <label>Ear Canal Volume (cm³)</label>
                                <input
                                    type="number"
                                    name="volume"
                                    value={leftEar.volume}
                                    onChange={handleChange(setLeftEar)}
                                    step="0.1"
                                    disabled={loadingSession}
                                />
                                <label>Compliance (ml)</label>
                                <input
                                    type="number"
                                    name="compliance"
                                    value={leftEar.compliance}
                                    onChange={handleChange(setLeftEar)}
                                    step="0.1"
                                    disabled={loadingSession}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <ImpedanceReportItems
                    ref={reportRef}
                    rightEar={rightEar}
                    leftEar={leftEar}
                    formData={location.state?.formData || []}
                    ptaValues={location.state?.ptaValues || { right: null, left: null }}
                />

                <div className="pta-buttons">



                    {showFormatSelector && (
                        <FormatSelectorIMP
                            isOpen={showFormatSelector}
                            onClose={() => setShowFormatSelector(false)}
                            reportSections={reportSections}
                            setReportSections={setReportSections}
                            currentFormatName={currentFormatName}
                            setCurrentFormatName={setCurrentFormatName}
                            user={user}   // pass user so FormatSelectorIMP can save correctly
                        />
                    )}
                </div>
            </div>

            {showPatientDetails && (
                <PatientDetails
                    onClose={handlePatientDetailsClose}
                    sessionType="impedance"
                />
            )}

            {showIaReport && (
                <MakeIaReport
                    onClose={() => setShowIaReport(false)}
                    rightEar={rightEar}
                    leftEar={leftEar}
                    rightEarData={rightEarData}
                    leftEarData={leftEarData}
                    reportData={reportRef.current?.getReportData?.() || {}}
                    patientInfo={patientInfo}
                    ptaValues={location.state?.ptaValues || { right: null, left: null }}
                    formData={location.state?.formData || []}
                    reportSections={reportSections}
                />
            )}
        </div>
    );
}

export default ImpedanceAudiometry;