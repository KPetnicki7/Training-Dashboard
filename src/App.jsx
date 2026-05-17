import { useState, useEffect, useCallback } from "react";

// ============ DATA LAYER ============
const EXPECTED_HEADERS = ["date", "workout", "miles", "minutes", "elev_ft", "avg_hr", "max_hr", "avg_pace", "load", "temp_f", "humidity", "pace_at_hr180"];

function parseCSV(text) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 1) return [];
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const firstVals = lines[0].split(delimiter).map(v => v.trim());
  
  // Detect headers: if first cell is NOT a date pattern, treat as header row
  const firstCellIsDate = /^\d{4}-\d{2}-\d{2}/.test(firstVals[0]);
  
  let headers, dataLines;
  if (firstCellIsDate) {
    // No headers — apply defaults
    headers = EXPECTED_HEADERS.slice(0, firstVals.length);
    dataLines = lines;
  } else {
    // Use actual headers from the sheet, normalize temp_c → temp_f
    headers = firstVals.map(h => h === "temp_c" ? "temp_f" : h);
    dataLines = lines.slice(1);
  }
  
  return dataLines.map(line => {
    const vals = line.split(delimiter).map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
    return obj;
  }).filter(row => row.date && /^\d{4}-\d{2}-\d{2}/.test(row.date));
}

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTY520rcE3uu-AVM5Zm-h6iPJs5cqPgI4QaPP952YWaD68R5tbqCMRESiAbrran3yHPIQ10kpIYBmE/pub?gid=0&single=true&output=csv";

