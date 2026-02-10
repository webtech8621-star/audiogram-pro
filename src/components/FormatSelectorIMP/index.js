// FormatSelectorIMP.jsx
import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { LuEar } from "react-icons/lu";
import "./index.css";

const SECTION_LABELS = {
    patient_info: "Patient Information",
    right_tympanogram: "Right Tympanogram Graph",
    left_tympanogram: "Left Tympanogram Graph",
    tymp_results_table: "Tympanogram Results Table",
    acoustic_reflex: "Acoustic Reflex Table",
    interpretation: "Interpretation",
    provisional_diagnosis: "Provisional Diagnosis",
    recommendations: "Recommendations",
    audiologist_details: "Audiologist Details",
};

const FormatSelectorIMP = ({
    isOpen,
    onClose,
    reportSections,
    setReportSections,
    currentFormatName,
    setCurrentFormatName,
    user,
}) => {
    const [localSections, setLocalSections] = useState(reportSections);
    const [formatName, setFormatName] = useState(currentFormatName || "Custom Format");
    const [saving, setSaving] = useState(false);
    const [formats, setFormats] = useState([]);
    const [selectedFormatId, setSelectedFormatId] = useState(null);

    // 1️⃣ Load user's saved formats & auto select previously chosen format
    useEffect(() => {
        if (!user?.id || !isOpen) return;

        const loadFormats = async () => {
            const { data, error } = await supabase
                .from("report_format_impedance")
                .select("id, name, sections, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error loading formats:", error);
                return;
            }

            if (data && data.length > 0) {
                setFormats(data);

                const current = data.find(f => f.name === currentFormatName);
                if (current) {
                    setSelectedFormatId(current.id);
                    setLocalSections(current.sections);
                    setFormatName(current.name);
                }
            }
        };

        loadFormats();
    }, [isOpen, user?.id, currentFormatName]);

    const handleToggle = (key) => {
        setLocalSections(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const handleLoadFormat = (format) => {
        setLocalSections(format.sections);
        setFormatName(format.name);
        setSelectedFormatId(format.id);
    };

    const handleSave = async () => {
        if (!formatName.trim()) {
            alert("Please enter a format name");
            return;
        }

        setSaving(true);

        const payload = {
            user_id: user.id,
            name: formatName.trim(),
            sections: localSections,
        };

        let query;

        if (selectedFormatId) {
            query = supabase
                .from("report_format_impedance")
                .update(payload)
                .eq("id", selectedFormatId)
                .select();
        } else {
            query = supabase
                .from("report_format_impedance")
                .insert([payload])
                .select();
        }

        const { data, error } = await query;
        setSaving(false);

        if (error) {
            alert("Error saving format: " + error.message);
            return;
        }

        setReportSections(localSections);
        setCurrentFormatName(formatName.trim());

        if (data?.[0]) {
            setSelectedFormatId(data[0].id);
            setFormats(prev => [
                data[0],
                ...prev.filter(f => f.id !== data[0].id)
            ]);
        }

        onClose();
    };

    const handleApply = () => {
        setReportSections(localSections);
        setCurrentFormatName(formatName || "Custom");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="format-selector-overlay" onClick={onClose}>
            <div className="format-selector-modal" onClick={e => e.stopPropagation()}>

                {/* 3️⃣ LOGO AT TOP */}
                <div className="imp-popup-logo">
                    <div><LuEar className="imp-popup-logo-icon" />
                        <span className="imp-popup-logo-text">AudiogramPro</span></div>
                    <button className="imp-fs-close-btn" onClick={onClose}>×</button>

                </div>

                <div className="format-header">
                    <h2>Report Format Selector</h2>

                </div>

                <div className="format-body">
                    {/* LEFT – Controls */}
                    <div className="    ">
                        <h3>Sections</h3>
                        <div className="sections-list">
                            {Object.entries(SECTION_LABELS).map(([key, label]) => (
                                <div key={key} className="section-toggle-row">
                                    <span className="section-label">{label}</span>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${localSections[key] ? "active" : ""}`}
                                        onClick={() => handleToggle(key)}
                                    >
                                        {localSections[key] ? "ON" : "OFF"}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="format-name-row">
                            <label>Format Name:</label>
                            <input
                                type="text"
                                onChange={e => setFormatName(e.target.value)}
                                placeholder="Give the name to the Format"
                            />
                        </div>

                        <div className="action-buttons">
                            <button onClick={handleSave} disabled={saving}>
                                {saving ? "Saving..." : "Save Format"}
                            </button>
                            <button className="apply-btn" onClick={handleApply}>
                                Apply to Report
                            </button>
                        </div>

                        {formats.length > 0 && (
                            <div className="saved-formats">
                                <h4>Saved Formats</h4>
                                <ul>
                                    {formats.map(fmt => (
                                        <li
                                            key={fmt.id}
                                            className={selectedFormatId === fmt.id ? "selected" : ""}
                                            onClick={() => handleLoadFormat(fmt)}
                                        >
                                            {fmt.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* RIGHT – Preview (same layout, only blur added) */}
                    <div className="right-panel">
                        <h3 className="Impedance-right-p-h">IMPEDANCE FORMAT PREVIEW</h3>
                        <div className="report-preview">

                            <div className={`preview-block-main patient-info ${!localSections.patient_info ? "blurred" : ""}`}>
                                <h4 style={{ textAlign: "center" }}>Patient Information</h4>
                                <div className="preview-block patient-info-sub">
                                    <p>Name: ___________</p>
                                    <p>ID: ___________</p>
                                    <p>Age: __</p>
                                    <p>Gender: __</p>
                                </div>
                            </div>

                            <div className="graphs-row">
                                <div className={`preview-graph ${!localSections.right_tympanogram ? "blurred" : ""}`}>
                                    <h4>Right Ear Tympanogram</h4>
                                    <div className="placeholder-chart red" style={{ color: "red" }}>Graph</div>
                                </div>

                                <div className={`preview-graph ${!localSections.left_tympanogram ? "blurred" : ""}`}>
                                    <h4>Left Ear Tympanogram</h4>
                                    <div className="placeholder-chart blue" style={{ color: "blue" }}>Graph</div>
                                </div>
                            </div>

                            <div className="items-report-format-imp">

                                <div className={`preview-block ${!localSections.tymp_results_table ? "blurred" : ""}`}>
                                    <h4>Tympanogram Results Table</h4>
                                    <table className="mini-table">
                                        <thead><tr><th>Parameter</th><th>Right</th><th>Left</th></tr></thead>
                                        <tbody>
                                            <tr><td>Compliance</td><td>1.2</td><td>1.1</td></tr>
                                            <tr><td>Pressure</td><td>-10</td><td>5</td></tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className={`preview-block ${!localSections.acoustic_reflex ? "blurred" : ""}`}>
                                    <h4>Acoustic Reflex</h4>
                                    <p>RE: 500 Hz: Ab 1000 Hz: Ab 2000 Hz: Ab</p>
                                    <p>LE: 500 Hz: Ab 1000 Hz: Ab 2000 Hz: Ab</p>
                                </div>

                                <div className={`preview-block ${!localSections.interpretation ? "blurred" : ""}`}>
                                    <h4>Interpretation</h4>
                                    <p>Right: Normal</p>
                                    <p>Left: Flat curve</p>
                                </div>

                                <div className={`preview-block ${!localSections.provisional_diagnosis ? "blurred" : ""}`}>
                                    <h4>Provisional Diagnosis</h4>
                                    <p>Right: Normal Hearing Sensitivity.</p>
                                    <p>Left: Normal Hearing Sensitivity.</p>
                                </div>

                                <div className={`preview-block ${!localSections.recommendations ? "blurred" : ""}`}>
                                    <h4>Recommendations</h4>
                                    <p>Follow-up after 3 months</p>
                                </div>

                            </div>

                            <div className={`preview-block signature ${!localSections.audiologist_details ? "blurred" : ""}`}>
                                <h4>Audiologist</h4>
                                <p>Dr.xxxxxx, M.Sc. Audiology</p>
                                <p>Reg. No. XXXX</p>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FormatSelectorIMP;
