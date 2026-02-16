// src/components/PuretoneAudiometry/index.js

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./index.css";
import { supabase } from "../../supabaseClient";
import { LuEar } from "react-icons/lu";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import PatientDetails from "../PatientDetails";
import MakePTAReport from "../MakePTAReport";
import { Line } from "react-chartjs-2";
import { calculateProvisionalDiagnosis } from "../ConditionsOfPd";
import ReportFormatSelector from "../ReportFormatSelector";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

const customSymbols = {
  id: "customSymbols",
  afterDatasetsDraw: (chart) => {
    const ctx = chart.ctx;
    const normalSymbolSize = 23;
    const bracketSymbolSize = 17;
    const rightBracketSymbolSize = 19;
    const leftBracketSymbolSize = 19;
    const triangleSymbolSize = 19;
    const lineWidth = 2;
    const arrowMargin = -2.8;
    const crossMargin = -2.2;
    const boldSymbols = new Set(["rightBracket", "leftBracket", "circle", "triangle"]);

    chart.data.datasets.forEach((dataset) => {
      const meta = chart.getDatasetMeta(chart.data.datasets.indexOf(dataset));
      meta.data.forEach((point, index) => {
        const yValue = dataset.data[index];
        if (yValue == null && yValue !== 0) return;

        ctx.save();
        ctx.fillStyle = dataset.borderColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const symbolMap = {
          lessThan: "<",
          greaterThan: ">",
          rightBracket: "⊏",
          leftBracket: "⊐",
          squareSymbol: "□",
          circle: "○",
          triangle: "△",
          crossRot: "×",
        };

        if (dataset.pointStyle in symbolMap) {
          const isArrow = dataset.pointStyle === "lessThan" || dataset.pointStyle === "greaterThan";
          const isCross = dataset.pointStyle === "crossRot";
          const isBracket = dataset.pointStyle.includes("Bracket");

          let fontSize = normalSymbolSize;
          if (dataset.pointStyle === "rightBracket") fontSize = rightBracketSymbolSize;
          else if (dataset.pointStyle === "leftBracket") fontSize = leftBracketSymbolSize;
          else if (isBracket) fontSize = bracketSymbolSize;
          if (dataset.pointStyle === "triangle") fontSize = triangleSymbolSize;

          const shouldBold = boldSymbols.has(dataset.pointStyle);
          ctx.font = `${shouldBold ? "bold " : ""}${fontSize}px Montserrat, Arial`;

          let yPos = point.y - lineWidth / 2;
          if (isArrow) {
            yPos += yValue > 0 ? -arrowMargin : arrowMargin;
          } else if (isCross) {
            yPos += yValue > 0 ? -crossMargin : crossMargin;
          }

          const symbol = symbolMap[dataset.pointStyle];
          if (shouldBold) ctx.fillText(symbol, point.x + 0.5, yPos + 0.5);
          ctx.fillText(symbol, point.x, yPos);
        }
        ctx.restore();
      });
    });
  },
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);
ChartJS.register(customSymbols);

const frequencies = [250, 500, 1000, 1500, 2000, 3000, 4000, 6000, 8000];
const columns = [
  { key: "ACR", symbol: "○", label: "ACR (○)" },
  { key: "ACR_M", symbol: "△", label: "ACR_M (△)" },
  { key: "BCR", symbol: "<", label: "BCR (<)" },
  { key: "BCR_M", symbol: "⊏", label: "BCR_M (⊏)" },
  { key: "ACL", symbol: "×", label: "ACL (×)" },
  { key: "ACL_M", symbol: "□", label: "ACL_M (□)" },
  { key: "BCL", symbol: ">", label: "BCL (>)" },
  { key: "BCL_M", symbol: "⊐", label: "BCL_M (⊐)" },
];

const pointStyleMap = {
  ACR: "circle",
  ACR_M: "triangle",
  BCR: "lessThan",
  BCR_M: "rightBracket",
  ACL: "crossRot",
  ACL_M: "squareSymbol",
  BCL: "greaterThan",
  BCL_M: "leftBracket",
};

const colorMap = {
  ACR: "red",
  ACR_M: "brown",
  BCR: "red",
  BCR_M: "brown",
  ACL: "blue",
  ACL_M: "navy",
  BCL: "blue",
  BCL_M: "navy",
};