function useWorkoutData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);
  const [manualData, setManualData] = useState(null);

  // Try fetching from Google Sheets on mount
  useEffect(() => {
    let cancelled = false;
    const fetchSheet = async () => {
      try {
        const r = await fetch(SHEET_URL);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        if (!cancelled) {
          const parsed = parseCSV(text);
          if (parsed.length > 0) {
            setData(parsed);
            setLastSync("live");
            setError(null);
          } else {
            setError("Sheet returned no data");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          // If fetch fails, fall back to manual import data
          if (manualData) setData(manualData);
        }
      }
      if (!cancelled) setLoading(false);
    };
    fetchSheet();
    return () => { cancelled = true; };
  }, [manualData]);

  // Manual import as fallback
  const importCSV = useCallback((csvText) => {
    const workouts = parseCSV(csvText);
    if (workouts.length === 0) return { success: false, error: "No valid rows parsed" };
    setData(workouts);
    setManualData(workouts);
    setLastSync(new Date().toISOString());
    setError(null);
    return { success: true, count: workouts.length };
  }, []);

  const clearData = useCallback(() => {
    setData(null); setManualData(null); setLastSync(null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(SHEET_URL);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const text = await r.text();
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setData(parsed);
        setLastSync("live — " + new Date().toLocaleTimeString());
        setError(null);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  return { data, loading, lastSync, error, importCSV, clearData, refresh };
}

// ============ PLAN DATA ============
const PHASES = [
  {
    name: "Base / Rebuild",
    weeks: "1–3",
    dates: "May 14 – Jun 3",
    color: "#2D6A4F",
    goal: "Rebuild volume from 15 mpw, re-establish threshold, find current LT pace",
    philosophy: "Conservative ramp: 15 → 22 → 28 → 33 mpw. Two Norwegian threshold sessions per week, entirely HR-guided (176–186). Easy runs by HR (<155). You've had some tempo work recently, so the threshold stimulus won't be a shock — but the volume will be. Prioritize consistency over any single session. Strides maintain neuromuscular connection.",
    weeklyVolume: ["22–25 mi", "27–30 mi", "32–35 mi"],
    weekDetails: [
      { week: 1, label: "May 14–20", volume: "22–25 mi", days: [
        { day: "Wed", session: "Easy + 6×100m strides", detail: "4mi by HR (<155). Strides at 1500m effort on grass, full recovery. First day back — keep it honest.", zone: "Z1" },
        { day: "Thu", session: "Norwegian Threshold #1 (HR-guided)", detail: "1.5mi WU → 3×5min at HR 176–186. Note whatever pace this produces — it's your current LT baseline. w/ 90s jog → 1.5mi CD. Total: ~6mi.", zone: "Z2" },
        { day: "Fri", session: "Off or easy", detail: "Rest or 2mi shake-out by HR (<150).", zone: "Rest" },
        { day: "Sat", session: "🏋️ Strength + easy", detail: "HIIT strength. PM or after: 3mi easy by HR (<155).", zone: "STR" },
        { day: "Sun", session: "Long run", detail: "7mi by HR (145–157). Conversational. If HR creeps above 160, slow down.", zone: "Z1" },
        { day: "Mon", session: "Easy", detail: "3mi by HR (<155).", zone: "Z1" },
        { day: "Tue", session: "Norwegian Threshold #2 (HR-guided)", detail: "1.5mi WU → 3×6min at HR 176–184. Slightly longer reps, lower half of Z2. Note pace vs Thursday. w/ 2min jog → 1.5mi CD. Total: ~6mi.", zone: "Z2" },
      ]},
      { week: 2, label: "May 21–27", volume: "27–30 mi", days: [
        { day: "Wed", session: "Easy + 8×100m strides", detail: "5mi by HR (<155). Strides at mile effort.", zone: "Z1" },
        { day: "Thu", session: "Norwegian Threshold (HR-guided)", detail: "2mi WU → 4×5min at HR 176–186. Compare pace to Wk 1. w/ 90s jog → 2mi CD. Total: ~7mi.", zone: "Z2" },
        { day: "Fri", session: "Easy", detail: "4mi by HR (<155).", zone: "Z1" },
        { day: "Sat", session: "🏋️ Strength + easy", detail: "HIIT strength. PM: 3mi easy.", zone: "STR" },
        { day: "Sun", session: "Long run", detail: "8mi by HR (145–157).", zone: "Z1" },
        { day: "Mon", session: "Easy", detail: "4mi by HR (<155).", zone: "Z1" },
        { day: "Tue", session: "Norwegian Threshold (HR-guided)", detail: "2mi WU → 3×7min at HR 176–186. Extending rep length. w/ 2min jog → 2mi CD. Total: ~7.5mi.", zone: "Z2" },
      ]},
      { week: 3, label: "May 28 – Jun 3", volume: "32–35 mi", days: [
        { day: "Wed", session: "Easy + 8×100m strides", detail: "5mi by HR (<155).", zone: "Z1" },
        { day: "Thu", session: "Norwegian Threshold (HR → co-pilot)", detail: "2mi WU → 3×8min at HR 176–186. Pace should be tightening vs Wk 1. If pace at HR 180 is dropping, threshold is shifting. w/ 2min jog → 2mi CD. Total: ~8mi.", zone: "Z2" },
        { day: "Fri", session: "Easy", detail: "4mi by HR (<155).", zone: "Z1" },
        { day: "Sat", session: "🏋️ Strength + easy", detail: "HIIT strength. PM: 4mi easy.", zone: "STR" },
        { day: "Sun", session: "Long run (progression)", detail: "10mi: 7 by HR (<157), last 3 let effort rise to HR 157–167. Note pace at each HR.", zone: "Z1" },
        { day: "Mon", session: "Easy", detail: "4mi by HR (<155).", zone: "Z1" },
        { day: "Tue", session: "Threshold + bridge", detail: "2mi WU → 2×8min at HR 178–186 + 3×2min at 10K effort (HR ~188–192) w/ 90s jog between all → 2mi CD. First taste of Z3.", zone: "Z2→Z3" },
      ]},
    ]
  },
  {
    name: "Build / Specific",
    weeks: "4–6",
    dates: "Jun 4 – Jun 24",
    color: "#B56727",
    goal: "Introduce VO₂max at 5K pace, peak volume, continue threshold development",
    philosophy: "Canova's funnel: one session stays Norwegian threshold (HR-anchored), one shifts to VO₂max (pace-anchored at 5:35–5:44/mi, 97–103% of goal 5K pace). Volume peaks at ~38 mi in Week 5. Strength drops to maintenance — reduce metabolic load, focus on stability. June heat: trust HR on easy/threshold days, trust pace on VO₂max days.",
    weeklyVolume: ["34–37 mi", "37–40 mi", "33–36 mi ↓"],
    weekDetails: [
      { week: 4, label: "Jun 4–10", volume: "34–37 mi", days: [
        { day: "Wed", session: "Easy + 6×150m strides", detail: "5mi by HR (<155). Strides at 3K effort.", zone: "Z1" },
        { day: "Thu", session: "VO₂max Introduction (pace-anchored)", detail: "2mi WU → 5×800m at 5:35–5:44/mi (goal 5K pace, ~2:47–2:51 per 800). HR will lag — expect 186–194 by rep 3. Ceiling: 196. w/ 2:15 jog → 2mi CD.", zone: "Z3" },
        { day: "Fri", session: "Easy", detail: "4mi by HR (<155).", zone: "Z1" },
        { day: "Sat", session: "🏋️ Strength (maintenance) + easy", detail: "Reduce HIIT volume ~25%. Stability focus. PM: 4mi easy.", zone: "STR" },
        { day: "Sun", session: "Long run (w/ tempo)", detail: "11mi: 3 easy → 4mi at HR 163–173 (~Canova fundamental tempo) → 4 easy.", zone: "Z1" },
        { day: "Mon", session: "Easy", detail: "4mi by HR (<155).", zone: "Z1" },
        { day: "Tue", session: "Norwegian Threshold (HR-anchored)", detail: "2mi WU → 3×8min at HR 178–186. Pace co-piloting. w/ 2min jog → 2mi CD.", zone: "Z2" },
      ]},
      { week: 5, label: "Jun 11–17", volume: "37–40 mi (PEAK)", days: [
        { day: "Wed", session: "Easy + strides", detail: "5mi by HR (<155) + 8×100m.", zone: "Z1" },
        { day: "Thu", session: "VO₂max (extended)", detail: "2mi WU → 4×1000m at 5:32–5:40/mi (100–104% 5K pace). HR ceiling: 194. w/ 2:30 jog → 2mi CD.", zone: "Z3" },
        { day: "Fri", session: "Easy", detail: "5mi by HR (<155).", zone: "Z1" },
        { day: "Sat", session: "🏋️ Strength (maintenance) + easy", detail: "Short strength. PM: 4mi easy.", zone: "STR" },
        { day: "Sun", session: "Long run (tempo finish)", detail: "12mi: 8 easy by HR (<157) → 4 at HR 163–175. ⚠️ June heat: pace will be slower at same HR.", zone: "Z1" },
        { day: "Mon", session: "Easy", detail: "5mi by HR (<155).", zone: "Z1" },
        { day: "Tue", session: "Norwegian Threshold (HR-anchored)", detail: "2mi WU → 2×10min at HR 178–186. Long continuous threshold. w/ 2min jog → 2mi CD.", zone: "Z2" },
      ]},
      { week: 6, label: "Jun 18–24", volume: "33–36 mi (DOWN WEEK)", days: [
        { day: "Wed", session: "Easy + strides", detail: "5mi by HR (<155) + 6×100m.", zone: "Z1" },
        { day: "Thu", session: "VO₂max (moderate)", detail: "2mi WU → 4×800m at 5:35–5:40/mi. Same effort as Wk 4 — should feel noticeably easier. That's the adaptation. w/ 2:15 jog → 2mi CD.", zone: "Z3" },
        { day: "Fri", session: "Off", detail: "Complete rest. Absorb weeks 4–5.", zone: "Rest" },
        { day: "Sat", session: "🏋️ Strength (FINAL) + easy", detail: "Last strength session. Keep short. PM: 3mi easy.", zone: "STR" },
        { day: "Sun", session: "Long run", detail: "10mi easy by HR (<157).", zone: "Z1" },
        { day: "Mon", session: "Easy", detail: "4mi by HR (<155).", zone: "Z1" },
        { day: "Tue", session: "Norwegian Threshold (light)", detail: "2mi WU → 3×6min at HR 178–184. Recovery-oriented quality. w/ 2min jog → 2mi CD.", zone: "Z2" },
      ]},
    ]
  },
  {
    name: "Sharpen / Race",
    weeks: "7–8",
    dates: "Jun 25 – Jul 4",
    color: "#9B2226",
    goal: "Race-specific sharpening → taper → sub-17:50 on July 4th",
    philosophy: "Canova's specific period compressed to 2 weeks. One race-pace session per week, one threshold maintenance session. Volume drops: ~32 → ~25 mi. No strength. Bakken diagnostic in Week 8: stable HR across 800m reps at goal pace = ready. Race by feel + splits.",
    weeklyVolume: ["30–33 mi", "23–27 mi 🏁"],
    weekDetails: [
      { week: 7, label: "Jun 25 – Jul 1", volume: "30–33 mi", days: [
        { day: "Wed", session: "Easy + strides", detail: "5mi by HR (<155) + 6×150m at 3K effort.", zone: "Z1" },
        { day: "Thu", session: "5K-Specific Sharpening (pace-anchored)", detail: "2mi WU → 3×1200m at 5:32–5:40/mi (goal 5K pace to 102%) w/ 2:30 jog → 4×300m at 5:15/mi (Canova special speed) w/ 90s → 2mi CD. HR ceiling: 196.", zone: "Z3" },
        { day: "Fri", session: "Easy", detail: "4mi by HR (<155).", zone: "Z1" },
        { day: "Sat", session: "Easy", detail: "4mi by HR (<155). No strength from here.", zone: "Z1" },
        { day: "Sun", session: "Long run (reduced)", detail: "9mi easy by HR (<157). Last long run.", zone: "Z1" },
        { day: "Mon", session: "Easy", detail: "4mi by HR (<155).", zone: "Z1" },
        { day: "Tue", session: "Norwegian Threshold (short)", detail: "2mi WU → 2×7min at HR 178–184. Brief maintenance. w/ 2min jog → 2mi CD.", zone: "Z2" },
      ]},
      { week: 8, label: "Jul 2–4 🏁", volume: "23–27 mi (RACE WEEK)", days: [
        { day: "Wed", session: "Easy + strides", detail: "4mi by HR (<155) + 4×100m smooth.", zone: "Z1" },
        { day: "Thu", session: "Final Sharpener (Bakken diagnostic)", detail: "2mi WU → 4×800m at goal 5K pace (5:44/mi, ~2:51/800). THE readiness test: HR stable ±2 bpm from rep 2 onward = peaked. If HR drifts >4 bpm/rep, cut to 3 reps. → 2mi CD.", zone: "Z3" },
        { day: "Fri", session: "Easy", detail: "3mi by HR (<150). Hydration focus.", zone: "Z1" },
        { day: "Sat", session: "Openers", detail: "2.5mi WU → 4×200m at 3K pace by FEEL (springy, fast, effortless) w/ full recovery → 1.5mi CD.", zone: "NM" },
        { day: "Sun", session: "Shakeout", detail: "2mi very easy + 2 strides. Lay out race kit. Early dinner, early bed.", zone: "Z1" },
        { day: "Mon", session: "Off", detail: "Complete rest. Visualize the race.", zone: "Rest" },
        { day: "Tue", session: "🏁 RACE: July 4th — Sub-17:50", detail: "Target 17:45 (5:43/mi · 3:33/km). Mile 1: 5:45–5:47 (controlled). Mile 2: 5:42–5:45 (settle). Mile 3: 5:38–5:42 (push). Final 0.1: kick. HR will exceed 195.", zone: "RACE" },
      ]},
    ]
  }
];

const zoneColors = {
  "Z1": { bg: "#E8F5E9", text: "#2E7D32", border: "#A5D6A7" },
  "Z2": { bg: "#FFF3E0", text: "#E65100", border: "#FFCC80" },
  "Z2→Z3": { bg: "#FFF3E0", text: "#E65100", border: "#FFCC80" },
  "Z3": { bg: "#FFEBEE", text: "#C62828", border: "#EF9A9A" },
  "Rest": { bg: "#F3E5F5", text: "#6A1B9A", border: "#CE93D8" },
  "NM": { bg: "#E3F2FD", text: "#1565C0", border: "#90CAF9" },
  "STR": { bg: "#EFEBE9", text: "#4E342E", border: "#BCAAA4" },
  "RACE": { bg: "#FDD835", text: "#1A1A1A", border: "#F9A825" },
};

function ZoneBadge({ zone }) {
  const c = zoneColors[zone] || { bg: "#F5F5F5", text: "#424242", border: "#BDBDBD" };
  return <span style={{ display: "inline-block", padding: "2px 7px", borderRadius: "4px", fontSize: "9px", fontWeight: 700, backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>{zone}</span>;
}

// ============ RACE READINESS GAUGE ============
function RaceReadinessGauge({ data }) {
  if (!data || data.length === 0) return null;
  const paceToSec = p => { if (!p) return null; const pts = p.split(":"); return pts.length === 2 ? parseInt(pts[0]) * 60 + parseInt(pts[1]) : null; };
  const secToStr = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

  const planStart = new Date("2026-05-14T00:00:00");
  const now = new Date();
  const weekNum = Math.min(8, Math.max(1, Math.ceil((now - planStart) / (7 * 86400000))));
  const expectedVol = [23.5, 28.5, 33.5, 35.5, 38.5, 34.5, 31.5, 25];

  const today = new Date();
  const dayOfWeek = today.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const currentMonday = new Date(today); currentMonday.setDate(today.getDate() + mondayOffset);
  const mondayStr = currentMonday.toISOString().slice(0, 10);

  const twoWeeksAgo = new Date(now - 14 * 86400000).toISOString().slice(0, 10);
  const recentRuns = data.filter(w => w.date && w.date >= twoWeeksAgo);
  const recentMiles = recentRuns.reduce((s, a) => s + (parseFloat(a.miles) || 0), 0);
  const weeklyAvgMiles = recentMiles / 2;

  const expectedNow = expectedVol[Math.min(weekNum - 1, 7)];
  const volCompliance = Math.min(100, Math.round((weeklyAvgMiles / expectedNow) * 100));

  const ltEntries = data.filter(w => w.pace_at_hr180 && w.pace_at_hr180 !== "").sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const latestLT = ltEntries.length > 0 ? ltEntries[0] : null;
  const latestLTSec = latestLT ? paceToSec(latestLT.pace_at_hr180) : null;

  // Expected LT for 17:50 5K (LT ~6:15 start → 5:58 target)
  const expectedLT = [380, 375, 370, 367, 363, 362, 360, 358];
  const expectedLTNow = expectedLT[Math.min(weekNum - 1, 7)];
  const ltCompliance = latestLTSec ? Math.min(100, Math.round((expectedLTNow / latestLTSec) * 100)) : null;

  let est5K = null, est5KStr = null;
  if (latestLTSec) { const p = latestLTSec * 0.88; est5K = p * 3.1069; est5KStr = secToStr(est5K); }

  const runDays = new Set(data.filter(w => w.date && w.date >= twoWeeksAgo).map(w => w.date)).size;
  const consistencyScore = Math.min(100, Math.round((runDays / 8) * 100));
  let overallScore = ltCompliance !== null
    ? Math.round(ltCompliance * 0.4 + volCompliance * 0.35 + consistencyScore * 0.25)
    : Math.round(volCompliance * 0.55 + consistencyScore * 0.45);

  let status, statusColor, statusBg, statusBorder;
  if (overallScore >= 90) { status = "On Track"; statusColor = "#2E7D32"; statusBg = "#E8F5E9"; statusBorder = "#A5D6A7"; }
  else if (overallScore >= 70) { status = "Building"; statusColor = "#E65100"; statusBg = "#FFF3E0"; statusBorder = "#FFCC80"; }
  else if (overallScore >= 50) { status = "Behind"; statusColor = "#C62828"; statusBg = "#FFEBEE"; statusBorder = "#EF9A9A"; }
  else { status = "Off Plan"; statusColor = "#6A1B9A"; statusBg = "#F3E5F5"; statusBorder = "#CE93D8"; }

  const gaugeAngle = (overallScore / 100) * 180;
  const R = 70, cx = 90, cy = 80;
  const endAngle = Math.PI - (gaugeAngle * Math.PI / 180);
  const endX = cx + R * Math.cos(endAngle), endY = cy - R * Math.sin(endAngle);
  const largeArc = gaugeAngle > 180 ? 1 : 0;
  const nLen = R - 10;
  const nX = cx + nLen * Math.cos(endAngle), nY = cy - nLen * Math.sin(endAngle);

  return (
    <div style={{ margin: "14px 16px 0", backgroundColor: "#fff", borderRadius: "12px", padding: "16px", border: "1px solid #E8E8E4" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div>
          <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#999", marginBottom: "2px" }}>Race Readiness</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 700, fontSize: "16px", color: statusColor }}>{status}</span>
            <span style={{ fontSize: "11px", color: "#999" }}>Week {weekNum} of 8</span>
          </div>
        </div>
        <div style={{ padding: "4px 10px", backgroundColor: statusBg, borderRadius: "8px", border: `1px solid ${statusBorder}` }}>
          <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "'Source Serif 4', serif", color: statusColor, textAlign: "center" }}>{overallScore}</div>
          <div style={{ fontSize: "8px", fontWeight: 700, color: statusColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>score</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
        <svg width="180" height="95" viewBox="0 0 180 95">
          <path d={`M ${cx-R} ${cy} A ${R} ${R} 0 0 1 ${cx+R} ${cy}`} fill="none" stroke="#E8E8E4" strokeWidth="12" strokeLinecap="round" />
          {overallScore > 0 && <path d={`M ${cx-R} ${cy} A ${R} ${R} 0 ${largeArc} 1 ${endX} ${endY}`} fill="none" stroke={statusColor} strokeWidth="12" strokeLinecap="round" />}
          <line x1={cx} y1={cy} x2={nX} y2={nY} stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="4" fill="#1A1A1A" />
        </svg>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        <div style={{ textAlign: "center", padding: "8px 4px", backgroundColor: "#F5F5F0", borderRadius: "8px" }}>
          <div style={{ fontSize: "8px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Volume</div>
          <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Source Serif 4', serif" }}>{weeklyAvgMiles.toFixed(0)} mi</div>
          <div style={{ fontSize: "9px", color: volCompliance >= 85 ? "#2E7D32" : volCompliance >= 65 ? "#E65100" : "#C62828" }}>{volCompliance}% of target</div>
        </div>
        <div style={{ textAlign: "center", padding: "8px 4px", backgroundColor: "#F5F5F0", borderRadius: "8px" }}>
          <div style={{ fontSize: "8px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>LT Pace</div>
          {latestLT ? (<><div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Source Serif 4', serif" }}>{latestLT.pace_at_hr180}</div><div style={{ fontSize: "9px", color: ltCompliance >= 95 ? "#2E7D32" : ltCompliance >= 85 ? "#E65100" : "#C62828" }}>target: {secToStr(expectedLTNow)}</div></>) : (<><div style={{ fontSize: "14px", fontWeight: 700, color: "#BBB" }}>—</div><div style={{ fontSize: "9px", color: "#BBB" }}>awaiting data</div></>)}
        </div>
        <div style={{ textAlign: "center", padding: "8px 4px", backgroundColor: est5K && est5K <= 1070 ? "#E8F5E9" : est5K ? "#FFF8E1" : "#F5F5F0", borderRadius: "8px" }}>
          <div style={{ fontSize: "8px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Est. 5K</div>
          {est5KStr ? (<><div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Source Serif 4', serif", color: est5K <= 1070 ? "#2E7D32" : est5K <= 1110 ? "#E65100" : "#1A1A1A" }}>{est5KStr}</div><div style={{ fontSize: "9px", color: est5K <= 1070 ? "#2E7D32" : "#E65100" }}>{est5K <= 1070 ? "sub-17:50 ✓" : `${Math.round(est5K - 1070)}s gap`}</div></>) : (<><div style={{ fontSize: "14px", fontWeight: 700, color: "#BBB" }}>—</div><div style={{ fontSize: "9px", color: "#BBB" }}>need LT data</div></>)}
        </div>
      </div>

      {/* Context & Recommendations */}
      <div style={{ marginTop: "12px", padding: "10px 12px", backgroundColor: statusBg, borderRadius: "8px", border: `1px solid ${statusBorder}` }}>
        <div style={{ fontSize: "11px", color: "#444", lineHeight: 1.6 }}>
          {(() => {
            let context = "";
            if (!latestLT) {
              if (volCompliance >= 80) context = `Week ${weekNum}: Volume tracking at ${weeklyAvgMiles.toFixed(0)} mi/wk (${volCompliance}% of plan). No LT pace data yet — your next threshold session will set the baseline.`;
              else if (volCompliance >= 50) context = `Week ${weekNum}: Volume at ${weeklyAvgMiles.toFixed(0)} mi/wk, ${100-volCompliance}% below the ${expectedNow} mi target. With only 8 weeks, consistency is critical. No LT data yet.`;
              else context = `Week ${weekNum}: Volume significantly below plan. With a compressed 8-week timeline, every week of base matters. Prioritize getting runs in.`;
            } else {
              const gap = latestLTSec - expectedLTNow;
              if (gap <= 0 && volCompliance >= 80) context = `Week ${weekNum}: Strong position. LT pace (${latestLT.pace_at_hr180}/mi) is at or ahead of ${secToStr(expectedLTNow)}/mi target. Volume on track.${est5K && est5K <= 1070 ? " Projecting sub-17:50." : ""} Stay the course.`;
              else if (gap <= 5) context = `Week ${weekNum}: Trending well. LT pace (${latestLT.pace_at_hr180}/mi) within 5s of ${secToStr(expectedLTNow)}/mi target. Threshold responding.${est5K ? ` Projection: ${est5KStr}.` : ""}`;
              else if (gap <= 12) context = `Week ${weekNum}: LT pace (${latestLT.pace_at_hr180}/mi) is ${gap}s behind ${secToStr(expectedLTNow)}/mi target. With a compressed plan, this gap matters more — focus on recovery between sessions.${est5K ? ` Projection: ${est5KStr}.` : ""}`;
              else context = `Week ${weekNum}: LT pace (${latestLT.pace_at_hr180}/mi) is ${gap}s behind target. Consider whether 18:00–18:10 is a more realistic race target to avoid blowing up.${est5K ? ` Current projection: ${est5KStr}.` : ""}`;
            }
            let adj = [];
            if (volCompliance < 60) adj.push("Add an easy run — even 3mi helps. Don't skip the long run.");
            else if (volCompliance < 80) adj.push(`Add ${Math.round(expectedNow - weeklyAvgMiles)}–${Math.round(expectedNow - weeklyAvgMiles + 2)} more easy miles this week.`);
            if (latestLT && latestLTSec && latestLTSec - expectedLTNow > 12) adj.push("Threshold sessions: focus on HR control (176–186), not pace. Running too hard limits adaptation.");
            else if (!latestLT && weekNum >= 1) adj.push("Record a threshold session to establish your LT baseline.");
            if (consistencyScore < 60) adj.push("Aim for 4+ run days this week. Consistency > intensity in a compressed plan.");
            if (weekNum <= 2 && adj.length === 0) adj.push("Early rebuild — keep easy runs easy (HR <155). Volume ramp is the priority.");
            else if (weekNum >= 7 && adj.length === 0) adj.push("Taper phase — volume down, intensity stays. Trust the fitness. Don't panic-train.");
            if (adj.length === 0) adj.push("No adjustments needed — continue as planned.");
            return (<><span style={{ fontWeight: 600 }}>{context}</span>
              <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${statusBorder}` }}>
                <div style={{ fontSize: "9px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: statusColor, marginBottom: "4px" }}>This Week</div>
                {adj.map((a, i) => <div key={i} style={{ fontSize: "11px", color: "#555", lineHeight: 1.55, marginBottom: i < adj.length-1 ? "4px" : 0 }}>→ {a}</div>)}
              </div></>);
          })()}
        </div>
      </div>
    </div>
  );
}

// ============ TABS ============
function DataImportTab({ onImport, onClear, onRefresh, lastSync, dataCount, sheetError, loading }) {
  const [csv, setCsv] = useState("");
  const [status, setStatus] = useState(null);
  const handleImport = () => {
    if (!csv.trim()) return;
    const r = onImport(csv);
    if (r.success) { setStatus(`✓ Imported ${r.count} workouts`); setCsv(""); }
    else { setStatus(`Error: ${r.error}`); }
  };
  const isLive = lastSync && lastSync.toString().startsWith("live");
  return (
    <div>
      <h2 style={{ fontFamily: "'Source Serif 4', serif", fontSize: "19px", fontWeight: 700, margin: "0 0 4px" }}>Data Source</h2>
      <div style={{ backgroundColor: isLive ? "#E8F5E9" : sheetError ? "#FFEBEE" : "#FFF8E1", borderRadius: "10px", padding: "12px 14px", marginBottom: "14px", border: `1px solid ${isLive ? "#A5D6A7" : sheetError ? "#EF9A9A" : "#FFE082"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: isLive ? "#2E7D32" : sheetError ? "#C62828" : "#F57F17" }}>
              {loading ? "⏳ Connecting..." : isLive ? `🟢 Live — ${dataCount} workouts` : sheetError ? "🔴 Sheet unavailable" : "🟡 Manual import"}
            </div>
            {sheetError && <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>{sheetError}</div>}
            {isLive && <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>Auto-loaded from Google Sheet</div>}
          </div>
          <button onClick={onRefresh} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #E0E0DC", backgroundColor: "#fff", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>↻ Refresh</button>
        </div>
      </div>
      {!isLive && (
        <>
          <p style={{ fontSize: "12px", color: "#888", marginBottom: "10px", lineHeight: 1.5 }}>Paste data from Google Sheet as fallback: Select All → Copy → Paste below.</p>
          <textarea value={csv} onChange={e => setCsv(e.target.value)} placeholder="Paste sheet data here..." style={{ width: "100%", minHeight: "100px", padding: "10px", borderRadius: "8px", border: "1px solid #E0E0DC", fontSize: "11px", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button onClick={handleImport} style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", backgroundColor: "#2D6A4F", color: "#fff", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>Import</button>
            {dataCount > 0 && <button onClick={() => { onClear(); setStatus("Cleared"); }} style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #EF9A9A", backgroundColor: "#fff", color: "#C62828", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>Clear</button>}
          </div>
          {status && <div style={{ marginTop: "8px", fontSize: "12px", color: status.startsWith("Error") ? "#C62828" : "#2E7D32", fontWeight: 600 }}>{status}</div>}
        </>
      )}
      {isLive && <div style={{ fontSize: "12px", color: "#888", lineHeight: 1.6, marginTop: "4px" }}>Data refreshes on open. Click Refresh to pull latest. Strava syncs daily at 6 AM UTC → Sheet → here.</div>}
    </div>
  );
}

function WorkoutsTab({ data }) {
  if (!data || data.length === 0) return <div style={{ padding: "20px", textAlign: "center", color: "#999", fontSize: "13px" }}>No data yet. Use the <strong>Import</strong> tab.</div>;
  const sorted = [...data].sort((a, b) => (b.date||"").localeCompare(a.date||""));
  return (
    <div>
      <h2 style={{ fontFamily: "'Source Serif 4', serif", fontSize: "19px", fontWeight: 700, margin: "0 0 12px" }}>Recent Workouts</h2>
      {sorted.map((w, i) => {
        const hasHR = w.avg_hr && w.avg_hr !== "0" && w.avg_hr !== "";
        const hasPace = w.avg_pace && w.avg_pace !== "";
        const hasLoad = w.load && w.load !== "" && w.load !== "0";
        const hasWeather = w.temp_f && w.temp_f !== "";
        const hasLT = w.pace_at_hr180 && w.pace_at_hr180 !== "";
        return (
          <div key={i} style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "12px 14px", marginBottom: "8px", border: "1px solid #E8E8E4" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
              <div><div style={{ fontWeight: 700, fontSize: "13px" }}>{w.workout || "Untitled"}</div><div style={{ fontSize: "10px", color: "#999", marginTop: "1px" }}>{w.date}</div></div>
              {hasLoad && <div style={{ textAlign: "right", padding: "3px 8px", backgroundColor: "#FFF8E1", borderRadius: "6px", border: "1px solid #FFE082" }}><div style={{ fontSize: "9px", color: "#F57F17", fontWeight: 600 }}>LOAD</div><div style={{ fontSize: "14px", fontWeight: 700, fontFamily: "'Source Serif 4', serif" }}>{w.load}</div></div>}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", fontSize: "12px", marginBottom: hasLT ? "8px" : "0" }}>
              {w.miles && w.miles !== "0" && <span><span style={{ color: "#999" }}>Dist:</span> <strong>{w.miles} mi</strong></span>}
              {w.minutes && w.minutes !== "0" && <span><span style={{ color: "#999" }}>Time:</span> <strong>{w.minutes} min</strong></span>}
              {hasPace && <span><span style={{ color: "#999" }}>Pace:</span> <strong>{w.avg_pace}/mi</strong></span>}
              {hasHR && <span><span style={{ color: "#999" }}>HR:</span> <strong>{w.avg_hr}</strong>{w.max_hr ? <span style={{ color: "#BBB" }}> / {w.max_hr}</span> : ""}</span>}
              {w.elev_ft && w.elev_ft !== "0" && <span><span style={{ color: "#999" }}>Elev:</span> <strong>{w.elev_ft} ft</strong></span>}
              {hasWeather && <span><span style={{ color: "#999" }}>Temp:</span> <strong>{w.temp_f}°F</strong>{w.humidity ? <span style={{ color: "#BBB" }}> / {w.humidity}%</span> : ""}</span>}
            </div>
            {hasLT && <div style={{ borderTop: "1px solid #F0F0EC", paddingTop: "6px", fontSize: "11px" }}><span style={{ color: "#E65100" }}>⚡ Pace @ HR180: <strong>{w.pace_at_hr180}/mi</strong></span></div>}
          </div>
        );
      })}
    </div>
  );
}

function WeeklySummaryTab({ data }) {
  if (!data || data.length === 0) return <div style={{ padding: "20px", textAlign: "center", color: "#999", fontSize: "13px" }}>No data. Use <strong>Import</strong> tab.</div>;
  const weeks = {};
  data.forEach(w => { if (!w.date) return; const d = new Date(w.date+"T12:00:00"); const wd = d.getDay(); const off = wd===0?-6:1-wd; const m = new Date(d); m.setDate(d.getDate()+off); const k = m.toISOString().slice(0,10); if (!weeks[k]) weeks[k]=[]; weeks[k].push(w); });
  return (
    <div>
      <h2 style={{ fontFamily: "'Source Serif 4', serif", fontSize: "19px", fontWeight: 700, margin: "0 0 12px" }}>Weekly Summary</h2>
      {Object.keys(weeks).sort().reverse().map(wk => {
        const a = weeks[wk]; const mi = a.reduce((s,x)=>s+(parseFloat(x.miles)||0),0); const mins = a.reduce((s,x)=>s+(parseFloat(x.minutes)||0),0); const ld = a.reduce((s,x)=>s+(parseFloat(x.load)||0),0);
        return (
          <div key={wk} style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "12px 14px", marginBottom: "8px", border: "1px solid #E8E8E4" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}><div style={{ fontWeight: 700, fontSize: "13px" }}>Week of {wk}</div><div style={{ fontSize: "11px", color: "#888" }}>{a.length} runs</div></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {[["MILES",mi.toFixed(1)],["TIME",Math.round(mins)+"m"],["LOAD",Math.round(ld)]].map(([l,v],j)=>(
                <div key={j} style={{ textAlign: "center", padding: "6px", backgroundColor: j===2?"#FFF8E1":"#F5F5F0", borderRadius: "6px" }}><div style={{ fontSize: "9px", color: j===2?"#F57F17":"#999", fontWeight: 600 }}>{l}</div><div style={{ fontSize: "16px", fontWeight: 700, fontFamily: "'Source Serif 4', serif" }}>{v}</div></div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LTTab({ data }) {
  const ltEntries = (data||[]).filter(w => w.pace_at_hr180 && w.pace_at_hr180 !== "").sort((a,b) => (a.date||"").localeCompare(b.date||""));
  const paceToSec = p => { if (!p) return null; const pts = p.split(":"); return pts.length===2 ? parseInt(pts[0])*60+parseInt(pts[1]) : null; };
  const targets = [{ label: "Current LT (est.)", pace: "6:20" }, { label: "Wk 3 target", pace: "6:10" }, { label: "Wk 6 target", pace: "6:02" }, { label: "Race-ready LT", pace: "5:58" }];
  return (
    <div>
      <h2 style={{ fontFamily: "'Source Serif 4', serif", fontSize: "19px", fontWeight: 700, margin: "0 0 4px" }}>LT Pace Progression</h2>
      <p style={{ fontSize: "12px", color: "#888", marginBottom: "14px" }}>Pace at HR 180 bpm — the key fitness metric.</p>
      <div style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "12px 14px", marginBottom: "12px", border: "1px solid #E8E8E4" }}>
        <div style={{ fontWeight: 700, fontSize: "12px", marginBottom: "8px", color: "#888" }}>BENCHMARKS</div>
        {targets.map((t,i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: i<targets.length-1?"1px solid #F5F5F0":"none" }}><span style={{ fontSize: "12px", color: "#666" }}>{t.label}</span><span style={{ fontWeight: 700, fontSize: "13px", fontFamily: "'Source Serif 4', serif" }}>{t.pace}/mi</span></div>)}
      </div>
      {ltEntries.length === 0 ? (
        <div style={{ backgroundColor: "#FFF8E1", borderRadius: "10px", padding: "14px 16px", border: "1px solid #FFE082", fontSize: "12px", color: "#555", lineHeight: 1.6 }}>No pace-at-HR-180 data yet. Populates for runs with 30+ seconds at HR 177–183.</div>
      ) : (
        <div style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "12px 14px", border: "1px solid #E8E8E4" }}>
          <div style={{ fontWeight: 700, fontSize: "12px", marginBottom: "8px", color: "#888" }}>YOUR DATA</div>
          {ltEntries.map((e,i) => { const sec = paceToSec(e.pace_at_hr180); const on = sec&&sec<=362; const close = sec&&sec<=370&&sec>362; return (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i<ltEntries.length-1?"1px solid #F5F5F0":"none" }}>
              <div><div style={{ fontSize: "12px", fontWeight: 600 }}>{e.date}</div><div style={{ fontSize: "10px", color: "#999" }}>{e.workout}</div></div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ fontWeight: 700, fontSize: "15px", fontFamily: "'Source Serif 4', serif", color: on?"#2E7D32":close?"#E65100":"#1A1A1A" }}>{e.pace_at_hr180}/mi</span>{on&&<span>🟢</span>}{close&&<span>🟡</span>}</div>
            </div>); })}
        </div>
      )}
    </div>
  );
}

// ============ MAIN ============
export default function TrainingPlan() {
  const [activePhase, setActivePhase] = useState(0);
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [activeTab, setActiveTab] = useState("plan");
  const { data, loading, lastSync, error: sheetError, importCSV, clearData, refresh } = useWorkoutData();
  const phase = PHASES[activePhase];
  const tabs = [{ id: "plan", label: "Plan" }, { id: "workouts", label: "Workouts" }, { id: "weekly", label: "Weekly" }, { id: "lt", label: "LT Track" }, { id: "import", label: "Import" }];

  return (
    <div style={{ fontFamily: "'Libre Franklin', 'Helvetica Neue', sans-serif", backgroundColor: "#FAFAF7", minHeight: "100vh", color: "#1A1A1A", maxWidth: "600px", margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@300;400;500;600;700;800&family=Source+Serif+4:wght@400;600;700&display=swap" rel="stylesheet" />
      <div style={{ background: "linear-gradient(145deg, #0D0D0D 0%, #1A1A1A 50%, #2A1A0A 100%)", color: "#FAFAF7", padding: "28px 20px 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#B56727", marginBottom: "6px" }}>8-Week Plan · May 14 → Jul 4</div>
            <h1 style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "26px", fontWeight: 700, margin: "0 0 3px 0", lineHeight: 1.15 }}>Sub-17:50 5K</h1>
            <div style={{ fontSize: "12px", color: "#888" }}>Bakken · Canova · Norwegian Threshold</div>
          </div>
          <div style={{ textAlign: "right", padding: "8px 12px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ fontSize: "10px", color: "#888", fontWeight: 600 }}>TARGET</div>
            <div style={{ fontFamily: "'Source Serif 4', serif", fontSize: "20px", fontWeight: 700, color: "#FDD835" }}>17:45</div>
            <div style={{ fontSize: "10px", color: "#888" }}>5:43/mi · 3:33/km</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "3px", marginTop: "16px" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, padding: "7px 3px", borderRadius: "6px",
              border: activeTab === tab.id ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,255,255,0.08)",
              backgroundColor: activeTab === tab.id ? "rgba(255,255,255,0.1)" : "transparent",
              color: activeTab === tab.id ? "#fff" : "#666", fontSize: "9px", fontWeight: 600, cursor: "pointer",
            }}>
              {tab.label}
              {tab.id === "workouts" && data && data.length > 0 && <span style={{ marginLeft: "2px", opacity: 0.6 }}>({data.length})</span>}
              {tab.id === "import" && lastSync && <span style={{ marginLeft: "2px", color: "#4CAF50" }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {data && data.length > 0 && <RaceReadinessGauge data={data} />}

      <div style={{ padding: "14px 16px" }}>
        {activeTab === "import" && <DataImportTab onImport={importCSV} onClear={clearData} onRefresh={refresh} lastSync={lastSync} dataCount={data?data.length:0} sheetError={sheetError} loading={loading} />}
        {activeTab === "workouts" && <WorkoutsTab data={data} />}
        {activeTab === "weekly" && <WeeklySummaryTab data={data} />}
        {activeTab === "lt" && <LTTab data={data} />}
        {activeTab === "plan" && (
          <div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
              {PHASES.map((p, i) => (
                <button key={i} onClick={() => { setActivePhase(i); setExpandedWeek(null); }} style={{
                  flex: 1, padding: "10px 6px", borderRadius: "8px",
                  border: activePhase === i ? `2px solid ${p.color}` : "1px solid #E0E0DC",
                  backgroundColor: activePhase === i ? p.color : "#fff",
                  color: activePhase === i ? "#fff" : "#555",
                  fontSize: "11px", fontWeight: 700, cursor: "pointer", textAlign: "center", lineHeight: 1.25,
                }}>
                  <div>{p.name}</div>
                  <div style={{ fontSize: "9px", fontWeight: 400, opacity: 0.8, marginTop: "3px" }}>{p.dates}</div>
                </button>
              ))}
            </div>
            <div style={{ backgroundColor: "#fff", borderRadius: "10px", padding: "14px 16px", marginBottom: "12px", border: "1px solid #E8E8E4", borderLeft: `4px solid ${phase.color}` }}>
              <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "3px", color: phase.color }}>{phase.name}</div>
              <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "6px", color: "#444" }}>{phase.goal}</div>
              <div style={{ fontSize: "11px", color: "#666", lineHeight: 1.55 }}>{phase.philosophy}</div>
              <div style={{ marginTop: "8px", fontSize: "11px", color: "#999" }}><span style={{ fontWeight: 600, color: "#777" }}>Volume:</span> {phase.weeklyVolume.join(" → ")}</div>
            </div>
            {phase.weekDetails.map((week, wi) => (
              <div key={wi} style={{ marginBottom: "8px" }}>
                <button onClick={() => setExpandedWeek(expandedWeek === wi ? null : wi)} style={{
                  width: "100%", padding: "11px 14px", borderRadius: expandedWeek === wi ? "10px 10px 0 0" : "10px",
                  border: "1px solid #E0E0DC", borderBottom: expandedWeek === wi ? "none" : "1px solid #E0E0DC",
                  backgroundColor: "#fff", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left",
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "13px" }}>
                      Week {week.week}
                      {week.volume.includes("PEAK") && <span style={{ color: "#B56727", marginLeft: "6px", fontSize: "10px" }}>PEAK</span>}
                      {week.volume.includes("DOWN") && <span style={{ color: "#6A1B9A", marginLeft: "6px", fontSize: "10px" }}>↓ DOWN</span>}
                      {week.volume.includes("RACE") && <span style={{ color: "#C62828", marginLeft: "6px", fontSize: "10px" }}>🏁</span>}
                    </div>
                    <div style={{ fontSize: "10px", color: "#999" }}>{week.label} · {week.volume.split("(")[0].trim()}</div>
                  </div>
                  <div style={{ fontSize: "16px", color: "#BBB", transform: expandedWeek === wi ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s ease" }}>▾</div>
                </button>
                {expandedWeek === wi && (
                  <div style={{ backgroundColor: "#fff", borderRadius: "0 0 10px 10px", border: "1px solid #E0E0DC", borderTop: "none", padding: "2px 12px 10px" }}>
                    {week.days.map((d, di) => (
                      <div key={di} style={{ padding: "9px 0", borderBottom: di < week.days.length - 1 ? "1px solid #F5F5F0" : "none" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "3px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                            <span style={{ fontWeight: 700, fontSize: "10px", color: "#999", width: "28px", textTransform: "uppercase", flexShrink: 0 }}>{d.day}</span>
                            <span style={{ fontWeight: 600, fontSize: "12px", lineHeight: 1.3 }}>{d.session}</span>
                          </div>
                          <div style={{ flexShrink: 0, marginLeft: "8px" }}><ZoneBadge zone={d.zone} /></div>
                        </div>
                        <div style={{ fontSize: "11px", color: "#666", lineHeight: 1.5, marginLeft: "36px" }}>{d.detail}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {activePhase === 0 && <div style={{ backgroundColor: "#E8F5E9", borderRadius: "10px", padding: "12px 14px", marginTop: "10px", border: "1px solid #A5D6A7", fontSize: "11px", lineHeight: 1.6, color: "#2E7D32" }}><strong>Base Notes:</strong> Coming from 15 mpw, the ramp to 33 in 3 weeks is steep but your marathon base is still in there. If anything structural complains (shins, Achilles), hold volume flat for a week. Two threshold sessions per week from day one — your recent tempo work means the stimulus won't shock your system. HR-only for threshold: note what pace HR 180 produces and track it weekly.</div>}
            {activePhase === 1 && <div style={{ backgroundColor: "#FFF3E0", borderRadius: "10px", padding: "12px 14px", marginTop: "10px", border: "1px solid #FFCC80", fontSize: "11px", lineHeight: 1.6, color: "#BF5B04" }}><strong>Build Notes:</strong> VO₂max reps start at 800m (not 1000m) because you have less base under you than the original plan. Thursday is pace-anchored; Tuesday stays HR-anchored. Week 6 is a deliberate down week — with only 8 weeks, you need this absorption before the sharpen phase. Last strength session is Week 6. June heat: trust HR on threshold days, pace on VO₂max days.</div>}
            {activePhase === 2 && <div style={{ backgroundColor: "#FFEBEE", borderRadius: "10px", padding: "12px 14px", marginTop: "10px", border: "1px solid #EF9A9A", fontSize: "11px", lineHeight: 1.6, color: "#B71C1C" }}><strong>Race Notes:</strong> Compressed 2-week sharpen. Bakken diagnostic Thursday of race week: 4×800m at 5:44/mi — HR stability = go signal. Race strategy: conservative Mile 1 (5:45–5:47), settle Mile 2, push Mile 3. If it's hot July 4th, target 18:00 — the fitness is sub-17:50 in cool conditions.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
