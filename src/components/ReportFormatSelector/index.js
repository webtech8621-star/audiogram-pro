import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import "./index.css";

const DEFAULT_SECTIONS = {
    front_page: true,
    front_patient_info: true,
    front_provisional_diagnosis: true,
    front_speech_audiometry: false,
    front_weber_test: false,
    front_recommendations: true,
    front_audiologist_details: true,
    patient_info: true,
    right_ear_graph: true,
    left_ear_graph: true,
    symbols_legend_right: true,
    symbols_legend_left: true,
    provisional_diagnosis: true,
    speech_audiometry: true,
    weber_test: true,
    recommendations: true,
    audiologist_details: true,
};

function ReportFormatSelector({
    onClose,
    onSelectFormat,
    patientInfo,
    diagnosis,
    speechData,
    weberData,
    ptaValues,
}) {
    const [sections, setSections] = useState(DEFAULT_SECTIONS);
    const [formatName, setFormatName] = useState('');
    const [savedFormats, setSavedFormats] = useState([]);
    const [error, setError] = useState(null);
    const [applyStatus, setApplyStatus] = useState('idle');     // idle | applied
    const [saveStatus, setSaveStatus] = useState("idle");       // idle | saved
    const [selectedFormatId, setSelectedFormatId] = useState(null);
    const [currentAppliedId, setCurrentAppliedId] = useState(null);


    const isCurrentlyApplied =
        currentAppliedId === selectedFormatId &&
        selectedFormatId !== null;

    const loadSavedFormats = React.useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data, error } = await supabase
                .from("puretone_report_format")
                .select("*")
                .eq("user_id", session.user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            setSavedFormats(data || []);

            const applied = data.find(f => f.is_applied === true);
            if (applied) {
                setCurrentAppliedId(applied.id);
                // Only auto-apply if user hasn't selected/edited anything yet
                if (!selectedFormatId) {
                    setSections(applied.sections);
                    setFormatName(applied.format_name || "");
                    setSelectedFormatId(applied.id);
                    onSelectFormat(applied.sections, applied.format_name);
                }
            } else {
                setCurrentAppliedId(null);
            }
        } catch (err) {
            console.error(err);
            setError("Could not load formats");
        }
    }, [onSelectFormat, selectedFormatId, setError]);

    useEffect(() => {
        loadSavedFormats();
    }, [loadSavedFormats]);

    const toggle = (key) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleApply = async () => {
        setApplyStatus('applying');
        setError(null);
        console.log(error)

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            // Reset all applied flags
            await supabase
                .from("puretone_report_format")
                .update({ is_applied: false })
                .eq("user_id", session.user.id);

            // Insert current as the new applied format
            const { data: newApplied, error } = await supabase
                .from("puretone_report_format")
                .insert({
                    user_id: session.user.id,
                    format_name: formatName.trim() || "Custom Applied",
                    sections,
                    is_applied: true
                })
                .select()
                .single();

            if (error) throw error;

            setCurrentAppliedId(newApplied.id);
            setApplyStatus('applied');
            setTimeout(() => setApplyStatus('idle'), 1800); // brief flash

            onSelectFormat(sections, formatName.trim() || "Custom Applied");

            loadSavedFormats();

        } catch (err) {
            console.error(err);
            setError("Apply failed");
            setApplyStatus('idle');
        }
    };

    const saveFormat = async () => {
        if (!formatName || !formatName.trim()) {
            setError("Enter format name");
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("puretone_report_format")
                .insert({
                    user_id: session.user.id,
                    format_name: formatName.trim(),
                    sections,
                    is_applied: false
                });

            if (error) throw error;

            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 1500);

            loadSavedFormats();

        } catch (err) {
            console.error(err);
            setError("Save failed");
        }
    };

    const deleteFormat = async (id) => {
        if (!window.confirm("Delete this format?")) return;

        try {
            await supabase
                .from("puretone_report_format")
                .delete()
                .eq("id", id);

            loadSavedFormats();

            if (selectedFormatId === id) {
                setSelectedFormatId(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadSaved = (saved) => {
        setSections(saved.sections);
        setFormatName(saved.format_name || "");
        setSelectedFormatId(saved.id);
        onSelectFormat(saved.sections, saved.format_name);
    };

    return (
        <div className="FR-overlay" onClick={onClose}>
            <div className="FR-modal" onClick={(e) => e.stopPropagation()}>
                {/* Left Panel - Controls */}
                <div className="FR-left-panel">
                    <h2 className="FR-title">FORMAT SELECTOR</h2>


                    <input
                        type="text"
                        className="FR-format-input"
                        value={formatName}
                        onChange={(e) => setFormatName(e.target.value)}
                        placeholder="Format name (e.g. Basic Report)"
                    />

                    {/* Front Page Toggle & Sections */}
                    <h4 className="FR-section-title">Front Page</h4>
                    <div className="FR-toggle-row">
                        <span className="FR-toggle-label">Include Front Page</span>
                        <button
                            className={`FR-toggle-btn ${sections.front_page ? "FR-on" : "FR-off"}`}
                            onClick={() => toggle('front_page')}
                        >
                            {sections.front_page ? "ON" : "OFF"}
                        </button>
                    </div>

                    {sections.front_page && (
                        <>
                            <h4 className="FR-section-title">Front Page Sections</h4>
                            <div className="FR-toggle-grid">
                                <div className="FR-toggle-row">
                                    <span className="FR-toggle-label">Patient Info</span>
                                    <button
                                        className={`FR-toggle-btn ${sections.front_patient_info ? "FR-on" : "FR-off"}`}
                                        onClick={() => toggle('front_patient_info')}
                                    >
                                        {sections.front_patient_info ? "ON" : "OFF"}
                                    </button>
                                </div>
                                <div className="FR-toggle-row">
                                    <span className="FR-toggle-label">Provisional Diagnosis</span>
                                    <button
                                        className={`FR-toggle-btn ${sections.front_provisional_diagnosis ? "FR-on" : "FR-off"}`}
                                        onClick={() => toggle('front_provisional_diagnosis')}
                                    >
                                        {sections.front_provisional_diagnosis ? "ON" : "OFF"}
                                    </button>
                                </div>
                                <div className="FR-toggle-row">
                                    <span className="FR-toggle-label">Speech Audiometry</span>
                                    <button
                                        className={`FR-toggle-btn ${sections.front_speech_audiometry ? "FR-on" : "FR-off"}`}
                                        onClick={() => toggle('front_speech_audiometry')}
                                    >
                                        {sections.front_speech_audiometry ? "ON" : "OFF"}
                                    </button>
                                </div>
                                <div className="FR-toggle-row">
                                    <span className="FR-toggle-label">Weber Test</span>
                                    <button
                                        className={`FR-toggle-btn ${sections.front_weber_test ? "FR-on" : "FR-off"}`}
                                        onClick={() => toggle('front_weber_test')}
                                    >
                                        {sections.front_weber_test ? "ON" : "OFF"}
                                    </button>
                                </div>
                                <div className="FR-toggle-row highlight-toggle">
                                    <span className="FR-toggle-label">Recommendations</span>
                                    <button
                                        className={`FR-toggle-btn ${sections.front_recommendations ? "FR-on" : "FR-off"}`}
                                        onClick={() => toggle('front_recommendations')}
                                    >
                                        {sections.front_recommendations ? "ON" : "OFF"}
                                    </button>
                                </div>
                                <div className="FR-toggle-row">
                                    <span className="FR-toggle-label">Audiologist Details</span>
                                    <button
                                        className={`FR-toggle-btn ${sections.front_audiologist_details ? "FR-on" : "FR-off"}`}
                                        onClick={() => toggle('front_audiologist_details')}
                                    >
                                        {sections.front_audiologist_details ? "ON" : "OFF"}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Main Report (Back) Sections */}
                    <h4 className="FR-section-title">Main Report Sections</h4>
                    <div className="FR-toggle-grid">
                        <div className="FR-toggle-row">
                            <span className="FR-toggle-label">Patient Info</span>
                            <button
                                className={`FR-toggle-btn ${sections.patient_info ? "FR-on" : "FR-off"}`}
                                onClick={() => toggle('patient_info')}
                            >
                                {sections.patient_info ? "ON" : "OFF"}
                            </button>
                        </div>

                        <div className="FR-toggle-row">
                            <span className="FR-toggle-label">Right Ear Graph</span>
                            <button
                                className={`FR-toggle-btn ${sections.right_ear_graph ? "FR-on" : "FR-off"}`}
                                onClick={() => toggle('right_ear_graph')}
                            >
                                {sections.right_ear_graph ? "ON" : "OFF"}
                            </button>
                        </div>

                        <div className="FR-toggle-row">
                            <span className="FR-toggle-label">Left Ear Graph</span>
                            <button
                                className={`FR-toggle-btn ${sections.left_ear_graph ? "FR-on" : "FR-off"}`}
                                onClick={() => toggle('left_ear_graph')}
                            >
                                {sections.left_ear_graph ? "ON" : "OFF"}
                            </button>
                        </div>

                        <div className="FR-toggle-row">
                            <span className="FR-toggle-label">Symbols Legend (Right)</span>
                            <button
                                className={`FR-toggle-btn ${sections.symbols_legend_right ? "FR-on" : "FR-off"}`}
                                onClick={() => toggle('symbols_legend_right')}
                            >
                                {sections.symbols_legend_right ? "ON" : "OFF"}
                            </button>
                        </div>

                        <div className="FR-toggle-row">
                            <span className="FR-toggle-label">Symbols Legend (Left)</span>
                            <button
                                className={`FR-toggle-btn ${sections.symbols_legend_left ? "FR-on" : "FR-off"}`}
                                onClick={() => toggle('symbols_legend_left')}
                            >
                                {sections.symbols_legend_left ? "ON" : "OFF"}
                            </button>
                        </div>

                        <div className="FR-toggle-row">
                            <span className="FR-toggle-label">Provisional Diagnosis</span>
                            <button
                                className={`FR-toggle-btn ${sections.provisional_diagnosis ? "FR-on" : "FR-off"}`}
                                onClick={() => toggle('provisional_diagnosis')}
                            >
                                {sections.provisional_diagnosis ? "ON" : "OFF"}
                            </button>
                        </div>

                        <div className="FR-toggle-row">
                            <span className="FR-toggle-label">Speech Audiometry</span>
                            <button
                                className={`FR-toggle-btn ${sections.speech_audiometry ? "FR-on" : "FR-off"}`}
                                onClick={() => toggle('speech_audiometry')}
                            >
                                {sections.speech_audiometry ? "ON" : "OFF"}
                            </button>
                        </div>

                        <div className="FR-toggle-row">
                            <span className="FR-toggle-label">Weber Test</span>
                            <button
                                className={`FR-toggle-btn ${sections.weber_test ? "FR-on" : "FR-off"}`}
                                onClick={() => toggle('weber_test')}
                            >
                                {sections.weber_test ? "ON" : "OFF"}
                            </button>
                        </div>

                        <div className="FR-toggle-row highlight-toggle">
                            <span className="FR-toggle-label">Recommendations</span>
                            <button
                                className={`FR-toggle-btn ${sections.recommendations ? "FR-on" : "FR-off"}`}
                                onClick={() => toggle('recommendations')}
                            >
                                {sections.recommendations ? "ON" : "OFF"}
                            </button>
                        </div>

                        <div className="FR-toggle-row">
                            <span className="FR-toggle-label">Audiologist Details</span>
                            <button
                                className={`FR-toggle-btn ${sections.audiologist_details ? "FR-on" : "FR-off"}`}
                                onClick={() => toggle('audiologist_details')}
                            >
                                {sections.audiologist_details ? "ON" : "OFF"}
                            </button>
                        </div>
                    </div>

                    <div className="FR-action-buttons">
                        <button
                            className={`FR-apply-btn ${applyStatus === 'applied' || applyStatus === 'applying'
                                ? 'FR-applied'
                                : ''
                                }`}
                            onClick={handleApply}
                            disabled={applyStatus === 'applying' || isCurrentlyApplied}
                        >
                            {applyStatus === 'applying'
                                ? 'Applying...'
                                : applyStatus === 'applied' || isCurrentlyApplied
                                    ? 'Applied'
                                    : 'Apply'}
                        </button>

                        <button
                            className={`FR-save-btn ${saveStatus === "saved" ? "FR-saved" : ""}`}
                            disabled={!formatName.trim()}
                            onClick={saveFormat}
                        >
                            {saveStatus === "saved" ? "Saved!" : "Save Format"}
                        </button>

                        <button className="FR-cancel-btn" onClick={onClose}>
                            Cancel
                        </button>
                    </div>

                    {savedFormats.length > 0 && (
                        <div className="FR-saved-section">
                            <h4 className="FR-section-title">Saved Formats</h4>
                            <div className="FR-saved-list">
                                {savedFormats.map((f) => (
                                    <div
                                        key={f.id}
                                        className={`FR-saved-item ${selectedFormatId === f.id ? 'FR-active' : ''}`}
                                        onClick={() => loadSaved(f)}
                                    >
                                        <span className="FR-format-name">{f.format_name}</span>
                                        <button
                                            className="FR-delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteFormat(f.id);
                                            }}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Report Preview */}
                <div className="FR-right-panel">
                    <h2 className="FR-report-title">PURE TONE AUDIOMETRY</h2>
                    {sections.front_page && (
                        <div className="FR-front-page-preview">
                            <h3 className="FR-page-heading">Front Page</h3>

                            {sections.front_patient_info && (
                                <div className="FR-patient-info-preview">
                                    <h4 className="FR-panel-title">PATIENT INFORMATION</h4>
                                    <div className="FR-patient-details">
                                        <div className="FR-patient-row">
                                            <p className="para-pt-detail">
                                                <strong className="pt-header-details">Name :</strong> xxxxxx
                                            </p>
                                            <p className="para-pt-detail">
                                                <strong className="pt-header-details">Age/Gender :</strong> xxxxxyears / xxxxxx
                                            </p>
                                            <p className="para-pt-detail">
                                                <strong className="pt-header-details">Address :</strong> xxxxxx
                                            </p>
                                            <p className="para-pt-detail">
                                                <strong className="pt-header-details">Date :</strong> xxxxxx
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="FR-front-compact-grid">
                                {sections.front_speech_audiometry && (
                                    <div className="FR-panel FR-speech-panel">
                                        <h4 className="FR-panel-title">Speech Audiometry (Front)</h4>
                                        <table className="FR-speech-table">
                                            <thead>
                                                <tr>
                                                    <th>EAR</th>
                                                    <th>PTA</th>
                                                    <th>SRT</th>
                                                    <th>SDS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr><td>RIGHT</td><td>—</td><td>—</td><td>—</td></tr>
                                                <tr><td>LEFT</td><td>—</td><td>—</td><td>—</td></tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {sections.front_weber_test && (
                                    <div className="FR-panel FR-weber-panel">
                                        <h4 className="FR-panel-title">Weber Test (Front)</h4>
                                        <table className="FR-weber-table">
                                            <thead>
                                                <tr>
                                                    <th>Freq (Hz)</th>
                                                    <th>Right</th>
                                                    <th>Left</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {[250, 500, 1000, 2000].map(freq => (
                                                    <tr key={freq}>
                                                        <td>{freq}</td>
                                                        <td>—</td>
                                                        <td>—</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {sections.front_provisional_diagnosis && (
                                <div className="FR-panel FR-provisional-panel">
                                    <h4 className="FR-panel-title">Provisional Diagnosis (Front)</h4>
                                    <div className="FR-panel-content">
                                        Right: Normal Hearing<br />
                                        Left: Normal Hearing
                                    </div>
                                </div>
                            )}

                            {sections.front_recommendations && (
                                <div className="FR-panel FR-recommendations-panel">
                                    <h4 className="FR-panel-title-R">RECOMMENDATIONS (Front Page – Summary)</h4>
                                    <div className="FR-panel-content" style={{ fontSize: "13px" }}>
                                        • Avoid loud noise exposure<br />
                                        • Follow-up in 6 months<br />
                                        • Consider hearing protection
                                    </div>
                                </div>
                            )}

                            {sections.front_audiologist_details && (
                                <div className="FR-audiologist">
                                    <h4 className="FR-panel-title">AUDIOLOGIST</h4>
                                    <div className="FR-audiologist-content">
                                        Dr. Suresh Kashetty<br />
                                        MAUD PGDNA A3090889<br />
                                        Koram ENT Hospital<br />
                                        8096868398
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {sections.front_page && (
                        <div className="FR-page-separator">
                            ─────────────── Page Break ───────────────
                        </div>
                    )}

                    <div className={`FR-patient-info-preview ${sections.patient_info ? '' : 'FR-blurred'}`}>
                        <h4 className="FR-panel-title">PATIENT INFORMATION</h4>
                        <div className="FR-patient-details">
                            <div className="FR-patient-row">
                                <p className='para-pt-detail'><strong className='pt-header-details'>Name : </strong>xxxxxx</p>
                                <p className='para-pt-detail'><strong className='pt-header-details'>Age/Gender :</strong> xxxxxyears / xxxxxx</p>
                                <p className='para-pt-detail'><strong className='pt-header-details'>Address :  </strong>xxxxxx</p>
                                <p className='para-pt-detail'><strong className='pt-header-details'>Date : </strong>xxxxxx </p>
                            </div>
                        </div>
                    </div>

                    <div className="FR-ears-container">
                        <div className={`FR-ear-box ${sections.right_ear_graph ? '' : 'FR-blurred'} FR-right-ear`}>
                            <h4 className="FR-ear-title">RIGHT EAR</h4>
                            <div className="FR-audiogram-placeholder">
                                Audiogram (Right)
                            </div>
                            <p className="FR-pta-value">
                                PTA: {`00.00` ?? '—'} dB
                            </p>
                        </div>

                        <div className={`FR-ear-box ${sections.left_ear_graph ? '' : 'FR-blurred'} FR-left-ear`}>
                            <h4 className="FR-ear-title">LEFT EAR</h4>
                            <div className="FR-audiogram-placeholder">
                                Audiogram (Left)
                            </div>
                            <p className="FR-pta-value">
                                PTA: {`00.00` ?? '—'} dB
                            </p>
                        </div>
                    </div>

                    <div className="FR-bottom-panels">
                        <div className={`FR-panel FR-provisional-panel ${sections.provisional_diagnosis ? '' : 'FR-blurred'}`}>
                            <h4 className="FR-panel-title">Provisional Diagnosis</h4>
                            <div className="FR-panel-content">
                                <div className="FR-diagnosis-row">
                                    <span className="FR-diagnosis-label">Right:</span>
                                    <span className="FR-diagnosis-value">{`   xxxxxxxxxxxxx` || 'Normal Hearing.'}</span>
                                </div>
                                <div className="FR-diagnosis-row">
                                    <span className="FR-diagnosis-label">Left:</span>
                                    <span className="FR-diagnosis-value">{`   xxxxxxxxxxxxx` || 'Normal Hearing.'}</span>
                                </div>
                            </div>
                        </div>

                        <div className={`FR-panel FR-speech-panel ${sections.speech_audiometry ? '' : 'FR-blurred'}`}>
                            <h4 className="FR-panel-title">Speech Audiometry</h4>
                            <table className="FR-speech-table">
                                <thead>
                                    <tr>
                                        <th>EAR</th>
                                        <th>PTA</th>
                                        <th>SRT</th>
                                        <th>SDS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>RIGHT</td>
                                        <td>{speechData?.right?.pta || '—'}</td>
                                        <td>{speechData?.right?.srt || '—'}</td>
                                        <td>{speechData?.right?.sds || '—'}</td>
                                    </tr>
                                    <tr>
                                        <td>LEFT</td>
                                        <td>{speechData?.left?.pta || '—'}</td>
                                        <td>{speechData?.left?.srt || '—'}</td>
                                        <td>{speechData?.left?.sds || '—'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className={`FR-panel FR-weber-panel ${sections.weber_test ? '' : 'FR-blurred'}`}>
                            <h4 className="FR-panel-title">Weber Test</h4>
                            <table className="FR-weber-table">
                                <thead>
                                    <tr>
                                        <th>Frequency In Hz</th>
                                        <th>Right</th>
                                        <th>Left</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[250, 500, 1000, 2000].map((freq) => (
                                        <tr key={freq}>
                                            <td>{freq}</td>
                                            <td>{weberData?.[freq]?.right || '—'}</td>
                                            <td>{weberData?.[freq]?.left || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className='recomm-audiolo-main-rf'>
                        <div className={`FR-panel FR-recommendations-panel ${sections.recommendations ? '' : 'FR-blurred'}`}>
                            <h4 className="FR-panel-title">RECOMMENDATIONS (Main Page)</h4>
                            <div className="FR-panel-content" style={{ fontSize: "14px", lineHeight: "1.5" }}>
                                ..........................
                            </div>
                        </div>
                        <div className={`FR-audiologist ${sections.audiologist_details ? '' : 'FR-blurred'}`}>
                            <h4 className="FR-panel-title">AUDIOLOGIST</h4>
                            <div className="FR-audiologist-content">
                                Dr.Suresh Kashetty<br />
                                MAUD PGDNA A3090889<br />
                                Koram ENT Hospital<br />
                                8096868398
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ReportFormatSelector;