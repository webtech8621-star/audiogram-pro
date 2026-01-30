import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { LuEar } from "react-icons/lu";
import { IoIosCheckmarkCircle } from "react-icons/io";
import "./index.css";

const AudiologistDetailsSettings = ({ onClose }) => {
    const [formData, setFormData] = useState({
        name: "",
        reg_no: "",
        qualification: "",
        phone_number: "",
        address: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    // ✅ Load logged-in audiologist details
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from("audiologist_details")
                    .select("name, reg_no, qualification, phone_number, address")
                    .eq("user_id", user.id)
                    .single();

                if (data && !error) {
                    setFormData({
                        name: data.name || "",
                        reg_no: data.reg_no || "",
                        qualification: data.qualification || "",
                        phone_number: data.phone_number || "",
                        address: data.address || "",
                    });
                }
            } catch (err) {
                console.error("Fetch error:", err);
            }
        };

        fetchDetails();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setError("");
    };

    // ✅ Save / Update audiologist profile
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError("Audiologist Name is required.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("audiologist_details")
                .upsert(
                    {
                        user_id: user.id,   // ✅ FIX
                        name: formData.name.trim(),
                        reg_no: formData.reg_no.trim(),
                        qualification: formData.qualification.trim(),
                        phone_number: formData.phone_number.trim(),
                        address: formData.address.trim(),
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id" } // ✅ FIX
                );

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => onClose(), 1800);
        } catch (err) {
            console.error(err);
            setError("Failed to save details. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="patient-details-overlay" onClick={onClose}>
            <div
                className="patient-details-container"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="pt-logo">
                    <LuEar className="pt-logo-icon" />
                    <span className="logo-text">AudiogramPro</span>
                </div>

                {error && <p className="error-message">{error}</p>}

                {!success ? (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Audiologist Name *</label>
                            <input
                                name="name"
                                className="ptd-inputs"
                                value={formData.name}
                                onChange={handleChange}
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label>Registration No.</label>
                            <input
                                name="reg_no"
                                className="ptd-inputs"
                                value={formData.reg_no}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Qualification</label>
                            <input
                                name="qualification"
                                className="ptd-inputs"
                                value={formData.qualification}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                name="phone_number"
                                className="ptd-inputs"
                                value={formData.phone_number}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Address</label>
                            <input
                                name="address"
                                className="ptd-inputs"
                                value={formData.address}
                                onChange={handleChange}
                            />
                        </div>

                        <button
                            type="submit"
                            className="lp-btn-signin"
                            style={{ color: "black" }}
                            disabled={loading}
                        >
                            {loading ? (
                                <LuEar className="animate-spin" size={20} />
                            ) : (
                                "Save"
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="success-box">
                        <IoIosCheckmarkCircle className="success-icon" />
                        <strong>Saved Successfully</strong>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AudiologistDetailsSettings;
