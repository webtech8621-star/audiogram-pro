import React, { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { calculateProvisionalDiagnosis } from "../ConditionsOfPd";
import "./index.css";

function getTympType({ mep, comp, ecv }) {
  const m = parseFloat(mep) || 0;
  const c = parseFloat(comp) || 0;
  const e = parseFloat(ecv) || 0;

  if (m >= -100 && m <= 100 && c >= 0.3 && c <= 2.5 && e >= 0.5 && e <= 2.9) return "A";
  if (m >= -100 && m <= 100 && c > 2.75 && e >= 0.5 && e <= 2.9) return "Ad";
  if (m >= -100 && m <= 100 && c >= 0.2 && c <= 0.3 && e >= 0.5 && e <= 2.9) return "As";
  if (m < -200 && c < 0.2 && e >= 0.5 && e <= 2.9) return "B";
  if ((m < -100 || m > 100) && c >= 0.3 && c <= 2.5 && e >= 0.5 && e <= 2.9) return "C";
  return "B";
}

function Section({ title, children, initialEnabled = true }) {
  const [enabled] = useState(initialEnabled);
  return (
    <div className={`report-section ${enabled ? "" : "disabled"}`}>
      <div className="report-header">
        <h3>{title}</h3>

      </div>
      {enabled && <div className="report-body">{children}</div>}
    </div>
  );
}

const ImpedanceReportItems = forwardRef(({ rightEar, leftEar, formData, ptaValues }, ref) => {
  const defaultData = {
    tymp: {
      comp_re: "",
      ecv_re: "",
      mep_re: "",
      type_re: "",
      comp_le: "",
      ecv_le: "",
      mep_le: "",
      type_le: "",
    },
    reflex: {
      re_500: "Al",
      re_1000: "Al",
      re_2000: "Al",
      le_500: "Al",
      le_1000: "Al",
      le_2000: "Al",
    },
    interpretation: { re: "", le: "" },
    diagnosis: { re: "No data available", le: "No data available" },
    recommendations: "ENT Review\nFollow up",
  };

  const [data, setData] = useState(defaultData);
  const [manualDiagnosisEdit, setManualDiagnosisEdit] = useState({ re: false, le: false });

  // Expose save/load
  useImperativeHandle(ref, () => ({
    setReportData: (saved) => {
      if (!saved) return;
      setData((prev) => ({
        ...prev,
        tymp: { ...prev.tymp, ...(saved.tymp || {}) },
        reflex: { ...prev.reflex, ...(saved.reflex || {}) },
        interpretation: { ...prev.interpretation, ...(saved.interpretation || {}) },
        diagnosis: { ...prev.diagnosis, ...(saved.diagnosis || {}) },
        recommendations: saved.recommendations || prev.recommendations,
      }));
    },
    getReportData: () => data,
  }));

  // ALWAYS sync Right Ear from top inputs (source of truth)
  useEffect(() => {
    if (!rightEar) return;

    const type = getTympType({
      mep: rightEar.pressure,
      comp: rightEar.compliance,
      ecv: rightEar.volume,
    });

    setData((prev) => ({
      ...prev,
      tymp: {
        ...prev.tymp,
        comp_re: rightEar.compliance ?? "",
        ecv_re: rightEar.volume ?? "",
        mep_re: rightEar.pressure ?? "",
        type_re: type,
      },
    }));
  }, [rightEar?.pressure, rightEar?.compliance, rightEar?.volume, rightEar]);

  // ALWAYS sync Left Ear from top inputs
  useEffect(() => {
    if (!leftEar) return;

    const type = getTympType({
      mep: leftEar.pressure,
      comp: leftEar.compliance,
      ecv: leftEar.volume,
    });

    setData((prev) => ({
      ...prev,
      tymp: {
        ...prev.tymp,
        comp_le: leftEar.compliance ?? "",
        ecv_le: leftEar.volume ?? "",
        mep_le: leftEar.pressure ?? "",
        type_le: type,
      },
    }));
  }, [leftEar?.pressure, leftEar?.compliance, leftEar?.volume, leftEar]);

  // Auto-update Interpretation from Type
  useEffect(() => {
    const getInterp = (type) => {
      if (type === "A") return "Indication of No middle ear pathology.";
      if (["As", "Ad", "B", "C"].includes(type)) return "Indication of Middle ear pathology.";
      return "";
    };

    setData((prev) => ({
      ...prev,
      interpretation: {
        re: getInterp(prev.tymp.type_re || ""),
        le: getInterp(prev.tymp.type_le || ""),
      },
    }));
  }, [data.tymp.type_re, data.tymp.type_le]);

  // Auto-update Reflex from Type
  useEffect(() => {
    const getReflex = (type) => {
      if (type === "A") return "Present";
      if (["As", "Ad", "B", "C"].includes(type)) return "Absent";
      return "Al";
    };

    setData((prev) => ({
      ...prev,
      reflex: {
        ...prev.reflex,
        re_500: getReflex(prev.tymp.type_re),
        re_1000: getReflex(prev.tymp.type_re),
        re_2000: getReflex(prev.tymp.type_re),
        le_500: getReflex(prev.tymp.type_le),
        le_1000: getReflex(prev.tymp.type_le),
        le_2000: getReflex(prev.tymp.type_le),
      },
    }));
  }, [data.tymp.type_re, data.tymp.type_le]);

  // Provisional Diagnosis (only blocked if manually edited)
  useEffect(() => {
    if (!formData || !ptaValues) return;

    const diag = calculateProvisionalDiagnosis(formData, ptaValues);
    const rightSev = diag.right?.severity || "No data available";
    const leftSev = diag.left?.severity || "No data available";

    setData((prev) => ({
      ...prev,
      diagnosis: {
        re: manualDiagnosisEdit.re ? prev.diagnosis.re : rightSev,
        le: manualDiagnosisEdit.le ? prev.diagnosis.le : leftSev,
      },
    }));
  }, [formData, ptaValues, manualDiagnosisEdit.re, manualDiagnosisEdit.le]);

  return (
    <div className="report-wrapper">
      <Section title="TYMPANOGRAM RESULTS">
        <table className="report-table">
          <thead>
            <tr>
              <th>TYMPANOGRAM RESULTS</th>
              <th className="re-le-header">RE</th>
              <th className="re-le-header">LE</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="data-label">Comp (ml)</td>
              <td><input type="text" value={data.tymp.comp_re ?? ""} onChange={(e) => setData(prev => ({ ...prev, tymp: { ...prev.tymp, comp_re: e.target.value } }))} /></td>
              <td><input type="text" value={data.tymp.comp_le ?? ""} onChange={(e) => setData(prev => ({ ...prev, tymp: { ...prev.tymp, comp_le: e.target.value } }))} /></td>
            </tr>
            <tr>
              <td className="data-label">ECV (cc)</td>
              <td><input type="text" value={data.tymp.ecv_re ?? ""} onChange={(e) => setData(prev => ({ ...prev, tymp: { ...prev.tymp, ecv_re: e.target.value } }))} /></td>
              <td><input type="text" value={data.tymp.ecv_le ?? ""} onChange={(e) => setData(prev => ({ ...prev, tymp: { ...prev.tymp, ecv_le: e.target.value } }))} /></td>
            </tr>
            <tr>
              <td className="data-label">MEP (daPa)</td>
              <td><input type="text" value={data.tymp.mep_re ?? ""} onChange={(e) => setData(prev => ({ ...prev, tymp: { ...prev.tymp, mep_re: e.target.value } }))} /></td>
              <td><input type="text" value={data.tymp.mep_le ?? ""} onChange={(e) => setData(prev => ({ ...prev, tymp: { ...prev.tymp, mep_le: e.target.value } }))} /></td>
            </tr>
            <tr>
              <td className="data-label">TYPE</td>
              <td><input type="text" value={data.tymp.type_re ?? ""} onChange={(e) => setData(prev => ({ ...prev, tymp: { ...prev.tymp, type_re: e.target.value } }))} /></td>
              <td><input type="text" value={data.tymp.type_le ?? ""} onChange={(e) => setData(prev => ({ ...prev, tymp: { ...prev.tymp, type_le: e.target.value } }))} /></td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Rest of sections unchanged */}
      <Section title="REFLEX TEST">
        <table className="report-table reflex-table">
          <thead><tr><th></th><th>500Hz</th><th>1000Hz</th><th>2000Hz</th></tr></thead>
          <tbody>
            <tr>
              <td className="data-label">RE</td>
              <td><input type="text" value={data.reflex.re_500 ?? ""} onChange={(e) => setData(p => ({ ...p, reflex: { ...p.reflex, re_500: e.target.value } }))} /></td>
              <td><input type="text" value={data.reflex.re_1000 ?? ""} onChange={(e) => setData(p => ({ ...p, reflex: { ...p.reflex, re_1000: e.target.value } }))} /></td>
              <td><input type="text" value={data.reflex.re_2000 ?? ""} onChange={(e) => setData(p => ({ ...p, reflex: { ...p.reflex, re_2000: e.target.value } }))} /></td>
            </tr>
            <tr>
              <td className="data-label">LE</td>
              <td><input type="text" value={data.reflex.le_500 ?? ""} onChange={(e) => setData(p => ({ ...p, reflex: { ...p.reflex, le_500: e.target.value } }))} /></td>
              <td><input type="text" value={data.reflex.le_1000 ?? ""} onChange={(e) => setData(p => ({ ...p, reflex: { ...p.reflex, le_1000: e.target.value } }))} /></td>
              <td><input type="text" value={data.reflex.le_2000 ?? ""} onChange={(e) => setData(p => ({ ...p, reflex: { ...p.reflex, le_2000: e.target.value } }))} /></td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="INTERPRETATION">
        <table className="report-table">
          <tbody>
            <tr><td className="data-label">RE:</td><td><input type="text" value={data.interpretation.re ?? ""} onChange={(e) => setData(p => ({ ...p, interpretation: { ...p.interpretation, re: e.target.value } }))} /></td></tr>
            <tr><td className="data-label">LE:</td><td><input type="text" value={data.interpretation.le ?? ""} onChange={(e) => setData(p => ({ ...p, interpretation: { ...p.interpretation, le: e.target.value } }))} /></td></tr>
          </tbody>
        </table>
      </Section>

      <Section title="PROVISIONAL DIAGNOSIS">
        <table className="report-table">
          <tbody>
            <tr>
              <td className="data-label">RE:</td>
              <td>
                <input
                  type="text"
                  value={data.diagnosis.re ?? "No data available"}
                  onChange={(e) => setData(p => ({ ...p, diagnosis: { ...p.diagnosis, re: e.target.value } }))}
                  onFocus={() => setManualDiagnosisEdit(prev => ({ ...prev, re: true }))}
                />
              </td>
            </tr>
            <tr>
              <td className="data-label">LE:</td>
              <td>
                <input
                  type="text"
                  value={data.diagnosis.le ?? "No data available"}
                  onChange={(e) => setData(p => ({ ...p, diagnosis: { ...p.diagnosis, le: e.target.value } }))}
                  onFocus={() => setManualDiagnosisEdit(prev => ({ ...prev, le: true }))}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="RECOMMENDATIONS" style={{ marginBottom: "100px" }}>
        <textarea
          rows="3"
          value={data.recommendations ?? ""}
          onChange={(e) => setData(p => ({ ...p, recommendations: e.target.value }))}
        />
      </Section>
    </div>
  );
});

export default ImpedanceReportItems;