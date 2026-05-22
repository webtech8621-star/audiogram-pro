import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import "./index.css";

const DEFAULT_SECTIONS = {
    front_page: false,
    front_patient_info: true,
    front_provisional_diagnosis: true,
    front_recommendations: true,
    front_audiologist_details: false,

    patient_info: true,
    provisional_diagnosis: true,
    right_ear_graph: true,
    left_ear_graph: true,
    speech_audiometry: true,
    weber_test: true,
    recommendations: true,
    audiologist_details: false,
};

// DEFAULT SAVED FORMATS
const DEFAULT_FORMATS = [
    {
        id: "default_main",
        format_name: "Main Page Format",
        is_default: true,
        sections: {
            front_page: false,
            patient_info: true,
            right_ear_graph: true,
            left_ear_graph: true,
            provisional_diagnosis: true,
            speech_audiometry: true,
            weber_test: true,
            recommendations: true,
            audiologist_details: false,
        },
    },

    {
        id: "default_front",
        format_name: "Two Page Format",
        is_default: true,
        sections: {
            front_page: true,
            front_patient_info: true,
            front_provisional_diagnosis: true,
            front_recommendations: true,
            front_audiologist_details: false,

            patient_info: true,
            right_ear_graph: true,
            left_ear_graph: true,
            provisional_diagnosis: true,
            speech_audiometry: true,
            weber_test: true,
            recommendations: true,
            audiologist_details: false,
        },
    },
];

