import React, { useRef, useEffect, useState, useCallback } from "react";
import { Line } from "react-chartjs-2";
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
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { LuEar } from "react-icons/lu";
import { supabase } from "../../supabaseClient";
import "./index.css";

ChartJS.register(
    LineElement,
    CategoryScale,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
    Legend,
    annotationPlugin
);

// Default sections (must match with ReportFormatSelector)
const DEFAULT_SECTIONS = {
    front_page: true,
    front_patient_info: true,
    front_provisional_diagnosis: true,
    front_recommendations: true,
    front_audiologist_details: true,

    patient_info: true,
    right_ear_graph: true,
    left_ear_graph: true,
    provisional_diagnosis: true,
    speech_audiometry: true,
    weber_test: true,
    audiologist_details: true,
    recommendations: true,
};

const MakePTAReport = ({
    onClose,
    patientId,
    patientInfo: initialPatientInfo,
    rightEarData,
    leftEarData,
    recommendations,
    diagnosis,
    speechData = { right: { pta: '', srt: '', sds: '' }, left: { pta: '', srt: '', sds: '' } },
    weberData = {
        250: { right: '', left: '' },
        500: { right: '', left: '' },
        1000: { right: '', left: '' },
        2000: { right: '', left: '' }
    },
    reportSections = DEFAULT_SECTIONS,   // ← This comes from applied format
}) => {
    const frontPageRef = useRef(null);
    const audiogramPageRef = useRef(null);
    const today = new Date();
    const formattedDateTime = today.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }) + " | " + today.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });
    const formattedDate = today.toLocaleDateString("en-GB");
    const [pdfUrl, setPdfUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [puretoneMargin, setPuretoneMargin] = useState(0);
    const [patientInfo, setPatientInfo] = useState(initialPatientInfo || null);
    const [audiologist, setAudiologist] = useState({
        name: "",
        reg_no: "",
        qualification: "",
        address: "",
        phone_number: "",
    });

    // Audiogram Chart Options
    const audiogramOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        spanGaps: true,
        layout: { padding: { left: 10, right: 20, top: 10, bottom: 10 } },
        scales: {
            x: {
                type: "category",
                offset: true,
                grid: { color: "#757373", lineWidth: 1 },
                ticks: { font: { size: 11 }, color: "#060606" },
                title: { display: true, text: "FREQUENCY (Hz)", font: { weight: "bold", size: 13 }, color: "#000000" },
            },
            y: {
                reverse: true,
                min: -10,
                max: 120,
                grid: { color: "#646464", lineWidth: 1 },
                ticks: { stepSize: 10, font: { size: 11 }, color: "#000000" },
                title: { display: true, text: "HEARING LEVEL (dB HL)", font: { weight: "bold", size: 13 }, color: "#000000" },
            },
        },
        elements: {
            line: { borderWidth: 6, tension: 0, borderJoinStyle: 'round' },
            point: { radius: 7.5, hoverRadius: 9, borderWidth: 3, borderColor: "#ffffff", backgroundColor: "#000000" }
        },
        plugins: {
            legend: { display: false },
            annotation: {
                annotations: {
                    normal: { type: 'box', yMin: -10, yMax: 15, backgroundColor: 'rgba(163, 230, 187, 0.4)', borderWidth: 0 },
                    mild: { type: 'box', yMin: 16, yMax: 25, backgroundColor: 'rgba(254, 249, 195, 0.5)', borderWidth: 0 },
                    moderate: { type: 'box', yMin: 26, yMax: 40, backgroundColor: 'rgba(254, 215, 170, 0.5)', borderWidth: 0 },
                    modSevere: { type: 'box', yMin: 41, yMax: 55, backgroundColor: 'rgba(253, 186, 186, 0.5)', borderWidth: 0 },
                    severe: { type: 'box', yMin: 56, yMax: 70, backgroundColor: 'rgba(233, 213, 255, 0.4)', borderWidth: 0 },
                    profound: { type: 'box', yMin: 71, yMax: 120, backgroundColor: 'rgba(209, 213, 219, 0.5)', borderWidth: 0 },
                }
            }
        },
    };

    // Fetch Puretone Margin
    useEffect(() => {
        const fetchPuretoneMargin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from("report_layout_settings")
                .select("margin_top")
                .eq("user_id", user.id)
                .eq("report_type", "puretone")
                .single();

            if (data) setPuretoneMargin(data.margin_top || 0);
        };
        fetchPuretoneMargin();
    }, []);

    // Fetch Patient Info
    useEffect(() => {
        const fetchPatient = async () => {
            if (!patientId) return;
            try {
                const { data, error } = await supabase
                    .from("patients")
                    .select("id, name, patient_id, age, gender, location")
                    .eq("id", patientId)
                    .single();

                if (!error && data) setPatientInfo(data);
            } catch (err) {
                console.error("Error fetching patient:", err);
            }
        };
        if (!patientInfo?.id) fetchPatient();
    }, [patientId, patientInfo]);

    // Fetch Audiologist Details
    useEffect(() => {
        const fetchAudiologist = async () => {
            try {
                const { data } = await supabase
                    .from("audiologist_details")
                    .select("*")
                    .limit(1)
                    .single();
                if (data) setAudiologist(data);
            } catch (err) {
                console.error("Failed to load audiologist", err);
            }
        };
        fetchAudiologist();
    }, []);

    // Generate PDF
    const generatePDF = useCallback(async () => {
        if (!frontPageRef.current || !audiogramPageRef.current) {
            setError("Report content not ready");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await new Promise(resolve => setTimeout(resolve, 800));

            const pdf = new jsPDF("p", "mm", "a4");
            const pageWidth = 210;
            const margin = 15;
            const contentWidth = pageWidth - 2 * margin;

            // Front Page
            if (reportSections.front_page) {
                const frontCanvas = await html2canvas(frontPageRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
                const frontImgData = frontCanvas.toDataURL("image/png");
                const frontImgHeight = (frontCanvas.height * contentWidth) / frontCanvas.width;

                pdf.addImage(frontImgData, "PNG", margin, margin, contentWidth, frontImgHeight);
                if (reportSections.front_page) pdf.addPage();
            }

            // Main Audiogram Page
            const audioCanvas = await html2canvas(audiogramPageRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
            const audioImgData = audioCanvas.toDataURL("image/png");
            let audioImgHeight = (audioCanvas.height * contentWidth) / audioCanvas.width;

            let heightLeft = audioImgHeight;
            let position = margin;

            pdf.addImage(audioImgData, "PNG", margin, position, contentWidth, audioImgHeight);
            heightLeft -= (297 - 2 * margin);

            while (heightLeft > 0) {
                pdf.addPage();
                position = margin - (audioImgHeight - heightLeft);
                pdf.addImage(audioImgData, "PNG", margin, position, contentWidth, audioImgHeight);
                heightLeft -= (297 - 2 * margin);
            }

            const pdfBlob = pdf.output("blob");
            setPdfUrl(URL.createObjectURL(pdfBlob));

        } catch (err) {
            console.error("PDF generation failed:", err);
            setError("Failed to generate PDF: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [reportSections]);

    useEffect(() => {
        generatePDF();
    }, [generatePDF]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);

    return (
        <div className="MR-PTA-overlay" onClick={onClose}>
            <div className="MR-PTA-container" onClick={(e) => e.stopPropagation()}>
                <div className="MR-PTA-header-popup">
                    <div className="MR-PTA-logo-cont">
                        <LuEar className="MR-PTA-logo-icon" />
                        <span className="MR-PTA-logo-text">AudiogramPro</span>
                    </div>
                    <button className="MR-PTA-close-btn" onClick={onClose}>×</button>
                </div>

                <div className="MR-PTA-pdf-content">
                    {loading && (
                        <div className="MR-PTA-loading">
                            <LuEar className="save-ear-icon-report" />
                            <p className="para-makereport">Making Report...</p>
                        </div>
                    )}
                    {error && <div className="MR-PTA-error">{error}</div>}
                    {!loading && !error && pdfUrl && (
                        <iframe src={pdfUrl} title="Pure Tone Report" width="100%" height="100%" style={{ border: "none" }} />
                    )}
                </div>
            </div>

            {/* ====================== FRONT PAGE ====================== */}
            <div ref={frontPageRef} style={{ position: "absolute", left: "-9999px", width: "840px", minHeight: "1200px", background: "white", padding: "30px", fontFamily: "Arial, sans-serif" }}>
                {reportSections.front_page && (
                    <>
                        <div className="report-main-header" style={{ marginTop: "250px" }}>
                            <div className="header-content">
                                <h1>PURETONE AUDIOMETRY</h1>
                                <p>HEARING EVALUATION REPORT</p>
                            </div>
                            <div className="header-date">{formattedDateTime}</div>
                        </div>

                        {reportSections.front_patient_info && (
                            <div className="patient-details-box">
                                <div className="patient-details-header">PATIENT DETAILS</div>
                                <div className="patient-grid">
                                    <div><strong>Patient Name:</strong> {patientInfo?.name || "N/A"}</div>
                                    <div><strong>Patient ID:</strong> {patientInfo?.patient_id || "N/A"}</div>
                                    <div>
                                        <strong>Age:</strong>
                                        {patientInfo?.age
                                            ? `${patientInfo.age} Years`
                                            : "N/A"}
                                    </div>                                    <div><strong>Address:</strong> {patientInfo?.location || "N/A"}</div>                                    <div><strong>Gender:</strong> {patientInfo?.gender || "N/A"}</div>
                                </div>
                            </div>
                        )}

                        {reportSections.front_provisional_diagnosis && diagnosis && (
                            <div className="provisional-diagnosis-box">
                                <div className="section-header">PROVISIONAL DIAGNOSIS</div>
                                <div className="diagnosis-row">
                                    <strong>Right Ear :</strong> {diagnosis.re || "Normal Hearing"}
                                </div>
                                <div className="diagnosis-row">
                                    <strong>Left Ear :</strong> {diagnosis.le || "Normal Hearing"}
                                </div>
                            </div>
                        )}

                        {reportSections.front_recommendations && (
                            <div style={{ marginTop: "25px", marginBottom: "30px", width: "300px", border: "solid 2px #1e4f8f", borderRadius: "5px" }}>
                                <div style={{ background: "#1e4f8f", color: "#fff", padding: "10px 16px", fontWeight: "700", fontSize: "15px", borderRadius: "4px 4px 0 0" }}>
                                    RECOMMENDATIONS
                                </div>
                                <div style={{ border: "1px solid #1e4f8f", borderTop: "none", padding: "18px", minHeight: "70px", background: "#fff", borderRadius: "0 0 4px 4px", lineHeight: "1.7", fontSize: "14px" }}>
                                    {recommendations?.trim() || "No recommendations provided."}
                                </div>
                            </div>
                        )}

                        {reportSections.front_audiologist_details && (
                            <div className="recomm-audiologist-main-cont" style={{ marginTop: "50px", fontSize: "11px", marginLeft: "400px" }}>
                                <p style={{ margin: "0 0 8px 0", fontWeight: "bold", fontSize: "16px" }}>AUDIOLOGIST</p>
                                <p style={{ margin: "0", lineHeight: "1.5" }}>
                                    {audiologist.name || "Audiologist Name"}<br />
                                    {audiologist.qualification}<br />
                                    Reg. No: {audiologist.reg_no}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ====================== MAIN AUDIOGRAM PAGE ====================== */}
            <div ref={audiogramPageRef} style={{ position: "absolute", left: "-9999px", width: "840px", padding: "30px", paddingTop: `${puretoneMargin}px`, fontFamily: "Arial, sans-serif", background: "white" }}>
                <div className="report-main-header" style={{ marginTop: "110px" }}>
                    <div className="header-content">
                        <h1>PURETONE AUDIOMETRY</h1>
                        <p>HEARING EVALUATION REPORT</p>
                    </div>
                    <div className="header-date">{formattedDateTime}</div>
                </div>

                {reportSections.patient_info && (
                    <div className="patient-details-box">
                        <div className="patient-details-header">PATIENT DETAILS</div>
                        <div className="patient-grid">
                            <div><strong>Patient Name:</strong> {patientInfo?.name || "N/A"}</div>
                            <div><strong>Patient ID:</strong> {patientInfo?.patient_id || "N/A"}</div>
                            <div>
                                <strong>Age:</strong>
                                {patientInfo?.age
                                    ? `${patientInfo.age} Years`
                                    : "N/A"}
                            </div>                            <div><strong>Date of Test:</strong> {formattedDate}</div>
                            <div><strong>Address:</strong> {patientInfo?.location || "N/A"}</div>                            <div><strong>Gender:</strong> {patientInfo?.gender || "N/A"}</div>
                        </div>
                    </div>
                )}

                {/* Audiograms */}
                <div className="advanced-audiogram">
                    <div className="graphs-advanced-row">
                        {reportSections.right_ear_graph && (
                            <div className="graph-box-advanced">
                                <h3 className="ear-title red">R I G H T   E A R</h3>
                                <div className="chart-wrapper-advanced">
                                    <Line data={rightEarData} options={audiogramOptions} />
                                </div>
                            </div>
                        )}

                        {reportSections.left_ear_graph && (
                            <div className="graph-box-advanced">
                                <h3 className="ear-title blue">L E F T   E A R</h3>
                                <div className="chart-wrapper-advanced">
                                    <Line data={leftEarData} options={audiogramOptions} />
                                </div>
                            </div>
                        )}

                        <div className="level-guide">
                            <div className="guide-title">LEVEL GUIDE</div>
                            <div className="guide-item normal"><span>NORMAL</span></div>
                            <div className="guide-item mild"><span>MILD</span></div>
                            <div className="guide-item moderate"><span>MODERATE</span></div>
                            <div className="guide-item mod-severe"><span>MODERATELY SEVERE</span></div>
                            <div className="guide-item severe"><span>SEVERE</span></div>
                            <div className="guide-item profound"><span>PROFOUND</span></div>
                        </div>
                    </div>
                </div>

                {/* Other Sections */}
                <div className="MAIN-CONT-pvd-sa-weber" style={{ display: "flex", gap: "20px", marginTop: "20px", flexWrap: "wrap" }}>
                    {/* {reportSections.provisional_diagnosis && diagnosis && (
                        <div className="provisional-diagnosis-box" style={{ width: "400px" }}>
                            <div className="section-header">PROVISIONAL DIAGNOSIS</div>
                            <div className="diagnosis-row"><strong>Right Ear :</strong> {diagnosis.right || "Normal Hearing"}</div>
                            <div className="diagnosis-row"><strong>Left Ear :</strong> {diagnosis.left || "Normal Hearing"}</div>
                        </div>
                    )} */}

                    {reportSections.weber_test && (
                        <div className="weber-test-box" style={{ width: "320px", minWidth: "320px", height: "180px" }}>
                            <div className="section-header">WEBER TEST</div>
                            <table className="weber-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ backgroundColor: "#f4f4f4" }}>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Frequency (Hz)</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Right Ear</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Left Ear</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(weberData).map((freq) => (
                                        <tr key={freq}>
                                            <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>{freq}</td>
                                            <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>{weberData[freq].right || "-"}</td>
                                            <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>{weberData[freq].left || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {reportSections.audiologist_details && (
                        <div className="recomm-audiologist-main-cont" style={{ marginTop: "40px", fontSize: "11px" }}>
                            <p style={{ margin: "0 0 8px 0", fontWeight: "bold", fontSize: "16px" }}>AUDIOLOGIST</p>
                            <p style={{ margin: "0", lineHeight: "1.5" }}>
                                {audiologist.name || "Audiologist Name"}<br />
                                {audiologist.qualification}<br />
                                Reg. No: {audiologist.reg_no}
                            </p>
                        </div>
                    )}
                </div>



                {/* {reportSections.recommendations && recommendations && (
                    <div style={{ marginTop: "30px", border: "solid 2px #1e4f8f", borderRadius: "5px", maxWidth: "500px" }}>
                        <div style={{ background: "#1e4f8f", color: "#fff", padding: "10px 16px", fontWeight: "700" }}>
                            RECOMMENDATIONS
                        </div>
                        <div style={{ padding: "18px", lineHeight: "1.7", fontSize: "14px" }}>
                            {recommendations}
                        </div>
                    </div>
                )} */}
            </div>
        </div>
    );
};

export default MakePTAReport;