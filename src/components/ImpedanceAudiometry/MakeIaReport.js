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
import "./MakeIaReport.css";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Title, Tooltip, Legend, annotationPlugin);

const MakeIaReport = ({
    onClose,
    rightEar,
    leftEar,
    rightEarData,
    leftEarData,
    reportData,
    patientInfo,
    ptaValues,
    formData,
    reportSections,           // ← From parent (
    // Audiometry)
}) => {
    const reportRef = useRef(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [renderCount, setRenderCount] = useState(0);

    const [audiologist, setAudiologist] = useState({
        name: "",
        reg_no: "",
        qualification: "",
        address: "",
        phone_number: ""
    });

    const currentDate = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    useEffect(() => {
        const fetchAudiologist = async () => {
            try {
                const { data, error } = await supabase
                    .from("audiologist_details")
                    .select("name, reg_no, qualification, address, phone_number")
                    .limit(1)
                    .single();
                if (data && !error) {
                    setAudiologist({
                        name: data.name || "",
                        reg_no: data.reg_no || "",
                        qualification: data.qualification || "",
                        address: data.address || "",
                        phone_number: data.phone_number || ""
                    });
                }
            } catch (err) {
                console.error("Failed to load audiologist:", err);
            }
        };
        fetchAudiologist();
    }, []);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: "linear",
                min: -300,
                max: 200,
                ticks: { stepSize: 100 },
                title: { display: true, text: "Middle ear pressure (daPa)", font: { size: 14 } },
            },
            y: {
                min: 0,
                max: 2.5,
                ticks: { stepSize: 0.5 },
                title: { display: true, text: "Compliance (ml)", font: { size: 14 } },
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
                        borderColor: "rgba(0,0,0,0.8)",
                        borderWidth: 2,
                        borderDash: [6, 6],
                        backgroundColor: "rgba(0,0,0,0)",
                    },
                },
            },
        },
    };

    const generatePDF = useCallback(async () => {
        if (!reportRef.current) {
            setError("Report content not ready");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            const canvas = await html2canvas(reportRef.current, {
                scale: 2.5,
                useCORS: true,
                backgroundColor: "#ffffff",
                logging: false,
                width: reportRef.current.scrollWidth,
                height: reportRef.current.scrollHeight,
                onclone: (clonedDoc) => {
                    const charts = clonedDoc.querySelectorAll("canvas");
                    charts.forEach((chart) => {
                        chart.style.height = "250px";
                        chart.style.width = "100%";
                        chart.style.backgroundColor = "white";
                    });
                }
            });

            const imgData = canvas.toDataURL("image/png", 1.0);
            const pdf = new jsPDF("p", "mm", "a4");

            const imgWidth = 190;
            const pageHeight = 277;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 10;

            pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight + 10;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const pdfBlob = pdf.output("blob");
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);
        } catch (err) {
            console.error("PDF Error:", err);
            setError("Failed to generate PDF: " + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (renderCount < 2) {
            const timer = setTimeout(() => {
                generatePDF();
                setRenderCount(prev => prev + 1);
            }, 600); // wait for charts to finish drawing

            return () => clearTimeout(timer);
        }
    }, [renderCount, generatePDF]);



    return (
        <div className="MR-IA-overlay" onClick={onClose}>
            <div className="MR-IA-container pdf-preview" onClick={(e) => e.stopPropagation()}>
                <div className="MR-IA-header-popup">
                    <div className="MR-logo-header-cont">
                        <LuEar className="MR-logo-icon" />
                        <span className="MR-logo-text">AudiogramPro</span>
                    </div>
                    <button className="MR-IA-close-btn" onClick={onClose}>×</button>
                </div>

                <div className="MR-IA-pdf-content">
                    {loading && (
                        <div className="MR-IA-loading">
                            <div>🎯 Here Is Your Report...</div>
                            <div style={{ fontSize: "12px", marginTop: "10px", color: "#666" }}>
                                Charts rendering in progress...
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="MR-IA-error">
                            <div>❌ {error}</div>
                            <button onClick={generatePDF} className="MR-IA-retry-btn">
                                🔄 Retry PDF Generation
                            </button>
                        </div>
                    )}

                    {!loading && !error && pdfUrl && (
                        <iframe
                            src={pdfUrl}
                            title="PDF Preview"
                            width="100%"
                            height="100%"
                            style={{ border: "none", borderRadius: "8px" }}
                        />
                    )}
                </div>
            </div>

            {/* ── HIDDEN CONTENT FOR PDF CAPTURE ── */}
            <div
                ref={reportRef}
                style={{
                    position: "absolute",
                    left: "-9999px",
                    top: 0,
                    width: "100vw",
                    background: "white",
                    padding: "20px 30px",
                    fontFamily: "Arial, sans-serif",
                    boxSizing: "border-box",
                }}
            >
                <div className="MR-IA-header">
                    <h1>IMPEDANCE AUDIOMETRY REPORT</h1>
                    <p style={{ textAlign: "right", fontSize: "14px", color: "#555" }}>
                        Date: {currentDate}
                    </p>
                </div>

                {/* Patient Information */}
                {reportSections?.patient_info && patientInfo && (
                    <div className="MR-IA-patient-info">
                        <p><strong>Patient Name:</strong> {patientInfo.name}</p>
                        <p><strong>ID:</strong> {patientInfo.patient_id}</p>
                        <p><strong>Age:</strong> {patientInfo.age} Years</p>
                        <p><strong>Gender:</strong> {patientInfo.gender}</p>
                        {patientInfo.location && (
                            <p><strong>Location:</strong> {patientInfo.location}</p>
                        )}
                    </div>
                )}

                {/* Graphs */}
                {(reportSections?.right_tympanogram || reportSections?.left_tympanogram) && (
                    <div className="MR-IA-graphs-row">
                        {reportSections?.right_tympanogram && (
                            <div className="MR-IA-graph-box">
                                <h2 className="MR-IA-ear-title red">RIGHT EAR</h2>
                                <div className="MR-IA-chart-container" style={{ height: "280px" }}>
                                    <Line data={rightEarData} options={options} />
                                </div>
                            </div>
                        )}

                        {reportSections?.left_tympanogram && (
                            <div className="MR-IA-graph-box">
                                <h2 className="MR-IA-ear-title blue">LEFT EAR</h2>
                                <div className="MR-IA-chart-container" style={{ height: "280px" }}>
                                    <Line data={leftEarData} options={options} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Tables & Text Sections */}
                <div className="MR-IA-tables-flex-container">
                    {/* Tympanogram Results Table */}
                    {reportSections?.tymp_results_table && (
                        <div className="MR-IA-table-card">
                            <h3 className="MR-IA-table-header">Tympanogram Results</h3>
                            <table className="MR-IA-report-table">
                                <thead>
                                    <tr>
                                        <th className="th-header">PARAMETER</th>
                                        <th className="th-header">RIGHT EAR</th>
                                        <th className="th-header">LEFT EAR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Compliance (ml)</td>
                                        <td>{reportData?.tymp?.comp_re || rightEar?.compliance || "-"}</td>
                                        <td>{reportData?.tymp?.comp_le || leftEar?.compliance || "-"}</td>
                                    </tr>
                                    <tr>
                                        <td>Ear Canal Volume (cc)</td>
                                        <td>{reportData?.tymp?.ecv_re || rightEar?.volume || "-"}</td>
                                        <td>{reportData?.tymp?.ecv_le || leftEar?.volume || "-"}</td>
                                    </tr>
                                    <tr>
                                        <td>Middle Ear Pressure (daPa)</td>
                                        <td>{reportData?.tymp?.mep_re || rightEar?.pressure || "-"}</td>
                                        <td>{reportData?.tymp?.mep_le || leftEar?.pressure || "-"}</td>
                                    </tr>
                                    <tr>
                                        <td>Type</td>
                                        <td>{reportData?.tymp?.type_re || "-"}</td>
                                        <td>{reportData?.tymp?.type_le || "-"}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Acoustic Reflex Table */}
                    {reportSections?.acoustic_reflex && (
                        <div className="MR-IA-table-card">
                            <h3>Acoustic Reflex</h3>
                            <table className="MR-IA-report-table">
                                <thead>
                                    <tr>
                                        <th></th>
                                        <th>500 Hz</th>
                                        <th>1000 Hz</th>
                                        <th>2000 Hz</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>RE</td>
                                        <td>{reportData?.reflex?.re_500 || "Al"}</td>
                                        <td>{reportData?.reflex?.re_1000 || "Al"}</td>
                                        <td>{reportData?.reflex?.re_2000 || "Al"}</td>
                                    </tr>
                                    <tr>
                                        <td>LE</td>
                                        <td>{reportData?.reflex?.le_500 || "Al"}</td>
                                        <td>{reportData?.reflex?.le_1000 || "Al"}</td>
                                        <td>{reportData?.reflex?.le_2000 || "Al"}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Interpretation */}
                    {reportSections?.interpretation && (
                        <div className="MR-IA-table-card">
                            <h3 className="tables-header">Interpretation</h3>
                            <div className="MR-IA-text-content changeSizeCont">
                                <p className="para-values">
                                    <strong>RIGHT :</strong> {reportData?.interpretation?.re || "-"}
                                </p>
                                <p className="para-values">
                                    <strong>LEFT :</strong> {reportData?.interpretation?.le || "-"}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Provisional Diagnosis */}
                    {reportSections?.provisional_diagnosis && (
                        <div className="MR-IA-table-card">
                            <h3 className="tables-header">Provisional Diagnosis</h3>
                            <div className="MR-IA-text-content">
                                <p className="para-values">
                                    <strong>RIGHT :</strong> {reportData?.diagnosis?.re || "No data available"}
                                </p>
                                <p className="para-values">
                                    <strong>LEFT :</strong> {reportData?.diagnosis?.le || "No data available"}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Recommendations */}

                </div>

                {/* Audiologist Details */}
                <div className="MakReport-recomm-audio-main-cont">{reportSections?.recommendations && (
                    <div className="MR-IA-table-card" style={{ marginTop: "30px" }}>
                        <h3 className="tables-header">Recommendations</h3>
                        <div className="MR-IA-text-content">
                            <p className="MR-IA-recommendations-text para-values">
                                {reportData?.recommendations || "-"}
                            </p>
                        </div>
                    </div>
                )}
                    {reportSections?.audiologist_details && (
                        <div className="audiologist-details-main-cont">
                            <div className="audiologist-details-container">
                                <h3 className="audiologist-header" style={{ marginBottom: "4px", fontSize: "22px" }}>
                                    Audiologist
                                </h3>
                                <p style={{ margin: "2px 0", fontSize: "18px" }}>
                                    <strong>{audiologist.name || "________________"}</strong>
                                </p>
                                <p style={{ margin: "2px 0", fontSize: "18px" }}>
                                    <strong>{audiologist.qualification || ""}</strong>{" "}
                                    <strong>{audiologist.reg_no || ""}</strong>
                                </p>
                                {audiologist.address && (
                                    <p style={{ margin: "2px 0", fontSize: "18px" }}>
                                        <strong>{audiologist.address}</strong>
                                    </p>
                                )}
                                {audiologist.phone_number && (
                                    <p style={{ margin: "2px 0", fontSize: "18px" }}>
                                        <strong>{audiologist.phone_number}</strong>
                                    </p>
                                )}
                            </div>
                        </div>
                    )}</div>

            </div>
        </div>
    );
};

export default MakeIaReport;