function PureToneAudiometry() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [weberEnabled, setWeberEnabled] = useState(true);

  const [speechData, setSpeechData] = useState({
    right: { pta: "", srt: "", sds: "" },
    left: { pta: "", srt: "", sds: "" },
  });

  const [weberData, setWeberData] = useState({
    250: { right: "", left: "" },
    500: { right: "", left: "" },
    1000: { right: "", left: "" },
    2000: { right: "", left: "" },
  });

  const [zoomed, setZoomed] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [activeSymbolKey, setActiveSymbolKey] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(true);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showFormatSelector, setShowFormatSelector] = useState(false);

  const [reportSections, setReportSections] = useState({
    patient_info: true,
    right_ear_graph: true,
    left_ear_graph: true,
    symbols_legend_right: true,
    symbols_legend_left: true,
    provisional_diagnosis: true,
    speech_audiometry: true,
    weber_test: true,
    audiologist_details: true,
    front_recommendations: true,
    recommendations: true,
    front_audiologist_details: true,
  });

  const [patientInfo, setPatientInfo] = useState(null);
  const rightChartRef = useRef(null);
  const leftChartRef = useRef(null);
  const zoomedRightChartRef = useRef(null);
  const zoomedLeftChartRef = useRef(null);
  const [currentPatientId, setCurrentPatientId] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [diagnosis, setDiagnosis] = useState({ re: "", le: "" });

  const [manualDiagnosisEdit, setManualDiagnosisEdit] = useState({
    re: false,
    le: false,
  });

  const [formData, setFormData] = useState(
    frequencies.map((freq) => ({
      freq,
      ACR: "",
      ACR_M: "",
      BCR: "",
      BCR_M: "",
      ACL: "",
      ACL_M: "",
      BCL: "",
      BCL_M: "",
    }))
  );

  const [currentFormatName, setCurrentFormatName] = useState("Default (Full)");
  const [recommendations, setRecommendations] = useState("");
  const [recommendationsEnabled, setRecommendationsEnabled] = useState(true);

  // Load latest report format on mount
  useEffect(() => {
    const loadLatestReportFormat = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        const { data, error } = await supabase
          .from("report_formats")
          .select("name, sections")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("Error loading report format:", error);
          return;
        }

        if (data) {
          setReportSections(data.sections);
          setCurrentFormatName(data.name);
        }
      } catch (err) {
        console.error("Cannot load latest format", err);
      }
    };

    loadLatestReportFormat();
  }, []);

  // Handle location state changes (new/existing session)
  useEffect(() => {
    const state = location.state;
    if (!state) return;

    setCurrentPatientId(state.patientId || null);
    setCurrentSessionId(state.sessionId || null);
    setShowPatientDetails(!state.sessionId);

    if (state.loadExistingData && state.sessionId) {
      const loadSession = async () => {
        setLoadingSession(true);
        try {
          const { data, error } = await supabase
            .from("sessions")
            .select(`
              audiometry_data,
              pta_right,
              pta_left,
              provisional_diagnosis,
              speech_audiometry,
              weber_test,
              session_type,
              report_sections,
              recommendations,
              recommendations_enabled
            `)
            .eq("id", state.sessionId)
            .single();

          if (error) throw error;

          if (data.session_type?.includes("impedance") && !data.session_type?.includes("puretone")) {
            navigate("/impedanceaudiometry", {
              state: { patientId: state.patientId, sessionId: state.sessionId, loadExistingData: true },
            });
            return;
          }

          if (data?.audiometry_data) {
            setFormData(data.audiometry_data);
          }

          const savedDiag = data?.provisional_diagnosis || {};

          const rightSaved = savedDiag.right && savedDiag.right.trim() !== "" && savedDiag.right !== "Insufficient Data";
          const leftSaved = savedDiag.left && savedDiag.left.trim() !== "" && savedDiag.left !== "Insufficient Data";

          setDiagnosis({
            re: rightSaved ? savedDiag.right.trim() : "",
            le: leftSaved ? savedDiag.left.trim() : "",
          });

          setManualDiagnosisEdit({
            re: rightSaved,
            le: leftSaved,
          });

          if (data?.speech_audiometry) {
            setSpeechData({
              right: { pta: "", srt: "", sds: "", ...data.speech_audiometry.right },
              left: { pta: "", srt: "", sds: "", ...data.speech_audiometry.left },
            });
          }

          if (data?.weber_test) {
            setWeberData(data.weber_test);
          }

          if (data?.report_sections) {
            setReportSections(data.report_sections);
          }

          if (data?.recommendations) {
            setRecommendations(data.recommendations);
          }

          setRecommendationsEnabled(data?.recommendations_enabled !== false);
        } catch (err) {
          console.error("Error loading saved session data:", err);
        } finally {
          setLoadingSession(false);
        }
      };

      loadSession();
    } else {
      resetAllStates();
    }
  }, [location.state, navigate]);

  const resetAllStates = () => {
    setFormData(
      frequencies.map((freq) => ({
        freq,
        ACR: "",
        ACR_M: "",
        BCR: "",
        BCR_M: "",
        ACL: "",
        ACL_M: "",
        BCL: "",
        BCL_M: "",
      }))
    );
    setDiagnosis({ re: "", le: "" });
    setManualDiagnosisEdit({ re: false, le: false });
    setSpeechData({
      right: { pta: "", srt: "", sds: "" },
      left: { pta: "", srt: "", sds: "" },
    });
    setWeberData({
      250: { right: "", left: "" },
      500: { right: "", left: "" },
      1000: { right: "", left: "" },
      2000: { right: "", left: "" },
    });
    setSessionSaved(false);
    setActiveSymbolKey(null);
    setZoomed(false);
  };

  // Check authentication
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
      }
    };
    checkSession();
  }, [navigate]);

  // Fetch patient info when patient ID changes
  useEffect(() => {
    const fetchPatientInfo = async () => {
      if (!currentPatientId) {
        setPatientInfo(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("patients")
          .select("id, name, patient_id, age, gender, location")
          .eq("id", currentPatientId)
          .single();
        if (error) throw error;
        setPatientInfo(data);
      } catch (err) {
        console.error("Error fetching patient info:", err);
        setPatientInfo(null);
      }
    };
    fetchPatientInfo();
  }, [currentPatientId]);

  // Auto-update Weber data based on bone conduction presence
  useEffect(() => {
    const hasBCR = formData.some((row) => row.BCR !== "" && row.BCR !== null);
    const hasBCL = formData.some((row) => row.BCL !== "" && row.BCL !== null);

    if (hasBCR && !hasBCL) {
      setWeberData({
        250: { right: "→", left: "" },
        500: { right: "→", left: "" },
        1000: { right: "→", left: "" },
        2000: { right: "→", left: "" },
      });
    } else if (hasBCL && !hasBCR) {
      setWeberData({
        250: { right: "", left: "→" },
        500: { right: "", left: "→" },
        1000: { right: "", left: "→" },
        2000: { right: "", left: "→" },
      });
    } else if (hasBCR && hasBCL) {
      setWeberData({
        250: { right: "", left: "" },
        500: { right: "", left: "" },
        1000: { right: "", left: "" },
        2000: { right: "", left: "" },
      });
    }
  }, [formData]);

  // Fetch patient ID from session if missing
  useEffect(() => {
    if (!currentSessionId || currentPatientId) return;

    const fetchPatientFromSession = async () => {
      try {
        const { data } = await supabase
          .from("sessions")
          .select("patient_id")
          .eq("id", currentSessionId)
          .single();
        if (data?.patient_id) {
          setCurrentPatientId(data.patient_id);
        }
      } catch (err) {
        console.error("Error fetching patient from session:", err);
      }
    };

    fetchPatientFromSession();
  }, [currentSessionId, currentPatientId]);

  const handleChange = (index, field, value) => {
    const updated = [...formData];
    updated[index][field] = value === "" ? "" : value;
    setFormData(updated);
  };

  const handleKeyDown = (e, currentIndex, currentFieldIndex) => {
    const inputFields = document.querySelectorAll(".pta-input-table input[type='number']");
    const currentInputIndex = Array.from(inputFields).findIndex((input) => input === e.target);
    if (currentInputIndex === -1) return;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        if (currentIndex > 0) inputFields[Math.max(0, currentInputIndex - columns.length)].focus();
        break;
      case "ArrowDown":
        e.preventDefault();
        if (currentIndex < frequencies.length - 1)
          inputFields[Math.min(inputFields.length - 1, currentInputIndex + columns.length)].focus();
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (currentFieldIndex > 0) inputFields[currentInputIndex - 1]?.focus();
        break;
      case "ArrowRight":
        e.preventDefault();
        if (currentFieldIndex < columns.length - 1) inputFields[currentInputIndex + 1]?.focus();
        break;
      default:
        break;
    }
  };



  const generateDataset = useCallback(
    (label, field, borderColor, pointStyle) => ({
      label,
      data: formData.map((row) => (row[field] === "" ? null : parseFloat(row[field]))),
      borderColor,
      pointBorderColor: borderColor,
      pointBackgroundColor: "transparent",
      pointStyle,
      pointRadius: 0,
      pointBorderWidth: 2,
      borderWidth: 1,
      spanGaps: true,
    }),
    [formData]
  );

  const rightEarData = useMemo(
    () => ({
      labels: frequencies,
      datasets: [
        generateDataset("ACR", "ACR", "red", pointStyleMap.ACR),
        generateDataset("ACR_M", "ACR_M", "brown", pointStyleMap.ACR_M),
        generateDataset("BCR", "BCR", "red", pointStyleMap.BCR),
        generateDataset("BCR_M", "BCR_M", "brown", pointStyleMap.BCR_M),
      ],
    }),
    [generateDataset]
  );

  const leftEarData = useMemo(
    () => ({
      labels: frequencies,
      datasets: [
        generateDataset("ACL", "ACL", "blue", pointStyleMap.ACL),
        generateDataset("ACL_M", "ACL_M", "navy", pointStyleMap.ACL_M),
        generateDataset("BCL", "BCL", "blue", pointStyleMap.BCL),
        generateDataset("BCL_M", "BCL_M", "navy", pointStyleMap.BCL_M),
      ],
    }),
    [generateDataset]
  );

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 5, bottom: 5, left: 5, right: 5 } },
    scales: {
      x: {
        type: "category",
        labels: frequencies,
        title: { display: true, text: "Frequency (Hz)", font: { size: 12 }, color: "black" },
        grid: { lineWidth: 0.7, color: "#e0e0e0", drawOnChartArea: true },
        ticks: { padding: 5, font: { size: 10 }, color: "black" },
      },
      y: {
        reverse: true,
        min: -10,
        max: 120,
        ticks: { stepSize: 10, padding: 3, font: { size: 10 }, color: "black" },
        title: { display: true, text: "dB HL", font: { size: 12 }, color: "black" },
        grid: { lineWidth: 0.7, color: "#e0e0e0", drawOnChartArea: true },
      },
    },
    elements: { line: { tension: 0 } },
    plugins: { legend: { display: false } },
    animation: false,
  };

  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const { ptaValues } = useMemo(() => {
    const calculateAverage = (field) => {
      const values = [];
      formData.forEach((row) => {
        if ([500, 1000, 2000].includes(row.freq) && row[field] !== "") {
          values.push(parseFloat(row[field]));
        }
      });
      if (values.length === 0) return null;
      const sum = values.reduce((a, b) => a + b, 0);
      return Number((sum / values.length).toFixed(1));
    };
    const right = calculateAverage("ACR");
    const left = calculateAverage("ACL");
    return { ptaValues: { right, left } };
  }, [formData]);

  useEffect(() => {
    if (!ptaValues?.right && !ptaValues?.left) return;

    const result = calculateProvisionalDiagnosis(formData, ptaValues);

    setDiagnosis((prev) => ({
      re: manualDiagnosisEdit.re ? prev.re : (result?.right?.severity ?? ""),
      le: manualDiagnosisEdit.le ? prev.le : (result?.left?.severity ?? ""),
    }));
  }, [formData, ptaValues, manualDiagnosisEdit]);

  const findNearestFrequencyIndexForChart = (chartInstance, clickX) => {
    if (!chartInstance) return 0;
    const xScale = chartInstance.scales.x;
    let nearestIdx = 0;
    let minDiff = Infinity;
    frequencies.forEach((f, i) => {
      const px = xScale.getPixelForValue(i);
      const diff = Math.abs(px - clickX);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = i;
      }
    });
    return nearestIdx;
  };

  const handleChartDoubleClick = (evt, chartInstance) => {
    if (!activeSymbolKey || !chartInstance) return;

    const canvasRect = chartInstance.canvas.getBoundingClientRect();
    const xPixel = evt.nativeEvent.clientX - canvasRect.left;
    const yPixel = evt.nativeEvent.clientY - canvasRect.top;

    const yScale = chartInstance.scales.y;
    const nearestIdx = findNearestFrequencyIndexForChart(chartInstance, xPixel);
    let yVal = yScale.getValueForPixel(yPixel);
    let yNum = Math.round(yVal / 5) * 5;

    if (yNum < -10) yNum = -10;
    if (yNum > 120) yNum = 120;

    setFormData((prev) =>
      prev.map((r, i) => (i === nearestIdx ? { ...r, [activeSymbolKey]: String(yNum) } : r))
    );
  };

  const generateCustomCursor = (symbolKey) => {
    if (!symbolKey) return "auto";
    const col = columns.find((c) => c.key === symbolKey);
    if (!col) return "auto";

    const symbol = col.symbol;
    const color = colorMap[symbolKey];
    const pointStyle = pointStyleMap[symbolKey];

    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");

    const normalSymbolSize = 18;
    const bracketSymbolSize = 12;
    const rightBracketSymbolSize = 14;
    const leftBracketSymbolSize = 14;
    const triangleSymbolSize = 14;
    const boldSymbols = new Set(["rightBracket", "leftBracket", "circle", "triangle"]);

    let fontSize = normalSymbolSize;
    if (pointStyle === "rightBracket") fontSize = rightBracketSymbolSize;
    else if (pointStyle === "leftBracket") fontSize = leftBracketSymbolSize;
    else if (pointStyle.includes("Bracket")) fontSize = bracketSymbolSize;
    if (pointStyle === "triangle") fontSize = triangleSymbolSize;

    const shouldBold = boldSymbols.has(pointStyle);
    ctx.font = `${shouldBold ? "bold " : ""}${fontSize}px Montserrat, Arial`;

    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, 16, 16);

    const url = canvas.toDataURL();
    return `url(${url}) 16 16, auto`;
  };

  useEffect(() => {
    const setCursor = (chartRef, cursorStyle) => {
      if (chartRef?.current?.canvas) {
        chartRef.current.canvas.style.cursor = cursorStyle;
      }
    };

    const cursorStyle = generateCustomCursor(activeSymbolKey);
    setCursor(rightChartRef, cursorStyle);
    setCursor(leftChartRef, cursorStyle);
    setCursor(zoomedRightChartRef, cursorStyle);
    setCursor(zoomedLeftChartRef, cursorStyle);
  }, [activeSymbolKey]);

  const toggleZoom = () => setZoomed(true);

  const closeZoom = () => {
    setZoomed(false);
    setActiveSymbolKey(null);
  };

  const handleSymbolClick = (key) => {
    setActiveSymbolKey((prev) => (prev === key ? null : key));
  };

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
    navigate("/");
  };

  const handlePatientDetailsClose = () => {
    if (currentPatientId) {
      setShowPatientDetails(false);
    }
  };

  const handleSaveSession = async () => {
    if (!currentSessionId) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2200);
      return;
    }

    setSaveStatus("saving");

    try {
      const { error } = await supabase
        .from("sessions")
        .update({
          audiometry_data: formData,
          pta_right: ptaValues.right ? parseFloat(ptaValues.right) : null,
          pta_left: ptaValues.left ? parseFloat(ptaValues.left) : null,
          provisional_diagnosis: {
            right: diagnosis.re?.trim() || null,
            left: diagnosis.le?.trim() || null,
          },
          speech_audiometry: speechData,
          weber_test: weberData,
          report_sections: reportSections,
          recommendations: recommendations.trim() || null,
          recommendations_enabled: recommendationsEnabled,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentSessionId);

      if (error) throw error;

      setSaveStatus("success");
      setSessionSaved(true);
      setTimeout(() => setSaveStatus("idle"), 2800);
    } catch (err) {
      console.error("Error saving session:", err);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3200);
    }
  };

  const handleNewPatientClick = () => {
    setShowPatientDetails(true);
  };

  const handleNavigateHome = () => {
    resetAllStates();
    setCurrentPatientId(null);
    setCurrentSessionId(null);
    setSessionSaved(false);
    setShowPatientDetails(true);
    navigate("/");
  };

  const handleMoveToImpedance = () => {
    navigate("/impedanceaudiometry", {
      state: { patientId: currentPatientId, sessionId: currentSessionId, formData, ptaValues },
    });
  };

  const handleSpeechChange = (ear, field, value) => {
    setSpeechData((prev) => ({
      ...prev,
      [ear]: {
        ...prev[ear],
        [field]: value,
      },
    }));
  };

  const handleWeberChange = (freq, side, value) => {
    setWeberData((prev) => ({
      ...prev,
      [freq]: {
        ...prev[freq],
        [side]: value,
      },
    }));
  };



  return (
    <div className="pta-wrapper">
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onNavigateHome={handleNavigateHome}
      />
      <Sidebar
        isOpen={isSidebarOpen}
        onLogout={handleLogout}
        loading={loading}
      />

      {initialLoading ? (
        <div className="loader-overlay">
          <div className="loader-containerpta">
            <LuEar className="animate-spin-pt" size={20} />
            <p className="para-loader-pta">Loading ...</p>
          </div>
        </div>
      ) : (
        <div className={`pta-main `}>
          <div className="pta-header-row">
            <div className="space-cont"></div>
            <h1 className="pta-title-header">PURE TONE AUDIOMETRY</h1>
            <div className="button-sidebar">
              <button className="nav-button make-report-button" onClick={() => setShowReport(true)}>
                Make Report
              </button>

              <button
                className="nav-button"
                onClick={() => setShowFormatSelector(true)}
                style={{
                  position: "relative",
                  minWidth: "180px",
                  whiteSpace: "nowrap",
                  background: currentFormatName === "Default (Full)" ? "" : "#e8f5e9",
                  border: currentFormatName === "Default (Full)" ? "" : "1px solid #81c784",
                  color: currentFormatName === "Default (Full)" ? "" : "#2e7d32",
                }}
              >
                {currentFormatName === "Default (Full)"
                  ? "Report Format (Default)"
                  : `Using: ${currentFormatName}`}
              </button>

              <button className="nav-button new-patient-button" onClick={handleNewPatientClick}>
                + New Patient
              </button>

              <button
                className={`nav-button save-session-btn ${saveStatus}`}
                onClick={handleSaveSession}
                disabled={saveStatus === "saving" || loadingSession}
              >
                {saveStatus === "saving" && <>Saving...</>}
                {saveStatus === "success" && <>Saved ✓</>}
                {saveStatus === "error" && <>Failed ×</>}
                {saveStatus === "idle" && <>Save Session</>}
              </button>

              {sessionSaved && (
                <button className="nav-button" onClick={handleMoveToImpedance}>
                  Move to Impedance →
                </button>
              )}
            </div>
          </div>

          <div className="pta-content-row">
            <div className="pta-table-card">
              <div className="FrequencyDataTable-total-cont">
                <h3 className="card-heading">Frequency Data Table</h3>
              </div>
              <div className="table-wrapper">
                <table className="pta-input-table">
                  <thead>
                    <tr>
                      <th>FREQ-Hz</th>
                      {columns.map((col) => (
                        <th key={col.key}>{col.key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {formData.map((row, rowIndex) => (
                      <tr key={row.freq}>
                        <td className="freq-cell">{row.freq}</td>
                        {columns.map((col, colIndex) => (
                          <td key={col.key}>
                            <input
                              type="number"
                              step="1"
                              min="-10"
                              max="120"
                              value={row[col.key]}
                              onChange={(e) => handleChange(rowIndex, col.key, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                              disabled={loadingSession}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pta-diagnosis-card">
                <div className="pta-header">
                  <h3 className="pta-title">Provisional Diagnosis</h3>
                  <div className="pta-switch-container">
                    <div
                      className={`pta-toggle ${isEnabled ? "pta-active" : ""}`}
                      onClick={() => setIsEnabled(!isEnabled)}
                    >
                      <div className="pta-toggle-handle"></div>
                    </div>
                    <span className="pta-switch-label">Enable Section</span>
                  </div>
                </div>
                <div className={!isEnabled ? "pta-disabled" : ""}>
                  <div className="pta-row">
                    <span className="pta-label">RE:</span>
                    <input
                      className="pta-input"
                      name="re"
                      type="text"
                      value={diagnosis.re}
                      placeholder="Unable to Determine"
                      onChange={(e) => {
                        setDiagnosis((prev) => ({ ...prev, re: e.target.value }));
                        setManualDiagnosisEdit((prev) => ({ ...prev, re: true }));
                      }}
                      disabled={loadingSession}
                    />
                  </div>
                  <div className="pta-row pta-row-last">
                    <span className="pta-label">LE:</span>
                    <input
                      className="pta-input"
                      name="le"
                      type="text"
                      value={diagnosis.le}
                      placeholder="Unable to Determine"
                      onChange={(e) => {
                        setDiagnosis((prev) => ({ ...prev, le: e.target.value }));
                        setManualDiagnosisEdit((prev) => ({ ...prev, le: true }));
                      }}
                      disabled={loadingSession}
                    />
                  </div>
                </div>
              </div>

              <div className="speechaud-weber-row-cont">
                <div className="pta-diagnosis-card-sppech-audio">
                  <div className="pta-header">
                    <h3 className="pta-title">SPEECH AUDIOMETRY</h3>
                    <div className="pta-switch-container">
                      <div
                        className={`pta-toggle ${speechEnabled ? "pta-active" : ""}`}
                        onClick={() => setSpeechEnabled(!speechEnabled)}
                      >
                        <div className="pta-toggle-handle"></div>
                      </div>
                    </div>
                  </div>

                  <div className={`speech-table-container ${!speechEnabled ? "pta-disabled" : ""}`}>
                    <div className="diagnosis-row">
                      <div className="diagnosis-label">RIGHT EAR</div>
                      <div className="diagnosis-value">
                        <input
                          type="text"
                          className="pta-input-su"
                          placeholder="Unable to Determine"
                          value={`${ptaValues?.right || ""} dBHL`}
                          onChange={(e) => handleSpeechChange("right", "pta", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="diagnosis-row">
                      <div className="diagnosis-label">SRT (RIGHT)</div>
                      <div className="diagnosis-value">
                        <input
                          type="text"
                          className="pta-input"
                          placeholder="-"
                          value={speechData?.right?.srt || ""}
                          onChange={(e) => handleSpeechChange("right", "srt", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="diagnosis-row">
                      <div className="diagnosis-label">SDS (RIGHT)</div>
                      <div className="diagnosis-value">
                        <input
                          type="text"
                          className="pta-input"
                          placeholder="-"
                          value={speechData?.right?.sds || ""}
                          onChange={(e) => handleSpeechChange("right", "sds", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="diagnosis-row">
                      <div className="diagnosis-label">LEFT EAR</div>
                      <div className="diagnosis-value">
                        <input
                          type="text"
                          className="pta-input"
                          placeholder="Unable to Determine"
                          value={`${ptaValues?.left || ""} dBHL`}
                          onChange={(e) => handleSpeechChange("left", "pta", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="diagnosis-row">
                      <div className="diagnosis-label">SRT (LEFT)</div>
                      <div className="diagnosis-value">
                        <input
                          type="text"
                          className="pta-input"
                          placeholder="-"
                          value={speechData?.left?.srt || ""}
                          onChange={(e) => handleSpeechChange("left", "srt", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="diagnosis-row">
                      <div className="diagnosis-label">SDS (LEFT)</div>
                      <div className="diagnosis-value">
                        <input
                          type="text"
                          className="pta-input"
                          placeholder="-"
                          value={speechData?.left?.sds || ""}
                          onChange={(e) => handleSpeechChange("left", "sds", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pta-diagnosis-card-webertest">
                  <div className="pta-header">
                    <h3 className="pta-title">WEBER TEST</h3>
                    <div className="pta-switch-container">
                      <div
                        className={`pta-toggle ${weberEnabled ? "pta-active" : ""}`}
                        onClick={() => setWeberEnabled(!weberEnabled)}
                      >
                        <div className="pta-toggle-handle"></div>
                      </div>
                    </div>
                  </div>

                  <div className={`weber-table-container ${!weberEnabled ? "pta-disabled" : ""}`}>
                    {[250, 500, 1000, 2000].map((freq) => (
                      <div className="diagnosis-row" key={freq}>
                        <div className="diagnosis-label">{freq} Hz</div>
                        <div className="diagnosis-value">
                          <div className="weber-dual-input">
                            <span className="weber-side">R:</span>
                            <input
                              type="text"
                              className="pta-input small"
                              placeholder=""
                              value={weberData[freq]?.right || ""}
                              onChange={(e) => handleWeberChange(freq, "right", e.target.value)}
                            />
                            <span className="weber-side">L:</span>
                            <input
                              type="text"
                              className="pta-input small"
                              placeholder=""
                              value={weberData[freq]?.left || ""}
                              onChange={(e) => handleWeberChange(freq, "left", e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pta-graph-card">
              <div className="DualEar-total-cont">
                <h3 className="card-heading">Dual Ear Audiogram</h3>
              </div>
              <div
                className={`graphs-row dual-audiogram-container ${zoomed ? "zoomed" : ""}`}
                onClick={() => {
                  if (!zoomed) toggleZoom();
                }}
              >
                <div className="graph-box">
                  <div className="graph-title" style={{ color: "red" }}>
                    R I G H T
                  </div>
                  <div className="chart-container">
                    <Line
                      ref={rightChartRef}
                      data={rightEarData}
                      options={options}
                      onDoubleClick={(evt) => handleChartDoubleClick(evt, rightChartRef.current)}
                    />
                  </div>
                </div>
                <div className="graph-box">
                  <div className="graph-title" style={{ color: "blue" }}>
                    L E F T
                  </div>
                  <div className="chart-container">
                    <Line
                      ref={leftChartRef}
                      data={leftEarData}
                      options={options}
                      onDoubleClick={(evt) => handleChartDoubleClick(evt, leftChartRef.current)}
                    />
                  </div>
                </div>
              </div>

              <div className="pta-summary">
                <div className="pta-summary-item">
                  <div className="summary-label">PTA Right</div>
                  <div className="summary-value">{ptaValues.right ? `${ptaValues.right} dBHL` : ""}</div>
                </div>
                <div className="pta-summary-item">
                  <div className="summary-label">PTA Left</div>
                  <div className="summary-value">{ptaValues.left ? `${ptaValues.left} dBHL` : ""}</div>
                </div>
              </div>

              <div className="pta-diagnosis-card">
                <div className="pta-header">
                  <h3 className="pta-title">Recommendations</h3>
                  <div className="pta-switch-container">
                    <div
                      className={`pta-toggle ${recommendationsEnabled ? "pta-active" : ""}`}
                      onClick={() => setRecommendationsEnabled(!recommendationsEnabled)}
                    >
                      <div className="pta-toggle-handle"></div>
                    </div>
                    <span className="pta-switch-label">Enable Section</span>
                  </div>
                </div>
                <div className={!recommendationsEnabled ? "pta-disabled" : ""}>
                  <textarea
                    className="pta-recommendations-textarea"
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    placeholder="Enter recommendations / advice / next steps / precautions..."
                    rows={4}
                    disabled={loadingSession}
                  />
                </div>
              </div>
            </div>

            <div className="symbol-legend-container">
              <div className="symbol-legend-header">Symbol Legend</div>
              <div className="symbol-legend-list">
                {columns.map((col) => (
                  <div key={col.key} className="symbol-legend-row">
                    <div
                      className="symbol-preview"
                      style={{
                        color: colorMap[col.key] || "#444",
                        fontSize: col.key.includes("Bracket") ? "0.7rem" : "0.9rem",
                        fontWeight: ["rightBracket", "leftBracket", "circle", "triangle"].includes(col.key)
                          ? "bold"
                          : "normal",
                      }}
                    >
                      {col.symbol}
                    </div>
                    <div className="symbol-text-content">
                      <span className="symbol-key">{col.key}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {zoomed && (
            <div
              className="pta-zoom-overlay"
              onMouseDown={(e) => {
                if (e.target.classList.contains("pta-zoom-overlay")) closeZoom();
              }}
            >
              <div className="pta-zoomed-panel">
                <div className="pta-zoom-header">
                  <h3 className="pta-DualEar-header">Dual Ear Audiogram</h3>
                </div>
                <div className="pta-zoom-graphs">
                  <div className="zoom-graph-box">
                    <div className="zoom-graph-title" style={{ color: "red" }}>
                      R I G H T<span className="span-ear">E A R</span>
                    </div>
                    <div className="zoom-chart-wrapper">
                      <Line
                        ref={zoomedRightChartRef}
                        data={rightEarData}
                        options={options}
                        onDoubleClick={(evt) => handleChartDoubleClick(evt, zoomedRightChartRef.current)}
                      />
                    </div>
                  </div>

                  <div className="symbol-palette">
                    {columns.map((col) => (
                      <button
                        key={col.key}
                        className={`symbol-btn ${activeSymbolKey === col.key ? "active" : ""}`}
                        onClick={() => handleSymbolClick(col.key)}
                        title={col.label}
                      >
                        <span className="symbol-char">{col.symbol}</span>
                        <span className="symbol-text">{col.key}</span>
                      </button>
                    ))}
                  </div>

                  <div className="zoom-graph-box">
                    <div className="zoom-graph-title" style={{ color: "blue" }}>
                      L E F T <span className="span-ear">E A R</span>
                    </div>
                    <div className="zoom-chart-wrapper">
                      <Line
                        ref={zoomedLeftChartRef}
                        data={leftEarData}
                        options={options}
                        onDoubleClick={(evt) => handleChartDoubleClick(evt, zoomedLeftChartRef.current)}
                      />
                    </div>
                  </div>
                </div>
                <div className="pta-zoom-footer">
                  <button className="btn-secondary" onClick={() => setActiveSymbolKey(null)}>
                    Deselect
                  </button>
                  <button className="btn-primary" onClick={closeZoom}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPatientDetails && (
            <PatientDetails onClose={handlePatientDetailsClose} sessionType="puretone" />
          )}

          {showReport && (
            <MakePTAReport
              onClose={() => setShowReport(false)}
              rightEarData={rightEarData}
              leftEarData={leftEarData}
              options={options}
              patientInfo={patientInfo || {}}
              ptaValues={ptaValues}
              formData={formData}
              patientId={currentPatientId}
              speechData={speechData}
              weberData={weberData}
              diagnosis={diagnosis}
              reportSections={reportSections}
              recommendations={recommendations}
              recommendationsEnabled={recommendationsEnabled}
            />
          )}

          {showFormatSelector && (
            <ReportFormatSelector
              onClose={() => setShowFormatSelector(false)}
              onSelectFormat={(sections, formatName) => {
                setReportSections(sections);
                setCurrentFormatName(formatName || "Custom");
              }}
              rightEarData={rightEarData}
              leftEarData={leftEarData}
              options={options}
              patientInfo={patientInfo}
              ptaValues={ptaValues}
              diagnosis={diagnosis}
              speechData={speechData}
              weberData={weberData}
              reportSections={reportSections}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default PureToneAudiometry;