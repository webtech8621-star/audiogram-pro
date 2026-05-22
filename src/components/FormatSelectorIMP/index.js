import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import "./index.css";

const DEFAULT_SECTIONS = {
    patient_info: true,
    right_tympanogram: true,
    left_tympanogram: true,
    tymp_results_table: true,
    acoustic_reflex: true,
    interpretation: true,
    provisional_diagnosis: true,
    recommendations: true,
    audiologist_details: true,
};

const SECTION_LABELS = {
    patient_info: "Patient Info",
    right_tympanogram: "Right Tympanogram",
    left_tympanogram: "Left Tympanogram",
    tymp_results_table: "Tymp Results Table",
    acoustic_reflex: "Acoustic Reflex",
    interpretation: "Interpretation",
    provisional_diagnosis: "Provisional Diagnosis",
    recommendations: "Recommendations",
    audiologist_details: "Audiologist Details",
};

function FormatSelectorIMP({
    isOpen,
    onClose,
    reportSections,
    setReportSections,
    currentFormatName,
    setCurrentFormatName,
}) {
    const [sections, setSections] = useState(DEFAULT_SECTIONS);
    const [formatName, setFormatName] = useState("");
    const [savedFormats, setSavedFormats] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [saveStatus, setSaveStatus] = useState("");
    const [applyStatus, setApplyStatus] = useState("");

    useEffect(() => {
        if (!isOpen) return;

        setSections(reportSections || DEFAULT_SECTIONS);
        setFormatName(currentFormatName || "Main Format");
        setSelectedId(null);
        setError("");
        setSaveStatus("");
        setApplyStatus("");

        loadFormats();
    }, [isOpen,
        reportSections,
        currentFormatName]);

    const loadFormats = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data, error } = await supabase
                .from("report_format_impedance")
                .select("*")
                .eq("user_id", session.user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setSavedFormats(data || []);
        } catch (err) {
            console.error(err);
            setError("Failed to load saved formats");
        }
    };

    const toggleSection = (key) => {
        setSections((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const handleApply = () => {
        setReportSections(sections);
        setCurrentFormatName(formatName.trim() || "Custom Format");

        setApplyStatus("applied");
        setTimeout(() => setApplyStatus(""), 1800);

        onClose();
    };

    const handleSave = async () => {
        try {
            setError("");
            if (!formatName.trim()) {
                return setError("Please enter a format name");
            }

            setLoading(true);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error("User not logged in");

            if (selectedId) {
                const { error } = await supabase
                    .from("report_format_impedance")
                    .update({
                        name: formatName.trim(),
                        sections,
                    })
                    .eq("id", selectedId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from("report_format_impedance")
                    .insert({
                        user_id: session.user.id,
                        name: formatName.trim(),
                        sections,
                        type: "impedance",
                    });
                if (error) throw error;
            }

            await loadFormats();
            setSelectedId(null);

            setSaveStatus("saved");
            setTimeout(() => setSaveStatus(""), 2000);
        } catch (err) {
            console.error(err);
            setError("Failed to save format");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this format?")) return;

        try {
            const { error } = await supabase
                .from("report_format_impedance")
                .delete()
                .eq("id", id);
            if (error) throw error;
            await loadFormats();
        } catch (err) {
            console.error(err);
            setError("Failed to delete format");
        }
    };

    const selectFormat = (format) => {
        setSelectedId(format.id);
        setFormatName(format.name);
        setSections({
            ...DEFAULT_SECTIONS,
            ...(format.sections || {}),
        });
    };

    if (!isOpen) return null;

    return (
        <div className="impfs-overlay">
            <div className="impfs-modal">
                {/* HEADER */}
                <div className="impfs-header">
                    <h2>Impedance Report Format</h2>
                    <button className="impfs-close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                {/* FORMAT NAME */}
                <div className="impfs-input-area">
                    <input
                        type="text"
                        placeholder="Enter format name"
                        value={formatName}
                        onChange={(e) => setFormatName(e.target.value)}
                    />
                </div>

                {/* SECTIONS */}
                <div className="impfs-sections">
                    {Object.keys(DEFAULT_SECTIONS).map((key) => (
                        <div key={key} className="impfs-row">
                            <span>{SECTION_LABELS[key]}</span>
                            <button
                                className={`impfs-toggle ${sections[key] ? "active" : "inactive"}`}
                                onClick={() => toggleSection(key)}
                            >
                                {sections[key] ? "ON" : "OFF"}
                            </button>
                        </div>
                    ))}
                </div>

                {/* ACTION BUTTONS */}
                <div className="impfs-actions">
                    <button className="impfs-apply-btn" onClick={handleApply}>
                        {applyStatus === "applied" ? "Applied ✓" : "Apply"}
                    </button>

                    <button
                        className="impfs-save-btn"
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading
                            ? "Saving..."
                            : saveStatus === "saved"
                                ? "Saved ✓"
                                : "Save"}
                    </button>
                </div>

                {/* SAVED FORMATS */}
                <div className="impfs-saved">
                    <h3>Saved Formats</h3>

                    {savedFormats.length === 0 && (
                        <p className="impfs-empty-text">No saved formats yet</p>
                    )}

                    {savedFormats.map((format) => (
                        <div
                            key={format.id}
                            className={`impfs-saved-item ${selectedId === format.id ? "selected" : ""
                                }`}
                        >
                            <div
                                className="impfs-saved-name"
                                onClick={() => selectFormat(format)}
                            >
                                {format.name}
                                {selectedId === format.id && " ★"}
                            </div>
                            <button
                                className="impfs-delete-btn"
                                onClick={() => handleDelete(format.id)}
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>

                {/* ERROR */}
                {error && <div className="impfs-error">{error}</div>}
            </div>
        </div>
    );
}

export default FormatSelectorIMP;