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

const MakePTAReport = ({
    onClose,
    patientId,
    patientInfo: initialPatientInfo,
    ptaValues,
    rightEarData,
    leftEarData,
    recommendations,
    recommendationsEnabled,
    formData = [],
    diagnosis,
    speechData = { right: { pta: '', srt: '', sds: '' }, left: { pta: '', srt: '', sds: '' } },
    weberData = { 250: { right: '', left: '' }, 500: { right: '', left: '' }, 1000: { right: '', left: '' }, 2000: { right: '', left: '' } },
    reportSections = {
        front_page: true,
        front_patient_info: true,
        front_provisional_diagnosis: true,
        front_speech_audiometry: false,
        front_weber_test: false,
        front_audiologist_details: true,
        front_recommendations: true,
        recommendations: true,

        patient_info: true,
        right_ear_graph: true,
        left_ear_graph: true,
        symbols_legend_right: true,
        symbols_legend_left: true,
        provisional_diagnosis: true,
        speech_audiometry: true,
        weber_test: true,
        audiologist_details: true,
    },
}) => {
    const frontPageRef = useRef(null);
    const audiogramPageRef = useRef(null);

    const [pdfUrl, setPdfUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [patientInfo, setPatientInfo] = useState(initialPatientInfo || null);
    const [audiologist, setAudiologist] = useState({
        name: "",
        reg_no: "",
        qualification: "",
        address: "",
        phone_number: "",
    });

    const audiogramOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        spanGaps: true,
        layout: { padding: { left: 0, right: 10, top: 0, bottom: 0 } },
        scales: {
            x: {
                type: "category",
                offset: false,
                grid: { color: "#ccc", drawBorder: true },
                ticks: { align: "center" },
                title: { display: true, text: "Frequency (Hz)", font: { weight: "bold" } },
            },
            y: {
                reverse: true,
                min: -10,
                max: 120,
                offset: false,
                ticks: { stepSize: 10, padding: 10 },
                grid: { color: "#ccc", drawBorder: true },
                title: { display: true, text: "Hearing Level (dB HL)", font: { weight: "bold" } },
            },
        },
        plugins: { legend: { display: false } },
    };

    const symbols = [
        { label: "ACR", symbol: "○", color: "red", desc: "Air Unmasked (R)", size: "26px" },
        { label: "ACR_M", symbol: "△", color: "brown", desc: "Air Masked (R)" },
        { label: "BCR", symbol: "<", color: "red", desc: "Bone Unmasked (R)", size: "20px" },
        { label: "BCR_M", symbol: "⊏", color: "brown", desc: "Bone Masked (R)" },
        { label: "ACL", symbol: "×", color: "blue", desc: "Air Unmasked (L)", size: "26px" },
        { label: "ACL_M", symbol: "□", color: "navy", desc: "Air Masked (L)", size: "27px" },
        { label: "BCL", symbol: ">", color: "blue", desc: "Bone Unmasked (L)" },
        { label: "BCL_M", symbol: "⊐", color: "navy", desc: "Bone Masked (L)" },
    ];

    useEffect(() => {
        const fetchPatient = async () => {
            if (!patientId) return;
            try {
                const { data, error } = await supabase
                    .from("patients")
                    .select("id, name, patient_id, age, gender, location")
                    .eq("id", patientId)
                    .single();
                if (error) throw error;
                setPatientInfo(data);
            } catch (err) {
                console.error("Error fetching patient info:", err);
            }
        };
        if (!patientInfo || !patientInfo.id) fetchPatient();
    }, [patientId, patientInfo]);

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
                console.error("Failed to load audiologist details", err);
            }
        };
        fetchAudiologist();
    }, []);

    const generatePDF = useCallback(async () => {
        if (!frontPageRef.current || !audiogramPageRef.current) {
            setError("Report content not ready");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await new Promise(resolve => setTimeout(resolve, 1800));

            const pdf = new jsPDF("p", "mm", "a4");
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 15;
            const contentWidth = pageWidth - 2 * margin;
            const contentHeight = pageHeight - 2 * margin;

            if (reportSections.front_page) {
                const frontCanvas = await html2canvas(frontPageRef.current, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: "#ffffff",
                });

                const frontImgData = frontCanvas.toDataURL("image/png");
                const frontImgWidth = contentWidth;
                const frontImgHeight = (frontCanvas.height * frontImgWidth) / frontCanvas.width;

                pdf.addImage(frontImgData, "PNG", margin, margin, frontImgWidth, frontImgHeight);
                pdf.addPage();
            }

            const audioCanvas = await html2canvas(audiogramPageRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: "#ffffff",
            });

            const audioImgData = audioCanvas.toDataURL("image/png");
            let audioImgWidth = contentWidth;
            let audioImgHeight = (audioCanvas.height * audioImgWidth) / audioCanvas.width;

            let heightLeft = audioImgHeight;
            let position = margin;

            pdf.addImage(audioImgData, "PNG", margin, position, audioImgWidth, audioImgHeight);
            heightLeft -= contentHeight;

            while (heightLeft > 0) {
                pdf.addPage();
                position = margin - (audioImgHeight - heightLeft);
                pdf.addImage(audioImgData, "PNG", margin, position, audioImgWidth, audioImgHeight);
                heightLeft -= contentHeight;
            }

            const pdfBlob = pdf.output("blob");
            setPdfUrl(URL.createObjectURL(pdfBlob));
        } catch (err) {
            console.error("PDF generation failed:", err);
            setError("Failed to generate PDF: " + err.message);
        } finally {
            setLoading(false);
        }
    }, [
        reportSections,
        rightEarData,
        leftEarData,
        ptaValues,
        diagnosis,
        speechData,
        weberData,
        patientInfo,
        audiologist,
        recommendations,
        recommendationsEnabled,
    ]);

    useEffect(() => {
        generatePDF();
    }, [generatePDF]);

    useEffect(() => {
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [pdfUrl]);
    console.log("MakePTAReport received →", {
        recommendations: recommendations,
        enabled: recommendationsEnabled,
        trimmed: recommendations?.trim()
    });

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
                        <iframe
                            src={pdfUrl}
                            title="Pure Tone Report"
                            width="100%"
                            height="100%"
                            style={{ border: "none" }}
                        />
                    )}
                </div>
            </div>

            {/* ──── HIDDEN CONTENT FOR PDF ──────────────────────────────── */}

            {/* FRONT PAGE */}
            <div
                ref={frontPageRef}
                style={{
                    position: "absolute",
                    left: "-9999px",
                    width: "800px",
                    minHeight: "1000px",
                    background: "white",
                    padding: "40px",
                    fontFamily: "Arial, sans-serif",
                    display: "flex",
                    height: "1200px",
                    flexDirection: "column",
                }}
            >
                {reportSections.front_page && (
                    <>
                        <h1
                            style={{
                                textAlign: "center",
                                color: "#1976d2",
                                marginBottom: "50px",
                                marginTop: "100px",
                                fontSize: "18px",
                            }}
                        >
                            PURE TONE AUDIOMETRY
                        </h1>

                        {reportSections.front_patient_info && patientInfo && (
                            <div className="MR-PTA-patient-info">
                                <p className="ptdt-para"><strong>Patient Name:</strong> {patientInfo.name}</p>
                                <p className="ptdt-para"><strong>ID:</strong> {patientInfo.patient_id}</p>
                                <p className="ptdt-para"><strong>Age:</strong> {patientInfo.age} Years</p>
                                <p className="ptdt-para"><strong>Gender:</strong> {patientInfo.gender}</p>
                            </div>
                        )}




                        <div className="weber-speech-fp-main-cont">
                            {reportSections.front_weber_test && (
                                <div style={{ marginBottom: "30px", borderRadius: "10px" }}>
                                    <h3 className="fp-headers web-speech-header" style={{ color: "#333", marginBottom: "12px" }}>
                                        WEBER TEST
                                    </h3>
                                    <table style={{ width: "350px", borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr style={{ background: "#f5f5f5" }}>
                                                <th style={{ border: "1px solid #ccc", padding: "10px" }}>Frequency (Hz)</th>
                                                <th style={{ border: "1px solid #ccc", padding: "10px" }}>Right</th>
                                                <th style={{ border: "1px solid #ccc", padding: "10px" }}>Left</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.keys(weberData).map(freq => (
                                                <tr key={freq}>
                                                    <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>{freq}</td>
                                                    <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>{weberData[freq].right || "—"}</td>
                                                    <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>{weberData[freq].left || "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {reportSections.front_speech_audiometry && (
                                <div style={{ marginBottom: "30px" }}>
                                    <h3 className="fp-headers web-speech-header" style={{ color: "#333", marginBottom: "12px" }}>
                                        SPEECH AUDIOMETRY
                                    </h3>
                                    <table style={{ width: "350px", borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr style={{ background: "#f5f5f5" }}>
                                                <th style={{ border: "1px solid #ccc", padding: "10px" }}>EAR</th>
                                                <th style={{ border: "1px solid #ccc", padding: "10px" }}>PTA</th>
                                                <th style={{ border: "1px solid #ccc", padding: "10px" }}>SRT</th>
                                                <th style={{ border: "1px solid #ccc", padding: "10px" }}>SDS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>RIGHT</td>
                                                <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>{ptaValues?.right || "—"}</td>
                                                <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>{speechData.right.srt || "—"}</td>
                                                <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>{speechData.right.sds || "—"}</td>
                                            </tr>
                                            <tr>
                                                <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>LEFT</td>
                                                <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>{ptaValues?.left || "—"}</td>
                                                <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>{speechData.left.srt || "—"}</td>
                                                <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>{speechData.left.sds || "—"}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}

                        </div>
                        {reportSections.front_provisional_diagnosis && (
                            <div className="fp-pvd-container">
                                <h3 className="fp-pvd-title fp-headers">PROVISIONAL DIAGNOSIS</h3>
                                <table className="fp-table">
                                    <tbody>
                                        <tr>
                                            <td className="fp-label">Right Ear</td>
                                            <td className="fp-content">{diagnosis?.re || "Insufficient Data"}</td>
                                        </tr>
                                        <tr>
                                            <td className="fp-label">Left Ear</td>
                                            <td className="fp-content">{diagnosis?.le || "Insufficient Data"}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* FRONT PAGE RECOMMENDATIONS */}
                        {/* FRONT PAGE RECOMMENDATIONS */}
                        {reportSections?.front_recommendations && recommendationsEnabled && (
                            <div className="report-section recommendations-section">
                                <h3 className="report-section-title fp-headers">RECOMMENDATIONS</h3>
                                <div
                                    className="report-section-content"
                                    style={{ whiteSpace: "pre-wrap", lineHeight: "1.8", }} // ADD THIS LINE
                                >
                                    {recommendations?.trim() ? recommendations : "No recommendations provided."}
                                </div>
                            </div>
                        )}



                        {reportSections.front_audiologist_details && (
                            <div className="audiologist-details-main-cont-pta-fp">
                                <div className="audiologist-details-container">
                                    <h3 className="audiologist-header">Audiologist</h3>
                                    <p style={{ margin: "2px 0" }}>
                                        <strong>{audiologist.name || "—"}</strong>
                                    </p>
                                    <p style={{ margin: "2px 0" }}>
                                        <strong>{audiologist.qualification || "—"}</strong>{" "}
                                        <strong>{audiologist.reg_no || "—"}</strong>
                                    </p>
                                    {audiologist.address && (
                                        <p style={{ margin: "2px 0" }}>
                                            <strong>{audiologist.address}</strong>
                                        </p>
                                    )}
                                    {audiologist.phone_number && (
                                        <p style={{ margin: "2px 0" }}>
                                            <strong>{audiologist.phone_number}</strong>
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* AUDIOGRAM / MAIN PAGE */}
            <div
                ref={audiogramPageRef}
                className="main-backpage"
                style={{
                    position: "absolute",
                    left: "-9999px",
                    width: "800px",
                    padding: "40px",
                    fontFamily: "Arial, sans-serif",
                }}
            >
                <h1 style={{ textAlign: "center", color: "#1976d2", marginBottom: "15px", fontSize: "18px" }}>
                    DUAL EAR AUDIOGRAM
                </h1>

                {reportSections.patient_info && patientInfo && (
                    <div className="MR-PTA-patient-info">
                        <p className="ptdt-para"><strong>Patient Name:</strong> {patientInfo.name}</p>
                        <p className="ptdt-para"><strong>ID:</strong> {patientInfo.patient_id}</p>
                        <p className="ptdt-para"><strong>Age:</strong> {patientInfo.age} Years</p>
                        <p className="ptdt-para"><strong>Gender:</strong> {patientInfo.gender}</p>
                    </div>
                )}

                <div className="MR-PTA-graphs-row">
                    <div className="MR-PTA-graph-box" style={{ display: reportSections.right_ear_graph ? "block" : "none" }}>
                        <h2 className="MR-PTA-ear-title red">RIGHT EAR</h2>
                        <div className="PTA-symbols-legend-container" style={{ display: reportSections.symbols_legend_right ? "block" : "none" }}>
                            <div className="symbols-grid">
                                {symbols
                                    .filter(s => s.label.startsWith("ACR") || s.label.startsWith("BCR"))
                                    .map((item, i) => (
                                        <div key={i} className="symbol-item">
                                            <span className="symbol-abbr">{item.label}</span>
                                            <span className="symbol-visual" style={{ color: item.color, fontSize: item.size || "16px" }}>
                                                {item.symbol}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                        <div className="MR-PTA-chart-container">
                            <Line data={rightEarData} options={audiogramOptions} />
                        </div>
                        <p className="MR-PTA-value-label">PTA: {ptaValues?.right ?? "—"} dB HL</p>
                    </div>

                    <div className="MR-PTA-graph-box" style={{ display: reportSections.left_ear_graph ? "block" : "none" }}>
                        <h2 className="MR-PTA-ear-title blue">LEFT EAR</h2>
                        <div className="PTA-symbols-legend-container" style={{ display: reportSections.symbols_legend_left ? "block" : "none" }}>
                            <div className="symbols-grid">
                                {symbols
                                    .filter(s => s.label.startsWith("ACL") || s.label.startsWith("BCL"))
                                    .map((item, i) => (
                                        <div key={i} className="symbol-item">
                                            <span className="symbol-abbr">{item.label}</span>
                                            <span className="symbol-visual" style={{ color: item.color }}>
                                                {item.symbol}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                        <div className="MR-PTA-chart-container">
                            <Line data={leftEarData} options={audiogramOptions} />
                        </div>
                        <p className="MR-PTA-value-label">PTA: {ptaValues?.left ?? "—"} dB HL</p>
                    </div>
                </div>

                <div className="MAIN-CONT-pvd-sa-weber" style={{ display: "flex", gap: "10px", marginBottom: "5px", marginTop: "5px" }}>
                    {reportSections.weber_test && (
                        <div className="MR-PTA-table-card">
                            <h3 className="PTA-tables-header">Weber Test</h3>
                            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Frequency In Hz</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Right</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>Left</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(weberData).map((freq) => (
                                        <tr key={freq}>
                                            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{freq}</td>
                                            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{weberData[freq].right || ""}</td>
                                            <td style={{ border: "1px solid #ccc", padding: "8px" }}>{weberData[freq].left || ""}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {reportSections.speech_audiometry && (
                        <div className="MR-PTA-table-card">
                            <h3 className="PTA-tables-header">Speech Audiometry</h3>
                            <table style={{ width: "100%", marginTop: "10px", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>EAR</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>PTA</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>SRT</th>
                                        <th style={{ border: "1px solid #ccc", padding: "8px" }}>SDS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>RIGHT</td>
                                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>{speechData.right.pta || ""}</td>
                                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>{speechData.right.srt || ""}</td>
                                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>{speechData.right.sds || ""}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>LEFT</td>
                                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>{speechData.left.pta || ""}</td>
                                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>{speechData.left.srt || ""}</td>
                                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>{speechData.left.sds || ""}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                    {reportSections.provisional_diagnosis && (
                        <div className="MR-PTA-table-card">
                            <h3 className="PTA-tables-header">Provisional Diagnosis</h3>
                            <div className="MR-PTA-text-content">
                                <p><strong>Right:</strong> {diagnosis?.re || "Insufficient Data"}</p>
                                <p><strong>Left:</strong> {diagnosis?.le || "Insufficient Data"}</p>
                            </div>
                        </div>
                    )}


                    {/* MAIN PAGE RECOMMENDATIONS */}
                    {/* MAIN PAGE RECOMMENDATIONS */}
                    {/* Use recommendations here */}

                </div>
                <div className="recomm-audiologist-main-cont">

                    {reportSections.recommendations && recommendationsEnabled && (
                        <div className="MR-PTA-table-card recommendations-card" style={{ marginTop: "0px" }}>
                            <h3 className="PTA-tables-header">RECOMMENDATIONS</h3>
                            <div style={{
                                whiteSpace: "pre-wrap",
                                padding: "9px 10px",
                                background: "#f9fcff",
                                borderLeft: "5px solid #1976d2",
                                borderRadius: "4px",
                                fontSize: "15px",
                                lineHeight: "1.5",
                                marginTop: "12px"
                            }}>
                                {recommendations || "No recommendations provided."}
                            </div>
                        </div>
                    )} <div className="space-cont"></div>
                    {reportSections.audiologist_details && (
                        <div className="audiologist-details-main-cont-pta-main-page">
                            <div className="audiologist-details-container">
                                <h3 className="audiologist-header">Audiologist</h3>
                                <p style={{ margin: "2px 0" }}>
                                    <strong>{audiologist.name || "—"}</strong>
                                </p>
                                <p style={{ margin: "2px 0" }}>
                                    <strong>{audiologist.qualification || "—"}</strong>{" "}
                                    <strong>{audiologist.reg_no || "—"}</strong>
                                </p>
                                {audiologist.address && <p style={{ margin: "2px 0" }}><strong>{audiologist.address}</strong></p>}
                                {audiologist.phone_number && <p style={{ margin: "2px 0" }}><strong>{audiologist.phone_number}</strong></p>}
                            </div>
                        </div>
                    )}</div>

            </div>
        </div>
    );
};

export default MakePTAReport;