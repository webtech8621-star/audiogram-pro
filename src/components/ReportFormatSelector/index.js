import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import "./index.css";

const DEFAULT_SECTIONS = {
    front_page: true,
    front_patient_info: true,
    front_provisional_diagnosis: true,
    front_speech_audiometry: false,
    front_weber_test: false,
    front_recommendations: true,          // ← added for front page
    front_audiologist_details: true,
    patient_info: true,
    right_ear_graph: true,
    left_ear_graph: true,
    symbols_legend_right: true,
    symbols_legend_left: true,
    provisional_diagnosis: true,
    speech_audiometry: true,
    weber_test: true,
    recommendations: true,                // ← for main/back page
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
    const [applyStatus, setApplyStatus] = useState('idle');

    useEffect(() => {
        loadSavedFormats();
    }, []);

    const loadSavedFormats = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { data, error } = await supabase
                .from('report_formats')
                .select('id, name, sections')
                .eq('user_id', session.user.id)
                .order('name');

            if (error) throw error;
            setSavedFormats(data || []);
        } catch (err) {
            console.error(err);
            setError('Could not load saved formats');
        }
    };

    const toggle = (key) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleApply = () => {
        onSelectFormat(sections, 'Custom Applied');
        setApplyStatus('applied');
        setTimeout(() => setApplyStatus('idle'), 1800);
        onClose();
    };

    const saveFormat = async () => {
        if (!formatName.trim()) {
            setError('Enter format name');
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error('Not authenticated');

            const { error } = await supabase
                .from('report_formats')
                .insert({
                    user_id: session.user.id,
                    name: formatName.trim(),
                    sections,
                });

            if (error) throw error;

            alert('Format saved!');
            onSelectFormat(sections, formatName.trim());
            setFormatName('');
            loadSavedFormats();
        } catch (err) {
            console.error(err);
            setError('Save failed');
        }
    };

    const deleteFormat = async (id) => {
        if (!window.confirm('Delete?')) return;
        try {
            await supabase.from('report_formats').delete().eq('id', id);
            setSavedFormats(prev => prev.filter(f => f.id !== id));
        } catch (err) {
            alert('Delete failed');
        }
    };

    const loadSaved = (saved) => {
        setSections(saved.sections);
        onSelectFormat(saved.sections, saved.name);
        setFormatName(saved.name);
    };

    return (
        <div className="FR-overlay" onClick={onClose}>
            <div className="FR-modal" onClick={(e) => e.stopPropagation()}>
                {/* Left Panel - Controls */}
                <div className="FR-left-panel">
                    <h2 className="FR-title">FORMAT SELECTOR</h2>

                    {error && <div className="FR-error">{error}</div>}

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
                                {/* Front page Recommendations toggle */}
                                <div className="FR-toggle-row highlight-toggle">
                                    <span className="FR-toggle-label">Recommendations</span>
                                    <button
                                        className={`FR-toggle-btn ${sections.front_recommendations ? "FR-on" : "FR-off"}`}
                                        onClick={() => toggle('front_recommendations')}
                                    >
                                        {sections.front_

                                            ? "ON" : "OFF"}
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

                        {/* Main page Recommendations toggle */}
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
                            className={`FR-apply-btn ${applyStatus === 'applied' ? 'FR-applied' : ''}`}
                            onClick={handleApply}
                        >
                            {applyStatus === 'applied' ? 'Applied!' : 'Apply'}
                        </button>

                        <button
                            className="FR-save-btn"
                            disabled={!formatName.trim()}
                            onClick={saveFormat}
                        >
                            Save Format
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
                                        className={`FR-saved-item ${formatName === f.name ? 'FR-active' : ''}`}
                                        onClick={() => loadSaved(f)}
                                    >
                                        <span className="FR-format-name">{f.name}</span>
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

                    {/* Separator when both pages are shown */}
                    {sections.front_page && (
                        <div className="FR-page-separator">
                            ─────────────── Page Break ───────────────
                        </div>
                    )}

                    {/* Patient Info Preview */}
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

                    {/* Ears - Side by Side */}
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

                    {/* Bottom Panels - Main Report */}
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
                        {/* Audiologist */}
                        <div className={`FR-audiologist ${sections.audiologist_details ? '' : 'FR-blurred'}`}>
                            <h4 className="FR-panel-title">AUDIOLOGIST</h4>
                            <div className="FR-audiologist-content">
                                Dr.Suresh Kashetty<br />
                                MAUD PGDNA A3090889<br />
                                Koram ENT Hospital<br />
                                8096868398
                            </div>
                        </div></div>


                    {/* Front Page Recommendations Preview (small version) */}

                </div>
            </div>
        </div>
    );
}

export default ReportFormatSelector;