function ReportFormatSelector({ onClose, onSelectFormat }) {

    const [sections, setSections] = useState(DEFAULT_SECTIONS);
    const [formatName, setFormatName] = useState('');
    const [savedFormats, setSavedFormats] = useState([]);
    const [error, setError] = useState(null);

    const [applyStatus, setApplyStatus] = useState('idle');
    const [saveStatus, setSaveStatus] = useState('idle');

    const [selectedFormatId, setSelectedFormatId] = useState(null);
    const [initialized, setInitialized] = useState(false);

    // =========================================
    // LOAD FORMATS
    // =========================================
    const loadSavedFormats = useCallback(async () => {

        try {

            setError(null);

            const {
                data: { session },
            } = await supabase.auth.getSession();

            let userFormats = [];

            if (session?.user) {

                const { data, error } = await supabase
                    .from("puretone_report_format")
                    .select("*")
                    .eq("user_id", session.user.id)
                    .order("created_at", { ascending: false });

                if (error) throw error;

                userFormats = data || [];
            }

            // MERGE DEFAULT + USER FORMATS
            const mergedFormats = [
                ...DEFAULT_FORMATS,
                ...userFormats,
            ];

            setSavedFormats(mergedFormats);

            // LOAD APPLIED FORMAT
            const appliedFormat = userFormats.find(
                (item) => item.is_applied === true
            );

            if (!initialized) {

                if (appliedFormat) {

                    const restoredSections = {
                        ...DEFAULT_SECTIONS,
                        ...(appliedFormat.sections || {}),
                    };

                    setSections(restoredSections);
                    setFormatName(appliedFormat.format_name || "");
                    setSelectedFormatId(appliedFormat.id);

                    if (onSelectFormat) {
                        onSelectFormat(
                            restoredSections,
                            appliedFormat.format_name || ""
                        );
                    }

                } else {

                    // DEFAULT APPLY
                    if (onSelectFormat) {
                        onSelectFormat(
                            DEFAULT_SECTIONS,
                            "Main Page Format"
                        );
                    }
                }

                setInitialized(true);
            }

        } catch (err) {
            console.error(err);
            setError("Failed to load formats");
        }

    }, [onSelectFormat, initialized]);

    useEffect(() => {
        loadSavedFormats();
    }, [loadSavedFormats]);

    // =========================================
    // TOGGLE
    // =========================================
    const handleToggle = (key, e) => {

        e.preventDefault();
        e.stopPropagation();

        setSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // =========================================
    // APPLY
    // =========================================
    const handleApply = async () => {

        try {

            setApplyStatus("applying");
            setError(null);

            // APPLY DIRECTLY
            onSelectFormat(
                sections,
                formatName || "Custom Format"
            );

            // IF DATABASE FORMAT
            if (
                selectedFormatId &&
                !String(selectedFormatId).startsWith("default_")
            ) {

                const {
                    data: { session },
                } = await supabase.auth.getSession();

                if (session?.user) {

                    // RESET
                    await supabase
                        .from("puretone_report_format")
                        .update({ is_applied: false })
                        .eq("user_id", session.user.id);

                    // APPLY CURRENT
                    await supabase
                        .from("puretone_report_format")
                        .update({ is_applied: true })
                        .eq("id", selectedFormatId);
                }
            }

            setApplyStatus("applied");

            setTimeout(() => {
                setApplyStatus("idle");
            }, 1500);

        } catch (err) {

            console.error(err);

            setError("Apply failed");

            setApplyStatus("idle");
        }
    };

    // =========================================
    // SAVE
    // =========================================
    const handleSave = async () => {

        try {

            setError(null);

            if (!formatName.trim()) {
                return setError("Format name required");
            }

            setSaveStatus("saving");

            const {
                data: { session },
            } = await supabase.auth.getSession();

            if (!session?.user) {
                throw new Error("User not authenticated");
            }

            // =========================================
            // EXISTING USER FORMAT
            // =========================================
            if (
                selectedFormatId &&
                !String(selectedFormatId).startsWith("default_")
            ) {

                const existingFormat = savedFormats.find(
                    (f) => f.id === selectedFormatId
                );

                const oldSections = JSON.stringify(
                    existingFormat.sections || {}
                );

                const newSections = JSON.stringify(sections);

                const oldName =
                    existingFormat.format_name?.trim();

                const newName = formatName.trim();

                // NO CHANGES
                if (
                    oldSections === newSections &&
                    oldName === newName
                ) {

                    setSaveStatus("idle");

                    return setError(
                        "Format already saved"
                    );
                }

                // UPDATE
                const { error } = await supabase
                    .from("puretone_report_format")
                    .update({
                        sections,
                        format_name: newName,
                    })
                    .eq("id", selectedFormatId);

                if (error) throw error;

            } else {

                // =========================================
                // NEW SAVE
                // =========================================

                const existingSameName = savedFormats.find(
                    (f) =>
                        f.format_name
                            .trim()
                            .toLowerCase() ===
                        formatName
                            .trim()
                            .toLowerCase()
                );

                if (existingSameName) {

                    setSaveStatus("idle");

                    return setError(
                        "Format name already exists"
                    );
                }

                const { data, error } = await supabase
                    .from("puretone_report_format")
                    .insert({
                        user_id: session.user.id,
                        format_name: formatName.trim(),
                        sections,
                        is_applied: false,
                    })
                    .select()
                    .single();

                if (error) throw error;

                setSelectedFormatId(data.id);
            }

            setSaveStatus("saved");

            setTimeout(() => {
                setSaveStatus("idle");
            }, 1500);

            await loadSavedFormats();

        } catch (err) {

            console.error(err);

            setSaveStatus("idle");

            setError(err.message || "Save failed");
        }
    };

    // =========================================
    // DELETE
    // =========================================
    const handleDelete = async (id, e) => {

        e.stopPropagation();

        if (
            String(id).startsWith("default_")
        ) {
            return;
        }

        if (!window.confirm("Delete this format?"))
            return;

        await supabase
            .from("puretone_report_format")
            .delete()
            .eq("id", id);

        loadSavedFormats();
    };

    return (
        <div className="FR-overlay" onClick={onClose}>

            <div
                className="FR-modal"
                onClick={(e) => e.stopPropagation()}
            >

                <h2 className="FR-title">
                    Report Format Customizer
                </h2>

                {/* INPUT */}
                <div className="FR-input-group">

                    <label>Format Name</label>

                    <input
                        type="text"
                        className="FR-format-input"
                        value={formatName}
                        onChange={(e) =>
                            setFormatName(e.target.value)
                        }
                        placeholder="Enter format name..."
                    />

                    <div className="FR-action-buttons">

                        <button
                            className={`FR-apply-btn ${applyStatus === 'applied'
                                ? 'FR-applied'
                                : ''
                                }`}
                            onClick={handleApply}
                            disabled={
                                applyStatus === 'applying'
                            }
                        >
                            {applyStatus === 'applying'
                                ? '...'
                                : applyStatus === 'applied'
                                    ? '✓ Applied'
                                    : 'Apply'}
                        </button>

                        <button
                            className="FR-save-btn"
                            onClick={handleSave}
                        >
                            {saveStatus === 'saved'
                                ? '✓ Saved'
                                : 'Save'}
                        </button>

                        <button
                            className="FR-cancel-btn"
                            onClick={onClose}
                        >
                            Close
                        </button>

                    </div>
                </div>

                {/* SCROLL AREA */}
                <div className="FR-scroll-area">

                    {/* FRONT PAGE */}
                    <div className="FR-section">

                        <h4 className="FR-section-title">
                            Front Page
                        </h4>

                        <div className="FR-toggle-row">

                            <span>
                                Include Front Page
                            </span>

                            <button
                                className={`FR-toggle-btn ${sections.front_page
                                    ? "FR-on"
                                    : "FR-off"
                                    }`}
                                onClick={(e) =>
                                    handleToggle(
                                        'front_page',
                                        e
                                    )
                                }
                            >
                                {sections.front_page
                                    ? "ON"
                                    : "OFF"}
                            </button>
                        </div>

                        {sections.front_page && (

                            <div className="FR-sub-section">

                                {[
                                    'front_patient_info',
                                    'front_provisional_diagnosis',
                                    'front_recommendations',
                                    'front_audiologist_details'
                                ].map(key => (

                                    <div
                                        className="FR-toggle-row"
                                        key={key}
                                    >

                                        <span className="capitalize">
                                            {key
                                                .replace(/_/g, ' ')
                                                .replace('front ', '')}
                                        </span>

                                        <button
                                            className={`FR-toggle-btn ${sections[key]
                                                ? "FR-on"
                                                : "FR-off"
                                                }`}
                                            onClick={(e) =>
                                                handleToggle(
                                                    key,
                                                    e
                                                )
                                            }
                                        >
                                            {sections[key]
                                                ? "ON"
                                                : "OFF"}
                                        </button>

                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* MAIN PAGE */}
                    <div className="FR-section">

                        <h4 className="FR-section-title">
                            Main Report Page
                        </h4>

                        {[
                            'patient_info',
                            'right_ear_graph',
                            'left_ear_graph',
                            'provisional_diagnosis',
                            'speech_audiometry',
                            'weber_test',
                            'recommendations',
                            'audiologist_details'
                        ].map(key => (

                            <div
                                className="FR-toggle-row"
                                key={key}
                            >

                                <span className="capitalize">
                                    {key.replace(/_/g, ' ')}
                                </span>

                                <button
                                    className={`FR-toggle-btn ${sections[key]
                                        ? "FR-on"
                                        : "FR-off"
                                        }`}
                                    onClick={(e) =>
                                        handleToggle(
                                            key,
                                            e
                                        )
                                    }
                                >
                                    {sections[key]
                                        ? "ON"
                                        : "OFF"}
                                </button>

                            </div>
                        ))}
                    </div>

                    {/* SAVED FORMATS */}
                    {savedFormats.length > 0 && (

                        <div className="FR-saved-section">

                            <h4 className="FR-section-title">
                                Saved Formats
                            </h4>

                            {savedFormats.map((f) => (

                                <div
                                    key={f.id}
                                    className={`FR-saved-item ${selectedFormatId === f.id
                                        ? 'FR-active'
                                        : ''
                                        }`}
                                    onClick={(e) => {

                                        e.stopPropagation();

                                        const merged = {
                                            ...DEFAULT_SECTIONS,
                                            ...(f.sections || {}),
                                        };

                                        setSections(merged);

                                        setFormatName(
                                            f.format_name
                                        );

                                        setSelectedFormatId(
                                            f.id
                                        );
                                    }}
                                >

                                    <span>
                                        {f.format_name}

                                        {f.is_default && (
                                            <small
                                                style={{
                                                    marginLeft: 6,
                                                    color: "#888",
                                                }}
                                            >
                                                (Default)
                                            </small>
                                        )}
                                    </span>

                                    {!f.is_default && (
                                        <button
                                            className="FR-delete-btn"
                                            onClick={(e) =>
                                                handleDelete(
                                                    f.id,
                                                    e
                                                )
                                            }
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <p className="FR-error">
                        ⚠️ {error}
                    </p>
                )}
            </div>
        </div>
    );
}

export default ReportFormatSelector;