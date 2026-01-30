import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./index.css";
import { LuEar } from "react-icons/lu";
import { IoIosCheckmarkCircle } from "react-icons/io";
import { supabase } from "../../supabaseClient";

const PatientDetails = ({ onClose, sessionType = "puretone" }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    location: "",
    patientId: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showSessionList, setShowSessionList] = useState(false);
  const [existingPatient, setExistingPatient] = useState(null);
  const [patientSessions, setPatientSessions] = useState([]);
  const [newPatientCreated] = useState(false);
  const [newPatientId] = useState(null);
  const [newSessionId] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "age" && (value < 0 || value > 120)) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSavePatient = async () => {
    const { name, age, gender, location, patientId } = formData;

    if (!name.trim() || !age || !gender || !location.trim() || !patientId.trim()) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Authentication required.");
        setLoading(false);
        return;
      }

      const { data: existing, error: checkError } = await supabase
        .from("patients")
        .select("id, name, age, gender, location, patient_id")
        .eq("patient_id", patientId.trim())
        .ilike("name", name.trim())
        .single();

      if (existing && !checkError) {
        setExistingPatient(existing);

        const { data: sessions } = await supabase
          .from("sessions")
          .select("id, session_type, status, created_at, updated_at")
          .eq("patient_id", existing.id)
          .order("created_at", { ascending: false });

        setPatientSessions(sessions || []);
        setShowSessionList(true);
        setLoading(false); // ⬅ stop loading ONLY here
        return;
      }

      const { data: newPatient, error: insertError } = await supabase
        .from("patients")
        .insert([{
          user_id: user.id,
          name: name.trim(),
          age: parseInt(age, 10),
          gender,
          location: location.trim(),
          patient_id: patientId.trim(),
        }])
        .select()
        .single();

      if (insertError) {
        setError("Failed to save patient.");
        setLoading(false);
        return;
      }

      const { data: newSession, error: sessionError } = await supabase
        .from("sessions")
        .insert([{
          user_id: user.id,
          patient_id: newPatient.id,
          session_type: sessionType,
          status: "draft",
        }])
        .select()
        .single();

      if (sessionError) {
        setError("Patient saved, but failed to create session.");
        setLoading(false);
        return;
      }

      // 🚀 DO NOT stop loading here
      const path =
        sessionType === "impedance"
          ? "/impedanceaudiometry"
          : "/puretoneaudiometry";

      navigate(path, {
        state: {
          patientId: newPatient.id,
          sessionId: newSession.id,
          loadExistingData: false,
        },
      });

      onClose(); // component unmounts → loading auto-clears

    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
      setLoading(false);
    }
  };


  const handleLoadSession = (session) => {
    const path = session.session_type?.includes("impedance")
      ? "/impedanceaudiometry"
      : "/puretoneaudiometry";

    navigate(path, {
      state: {
        patientId: existingPatient.id,
        sessionId: session.id,
        loadExistingData: true,
      },
    });
    onClose();
  };

  const handleCreateNewSession = async () => {
    if (!existingPatient) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: session, error } = await supabase
        .from("sessions")
        .insert([
          {
            user_id: user.id,
            patient_id: existingPatient.id,
            session_type: sessionType,
            status: "draft",
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const path = sessionType === "impedance" ? "/impedanceaudiometry" : "/puretoneaudiometry";
      navigate(path, {
        state: {
          patientId: existingPatient.id,
          sessionId: session.id,
          loadExistingData: false,
        },
      });
      onClose();
    } catch (err) {
      setError("Failed to create new session.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewPatientSession = () => {
    const path = sessionType === "impedance" ? "/impedanceaudiometry" : "/puretoneaudiometry";
    navigate(path, {
      state: {
        patientId: newPatientId,
        sessionId: newSessionId,
        loadExistingData: false,
      },
    });
    onClose();
  };

  return (
    <div className="patient-details-overlay" onClick={onClose}>
      <div className="patient-details-container" onClick={(e) => e.stopPropagation()}>
        <div className="pt-logo">
          <LuEar className="pt-logo-icon" />
          <span className="logo-text">AudiogramPro</span>
        </div>

        {error && <p className="error-message">{error}</p>}

        {!showSessionList && !newPatientCreated && (
          <div>
            <div className="form-group">
              <label>Patient ID *</label>
              <input
                name="patientId"
                className="ptd-inputs"
                value={formData.patientId}
                onChange={handleChange}
                placeholder="e.g., PT001"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Name *</label>
              <input
                name="name"
                className="ptd-inputs"
                value={formData.name}
                onChange={handleChange}
                placeholder="Full name"
              />
            </div>

            <div className="form-group">
              <label>Age *</label>
              <input
                type="number"
                name="age"
                className="ptd-inputs"
                value={formData.age}
                onChange={handleChange}
                min="0"
                max="120"
              />
            </div>

            <div className="form-group">
              <label>Gender *</label>
              <select name="gender" className="ptd-inputs" value={formData.gender} onChange={handleChange}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Location *</label>
              <input
                name="location"
                className="ptd-inputs"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <button
              className="save-button"
              onClick={handleSavePatient}
              disabled={loading}
            >
              <span className={`save-btn-content ${loading ? "loading" : ""}`}>
                <span className="save-btn-text">
                  {loading ? <LuEar className="save-ear-icon" /> : "Save Patient & Start Session"}
                </span>
              </span>
            </button>


          </div>
        )}

        {showSessionList && existingPatient && (
          <div className="existing-patient-view">
            <h3>Patient Found: {existingPatient.name}</h3>
            <p>
              ID: {existingPatient.patient_id} • Age: {existingPatient.age} • {existingPatient.gender}
            </p>

            <h4>Previous Sessions</h4>
            <div className="session-list">
              {patientSessions.length === 0 ? (
                <p>No old sessions found.</p>
              ) : (
                patientSessions.map((sess) => (
                  <div
                    key={sess.id}
                    className="session-item"
                    onClick={() => handleLoadSession(sess)}
                  >
                    <strong>{sess.session_type.replace("+", " + ")}</strong>
                    <br />
                    <small>
                      Date: {new Date(sess.created_at).toLocaleDateString()} {new Date(sess.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {sess.updated_at && sess.updated_at !== sess.created_at && " (Updated)"}
                      <br />
                      Status: {sess.status}
                    </small>
                  </div>
                ))
              )}
            </div>

            <button
              className="save-button"
              onClick={handleCreateNewSession}
              disabled={loading}
            >
              {loading ? <LuEar className="save-ear-icon" /> : "+ Create New Session"}
            </button>
          </div>
        )}

        {newPatientCreated && (
          <div className="success-box">
            <p className="para-successfull">
              <IoIosCheckmarkCircle style={{ color: "green", height: 25, width: 25 }} />
              New patient <strong>{formData.name}</strong> saved successfully!
            </p>
            <button className="save-button" onClick={handleStartNewPatientSession}>
              Start Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDetails;