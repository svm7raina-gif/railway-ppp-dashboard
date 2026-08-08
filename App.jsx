import { useState, useMemo, useCallback } from "react";

// ─── COLOUR / TYPE TOKENS ────────────────────────────────────────────────────
// Deep navy infrastructure feel with saffron-gold accent (Indian Railways palette)
// Signature: animated IRR gauge that pulses on the recommendation card

const COLORS = {
  navy: "#0B1F3A",
  navyMid: "#122847",
  navyLight: "#1A3560",
  gold: "#F5A623",
  goldLight: "#FBBF24",
  emerald: "#10B981",
  ruby: "#EF4444",
  amber: "#F59E0B",
  slate: "#64748B",
  slateLight: "#94A3B8",
  white: "#F8FAFC",
  cardBg: "#0F2540",
  border: "#1E3A5F",
  textPrimary: "#F1F5F9",
  textSec: "#94A3B8",
};

// ─── STATION PRESETS ─────────────────────────────────────────────────────────
const PRESET_STATIONS = [
  { id: 1, name: "Rani Kamlapati (Bhopal)", city: "Bhopal", tier: 2, footfall: 65000, landArea: 8.5, cityGDP: 1.2, existingRevenue: 42, commercialPotential: 78, distanceCBD: 1.2, catchmentPop: 24, constructionCost: 450, concessionPeriod: 45, discountRate: 10, revenueGrowth: 8, leasePremium: 2200, buildUpArea: 420000, commercialMix: 60 },
  { id: 2, name: "Gandhinagar Capital", city: "Gandhinagar", tier: 2, footfall: 28000, landArea: 5.2, cityGDP: 0.9, existingRevenue: 18, commercialPotential: 62, distanceCBD: 0.8, catchmentPop: 14, constructionCost: 280, concessionPeriod: 40, discountRate: 10, revenueGrowth: 7, leasePremium: 1800, buildUpArea: 250000, commercialMix: 55 },
  { id: 3, name: "New Delhi Station", city: "Delhi", tier: 1, footfall: 450000, landArea: 22.0, cityGDP: 8.5, existingRevenue: 320, commercialPotential: 96, distanceCBD: 0.5, catchmentPop: 85, constructionCost: 2800, concessionPeriod: 50, discountRate: 9.5, revenueGrowth: 10, leasePremium: 8500, buildUpArea: 1800000, commercialMix: 65 },
  { id: 4, name: "CSMT Mumbai", city: "Mumbai", tier: 1, footfall: 380000, landArea: 18.5, cityGDP: 10.2, existingRevenue: 280, commercialPotential: 94, distanceCBD: 0.3, catchmentPop: 120, constructionCost: 3200, concessionPeriod: 50, discountRate: 9.5, revenueGrowth: 9, leasePremium: 12000, buildUpArea: 1500000, commercialMix: 70 },
  { id: 5, name: "Howrah Station", city: "Kolkata", tier: 1, footfall: 320000, landArea: 14.2, cityGDP: 5.1, existingRevenue: 180, commercialPotential: 82, distanceCBD: 1.5, catchmentPop: 78, constructionCost: 1900, concessionPeriod: 45, discountRate: 10, revenueGrowth: 7, leasePremium: 5500, buildUpArea: 1100000, commercialMix: 58 },
  { id: 6, name: "Agra Cantt", city: "Agra", tier: 3, footfall: 45000, landArea: 6.8, cityGDP: 0.6, existingRevenue: 28, commercialPotential: 54, distanceCBD: 2.8, catchmentPop: 18, constructionCost: 320, concessionPeriod: 35, discountRate: 11, revenueGrowth: 6, leasePremium: 1400, buildUpArea: 280000, commercialMix: 45 },
  { id: 7, name: "Varanasi Junction", city: "Varanasi", tier: 2, footfall: 85000, landArea: 9.4, cityGDP: 0.8, existingRevenue: 55, commercialPotential: 70, distanceCBD: 1.8, catchmentPop: 32, constructionCost: 580, concessionPeriod: 40, discountRate: 10.5, revenueGrowth: 8, leasePremium: 2800, buildUpArea: 520000, commercialMix: 52 },
  { id: 8, name: "Lucknow Charbagh", city: "Lucknow", tier: 2, footfall: 95000, landArea: 10.1, cityGDP: 1.1, existingRevenue: 62, commercialPotential: 72, distanceCBD: 0.9, catchmentPop: 38, constructionCost: 620, concessionPeriod: 40, discountRate: 10, revenueGrowth: 9, leasePremium: 3200, buildUpArea: 580000, commercialMix: 56 },
];

const BLANK_STATION = { id: Date.now(), name: "New Station", city: "", tier: 2, footfall: 50000, landArea: 8, cityGDP: 1.0, existingRevenue: 40, commercialPotential: 65, distanceCBD: 2.0, catchmentPop: 25, constructionCost: 500, concessionPeriod: 40, discountRate: 10, revenueGrowth: 8, leasePremium: 2500, buildUpArea: 400000, commercialMix: 55 };

// ─── CORE FINANCIAL ENGINE ────────────────────────────────────────────────────
function computeFinancials(s, scenario = "base") {
  const mult = scenario === "optimistic" ? 1.20 : scenario === "pessimistic" ? 0.75 : 1.0;
  const costMult = scenario === "optimistic" ? 0.90 : scenario === "pessimistic" ? 1.25 : 1.0;

  const capex = s.constructionCost * costMult; // ₹ Cr
  const T = s.concessionPeriod;
  const r = s.discountRate / 100;
  const g = (s.revenueGrowth / 100) * mult;

  // Year-1 revenues
  const commercialLeaseRev = (s.buildUpArea * (s.commercialMix / 100) * s.leasePremium * mult) / 1e7; // ₹ Cr
  const udfRev = (s.footfall * 365 * 30 * mult) / 1e7; // UDF @ ₹30/pax
  const adRev = (s.footfall * 365 * 5 * mult) / 1e7;
  const ancillaryRev = s.existingRevenue * 0.3 * mult;
  const yr1Revenue = commercialLeaseRev + udfRev + adRev + ancillaryRev;

  // Annual O&M ~ 2.5% of capex
  const oam = capex * 0.025 * costMult;
  // Concession fee to IR ~ 15% of revenue
  const conFeeRate = 0.15;

  // Build DCF
  let npv = -capex;
  let cumCF = -capex;
  let paybackYear = null;
  const cashflows = [];
  let equity = capex * 0.30;
  let debt = capex * 0.70;
  const debtRate = 0.085;
  const debtTenor = Math.min(20, T - 5);
  const annualDebtService = debt > 0 ? (debt * debtRate * Math.pow(1 + debtRate, debtTenor)) / (Math.pow(1 + debtRate, debtTenor) - 1) : 0;

  for (let t = 1; t <= T; t++) {
    const rev = yr1Revenue * Math.pow(1 + g, t - 1);
    const conFee = rev * conFeeRate;
    const ebitda = rev - oam - conFee;
    const ds = t <= debtTenor ? annualDebtService : 0;
    const fcf = ebitda - ds;
    const pv = fcf / Math.pow(1 + r, t);
    npv += pv;
    cumCF += fcf;
    cashflows.push({ year: t, rev, ebitda, fcf, cumCF });
    if (!paybackYear && cumCF >= 0) paybackYear = t;
  }

  // IRR via Newton-Raphson
  let irr = 0.12;
  for (let iter = 0; iter < 200; iter++) {
    let f = -capex, df = 0;
    cashflows.forEach(({ fcf }, i) => {
      const t = i + 1;
      f += fcf / Math.pow(1 + irr, t);
      df -= (t * fcf) / Math.pow(1 + irr, t + 1);
    });
    const step = f / df;
    irr -= step;
    if (Math.abs(step) < 1e-8) break;
  }

  // DSCR (average of debt service years)
  const dscrValues = cashflows.slice(0, debtTenor).map(({ ebitda }, i) => ebitda / annualDebtService);
  const avgDSCR = dscrValues.length ? dscrValues.reduce((a, b) => a + b, 0) / dscrValues.length : 0;

  // Equity IRR
  let eirr = 0.15;
  for (let iter = 0; iter < 200; iter++) {
    let f = -equity, df = 0;
    cashflows.forEach(({ fcf }, i) => {
      const t = i + 1;
      const ecf = t <= debtTenor ? fcf : fcf; // simplified
      f += ecf / Math.pow(1 + eirr, t);
      df -= (t * ecf) / Math.pow(1 + eirr, t + 1);
    });
    const step = f / df;
    eirr -= step;
    if (Math.abs(step) < 1e-8) break;
  }

  return {
    npv: Math.round(npv * 10) / 10,
    irr: Math.round(irr * 1000) / 10,
    eirr: Math.round(eirr * 1000) / 10,
    paybackYear: paybackYear || T,
    avgDSCR: Math.round(avgDSCR * 100) / 100,
    yr1Revenue: Math.round(yr1Revenue * 10) / 10,
    capex,
    cashflows,
    debtTenor,
    annualDebtService: Math.round(annualDebtService * 10) / 10,
  };
}

// ─── SCORING ENGINE ───────────────────────────────────────────────────────────
function computePSI(s) {
  // Weighted PSI (0–100)
  const weights = { footfall: 0.22, commercialPotential: 0.20, landArea: 0.12, cityGDP: 0.14, distanceCBD: 0.10, catchmentPop: 0.12, existingRevenue: 0.10 };
  const norm = (v, min, max) => Math.min(1, Math.max(0, (v - min) / (max - min)));
  const scores = {
    footfall: norm(s.footfall, 10000, 500000),
    commercialPotential: norm(s.commercialPotential, 0, 100) ,
    landArea: norm(s.landArea, 2, 25),
    cityGDP: norm(s.cityGDP, 0.3, 12),
    distanceCBD: norm(5 - s.distanceCBD, 0, 5), // closer = better
    catchmentPop: norm(s.catchmentPop, 5, 130),
    existingRevenue: norm(s.existingRevenue, 5, 350),
  };
  const psi = Object.keys(weights).reduce((sum, k) => sum + weights[k] * scores[k] * 100, 0);
  return Math.round(psi * 10) / 10;
}

// ─── RECOMMENDATION ENGINE ────────────────────────────────────────────────────
function getRecommendation(psi, irr, dscr, npv) {
  if (psi >= 70 && irr >= 14 && dscr >= 1.3 && npv > 0) {
    return { model: "Full PPP", label: "FULL PPP", color: COLORS.emerald, icon: "🏗️", detail: "High commercial viability. Private sector can bear full capex and O&M. Recommend DBFOT/BOT-Toll concession with 45–50 year period. IR earns revenue share + upfront premium." };
  } else if (psi >= 50 && irr >= 10 && dscr >= 1.1 && npv > 0) {
    return { model: "Hybrid", label: "HYBRID PPP", color: COLORS.gold, icon: "⚙️", detail: "Moderate viability. Recommend Hybrid Annuity Model (HAM): IR funds 40% capex, private party funds 60%. Reduces private risk while retaining efficiency gains. Suitable for Tier-2 stations." };
  } else if (psi >= 35 && irr >= 7) {
    return { model: "OMT", label: "OMT / AMRIT BHARAT", color: COLORS.amber, icon: "🔄", detail: "Limited commercial appeal. Operate-Maintain-Transfer model recommended. IR funds redevelopment, private operator manages O&M and earns concession fee. Aligns with Amrit Bharat scheme." };
  } else {
    return { model: "Railways", label: "IR INDEPENDENT", color: COLORS.ruby, icon: "🚂", detail: "Low commercial viability. PPP not feasible — private sector will not achieve minimum IRR. Indian Railways should develop independently with budgetary support or RRSK funding." };
  }
}

// ─── SENSITIVITY ANALYSIS ─────────────────────────────────────────────────────
function sensitivityAnalysis(s) {
  const base = computeFinancials(s, "base").irr;
  const vars = [
    { label: "Footfall (+20%)", key: "footfall", delta: 1.20 },
    { label: "Lease Premium (+20%)", key: "leasePremium", delta: 1.20 },
    { label: "Revenue Growth (+2pp)", key: "revenueGrowth", delta: null, abs: 2 },
    { label: "Construction Cost (-10%)", key: "constructionCost", delta: 0.90 },
    { label: "Discount Rate (-1pp)", key: "discountRate", delta: null, abs: -1 },
    { label: "Footfall (-20%)", key: "footfall", delta: 0.80 },
    { label: "Lease Premium (-20%)", key: "leasePremium", delta: 0.80 },
    { label: "Revenue Growth (-2pp)", key: "revenueGrowth", delta: null, abs: -2 },
    { label: "Construction Cost (+25%)", key: "constructionCost", delta: 1.25 },
    { label: "Discount Rate (+1pp)", key: "discountRate", delta: null, abs: 1 },
  ];
  return vars.map(v => {
    const mod = { ...s };
    if (v.delta !== null) mod[v.key] = s[v.key] * v.delta;
    else mod[v.key] = s[v.key] + v.abs;
    const irrMod = computeFinancials(mod, "base").irr;
    return { label: v.label, irr: irrMod, delta: Math.round((irrMod - base) * 10) / 10, positive: irrMod >= base };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

// ─── FIELD DEFINITIONS ────────────────────────────────────────────────────────
const FIELDS = [
  { key: "name", label: "Station Name", type: "text", group: "Basic" },
  { key: "city", label: "City", type: "text", group: "Basic" },
  { key: "tier", label: "City Tier", type: "select", options: [1, 2, 3], group: "Basic" },
  { key: "footfall", label: "Daily Footfall (pax)", type: "number", min: 1000, max: 600000, group: "Traffic" },
  { key: "catchmentPop", label: "Catchment Population (Lakhs)", type: "number", min: 1, max: 200, group: "Traffic" },
  { key: "landArea", label: "Land Area (Acres)", type: "number", min: 1, max: 50, group: "Land" },
  { key: "buildUpArea", label: "Potential Build-up Area (sqft)", type: "number", min: 50000, max: 3000000, group: "Land" },
  { key: "commercialMix", label: "Commercial Mix (%)", type: "number", min: 20, max: 85, group: "Land" },
  { key: "distanceCBD", label: "Distance from CBD (km)", type: "number", min: 0.1, max: 20, step: 0.1, group: "Land" },
  { key: "cityGDP", label: "City GDP (₹ Lakh Cr)", type: "number", min: 0.1, max: 15, step: 0.1, group: "Economic" },
  { key: "commercialPotential", label: "Commercial Potential Score (0–100)", type: "number", min: 0, max: 100, group: "Economic" },
  { key: "existingRevenue", label: "Existing Station Revenue (₹ Cr/yr)", type: "number", min: 1, max: 500, group: "Economic" },
  { key: "constructionCost", label: "Construction Capex (₹ Cr)", type: "number", min: 50, max: 5000, group: "Financial" },
  { key: "leasePremium", label: "Lease Premium (₹/sqft/yr)", type: "number", min: 200, max: 15000, group: "Financial" },
  { key: "concessionPeriod", label: "Concession Period (Years)", type: "number", min: 20, max: 60, group: "Financial" },
  { key: "discountRate", label: "Discount Rate / WACC (%)", type: "number", min: 6, max: 18, step: 0.5, group: "Financial" },
  { key: "revenueGrowth", label: "Revenue Growth Rate (% p.a.)", type: "number", min: 2, max: 20, step: 0.5, group: "Financial" },
];

const GROUPS = ["Basic", "Traffic", "Land", "Economic", "Financial"];

// ─── MINI COMPONENTS ─────────────────────────────────────────────────────────
const Chip = ({ label, color }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}55`, borderRadius: 6, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>{label}</span>
);

const KPI = ({ label, value, unit, color, sub }) => (
  <div style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 18px", minWidth: 130, flex: 1 }}>
    <div style={{ color: COLORS.textSec, fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>{label}</div>
    <div style={{ color: color || COLORS.gold, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{value}<span style={{ fontSize: 13, fontWeight: 500, marginLeft: 3 }}>{unit}</span></div>
    {sub && <div style={{ color: COLORS.slateLight, fontSize: 11, marginTop: 4 }}>{sub}</div>}
  </div>
);

// ─── TORNADO CHART ────────────────────────────────────────────────────────────
function TornadoChart({ data, baseIRR }) {
  const maxAbs = Math.max(...data.map(d => Math.abs(d.delta)), 0.1);
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ color: COLORS.textSec, fontSize: 11, marginBottom: 8, textAlign: "center" }}>Base IRR: <b style={{ color: COLORS.gold }}>{baseIRR}%</b> · Each bar shows IRR change from base</div>
      {data.map((d, i) => {
        const pct = (Math.abs(d.delta) / maxAbs) * 44;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 5, gap: 6 }}>
            <div style={{ width: 160, fontSize: 10, color: COLORS.textSec, textAlign: "right", flexShrink: 0 }}>{d.label}</div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", position: "relative", height: 20 }}>
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: COLORS.border }} />
              {d.positive ? (
                <div style={{ position: "absolute", left: "50%", width: `${pct}%`, height: 16, top: 2, background: COLORS.emerald + "CC", borderRadius: "0 4px 4px 0" }} />
              ) : (
                <div style={{ position: "absolute", right: "50%", width: `${pct}%`, height: 16, top: 2, background: COLORS.ruby + "CC", borderRadius: "4px 0 0 4px" }} />
              )}
            </div>
            <div style={{ width: 52, fontSize: 10, color: d.positive ? COLORS.emerald : COLORS.ruby, fontWeight: 700, flexShrink: 0 }}>
              {d.positive ? "+" : ""}{d.delta}%
            </div>
            <div style={{ width: 40, fontSize: 10, color: COLORS.gold, flexShrink: 0 }}>{d.irr}%</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CASH FLOW CHART ─────────────────────────────────────────────────────────
function CashflowChart({ cashflows }) {
  const maxAbs = Math.max(...cashflows.map(c => Math.abs(c.cumCF)), 1);
  const show = cashflows.filter((_, i) => i % 5 === 0 || i === cashflows.length - 1 || cashflows[i].cumCF >= 0 && (i === 0 || cashflows[i - 1].cumCF < 0));
  const chartH = 110;
  const zero = (maxAbs / (2 * maxAbs)) * chartH;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={Math.max(600, cashflows.length * 14)} height={chartH + 30} style={{ display: "block" }}>
        {/* Zero line */}
        <line x1={0} y1={zero} x2={cashflows.length * 14} y2={zero} stroke={COLORS.border} strokeDasharray="4 3" />
        {/* Area fill */}
        <path
          d={`M 0 ${chartH} ` + cashflows.map((c, i) => {
            const y = chartH - ((c.cumCF + maxAbs) / (2 * maxAbs)) * chartH;
            return `L ${i * 14} ${y}`;
          }).join(" ") + ` L ${(cashflows.length - 1) * 14} ${chartH} Z`}
          fill={COLORS.gold + "22"}
        />
        <path
          d={cashflows.map((c, i) => {
            const y = chartH - ((c.cumCF + maxAbs) / (2 * maxAbs)) * chartH;
            return `${i === 0 ? "M" : "L"} ${i * 14} ${y}`;
          }).join(" ")}
          fill="none" stroke={COLORS.gold} strokeWidth={2}
        />
        {/* Dots at breakeven */}
        {cashflows.map((c, i) => {
          if (i > 0 && cashflows[i - 1].cumCF < 0 && c.cumCF >= 0) {
            const y = chartH - ((c.cumCF + maxAbs) / (2 * maxAbs)) * chartH;
            return <g key={i}><circle cx={i * 14} cy={y} r={5} fill={COLORS.emerald} /><text x={i * 14} y={y - 8} fill={COLORS.emerald} fontSize={9} textAnchor="middle">Yr {i + 1}</text></g>;
          }
          return null;
        })}
        {/* X axis labels */}
        {cashflows.map((c, i) => i % 10 === 0 && (
          <text key={i} x={i * 14} y={chartH + 20} fill={COLORS.slateLight} fontSize={9} textAnchor="middle">Y{i + 1}</text>
        ))}
      </svg>
      <div style={{ fontSize: 10, color: COLORS.textSec, textAlign: "center", marginTop: 2 }}>Cumulative Cash Flow (₹ Cr) · Green dot = Payback Year</div>
    </div>
  );
}

// ─── RANKING TABLE ────────────────────────────────────────────────────────────
function RankingTable({ stations, selected, onSelect }) {
  const rows = useMemo(() => stations.map(s => {
    const psi = computePSI(s);
    const fin = computeFinancials(s, "base");
    const rec = getRecommendation(psi, fin.irr, fin.avgDSCR, fin.npv);
    return { s, psi, fin, rec };
  }).sort((a, b) => b.psi - a.psi), [stations]);

  const cols = [
    { label: "#", w: 30 }, { label: "Station", w: 160 }, { label: "PSI", w: 55 },
    { label: "IRR %", w: 60 }, { label: "NPV (₹Cr)", w: 85 }, { label: "DSCR", w: 55 },
    { label: "Payback", w: 65 }, { label: "Model", w: 130 },
  ];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>{cols.map(c => <th key={c.label} style={{ padding: "8px 10px", textAlign: "left", color: COLORS.textSec, fontWeight: 600, fontSize: 11, letterSpacing: 1, borderBottom: `1px solid ${COLORS.border}`, whiteSpace: "nowrap" }}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(({ s, psi, fin, rec }, idx) => {
            const isSel = selected?.id === s.id;
            return (
              <tr key={s.id} onClick={() => onSelect(s)} style={{ cursor: "pointer", background: isSel ? COLORS.navyLight : "transparent", transition: "background 0.15s" }}>
                <td style={{ padding: "9px 10px", color: COLORS.gold, fontWeight: 800 }}>{idx + 1}</td>
                <td style={{ padding: "9px 10px", color: COLORS.textPrimary, fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: "9px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 36, height: 6, background: COLORS.border, borderRadius: 3, overflow: "hidden" }}><div style={{ width: `${psi}%`, height: "100%", background: psi >= 70 ? COLORS.emerald : psi >= 50 ? COLORS.gold : COLORS.ruby, borderRadius: 3 }} /></div>
                    <span style={{ color: COLORS.gold, fontWeight: 700 }}>{psi}</span>
                  </div>
                </td>
                <td style={{ padding: "9px 10px", color: fin.irr >= 14 ? COLORS.emerald : fin.irr >= 10 ? COLORS.gold : COLORS.ruby, fontWeight: 700 }}>{fin.irr}%</td>
                <td style={{ padding: "9px 10px", color: fin.npv > 0 ? COLORS.emerald : COLORS.ruby, fontWeight: 600 }}>{fin.npv > 0 ? "+" : ""}{fin.npv}</td>
                <td style={{ padding: "9px 10px", color: fin.avgDSCR >= 1.3 ? COLORS.emerald : fin.avgDSCR >= 1.1 ? COLORS.gold : COLORS.ruby }}>{fin.avgDSCR}</td>
                <td style={{ padding: "9px 10px", color: COLORS.textSec }}>Yr {fin.paybackYear}</td>
                <td style={{ padding: "9px 10px" }}><Chip label={rec.label} color={rec.color} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── SCENARIO COMPARISON ─────────────────────────────────────────────────────
function ScenarioPanel({ station }) {
  const scenarios = ["pessimistic", "base", "optimistic"];
  const labels = { pessimistic: "🔴 Pessimistic", base: "🟡 Base Case", optimistic: "🟢 Optimistic" };
  const descs = {
    pessimistic: "Footfall −20%, cost +25%, revenue growth −25%",
    base: "As-entered assumptions",
    optimistic: "Footfall +20%, cost −10%, revenue growth +20%",
  };
  const data = scenarios.map(sc => ({ sc, fin: computeFinancials(station, sc) }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
      {data.map(({ sc, fin }) => {
        const rec = getRecommendation(computePSI(station), fin.irr, fin.avgDSCR, fin.npv);
        return (
          <div key={sc} style={{ background: COLORS.navyMid, border: `1px solid ${rec.color}44`, borderRadius: 12, padding: 16 }}>
            <div style={{ color: COLORS.textPrimary, fontWeight: 700, marginBottom: 4 }}>{labels[sc]}</div>
            <div style={{ color: COLORS.textSec, fontSize: 11, marginBottom: 12 }}>{descs[sc]}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                ["Project IRR", `${fin.irr}%`, fin.irr >= 12 ? COLORS.emerald : fin.irr >= 8 ? COLORS.gold : COLORS.ruby],
                ["Equity IRR", `${fin.eirr}%`, fin.eirr >= 15 ? COLORS.emerald : fin.eirr >= 10 ? COLORS.gold : COLORS.ruby],
                ["NPV", `₹${fin.npv} Cr`, fin.npv > 0 ? COLORS.emerald : COLORS.ruby],
                ["DSCR", fin.avgDSCR, fin.avgDSCR >= 1.3 ? COLORS.emerald : fin.avgDSCR >= 1.1 ? COLORS.gold : COLORS.ruby],
                ["Payback", `Yr ${fin.paybackYear}`, COLORS.textPrimary],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 6 }}>
                  <span style={{ color: COLORS.textSec, fontSize: 12 }}>{l}</span>
                  <span style={{ color: c, fontWeight: 700, fontSize: 13 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12 }}><Chip label={rec.label} color={rec.color} /></div>
            <div style={{ color: COLORS.textSec, fontSize: 10, marginTop: 8 }}>{rec.detail}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MODEL DECISION MATRIX ────────────────────────────────────────────────────
function ModelMatrix() {
  const matrix = [
    { model: "Full PPP (BOT/DBFOT)", psi: "≥ 70", irr: "≥ 14%", dscr: "≥ 1.3", npv: "> 0", color: COLORS.emerald, who: "Private sector fully", examples: "CSMT, New Delhi, Howrah", rationale: "High commercial value; private party bears full capex & O&M risk. IR earns upfront premium + revenue share." },
    { model: "Hybrid Annuity (HAM)", psi: "50–70", irr: "10–14%", dscr: "1.1–1.3", npv: "> 0", color: COLORS.gold, who: "40% IR + 60% Private", examples: "Varanasi, Lucknow, Rani Kamlapati", rationale: "Moderate viability; IR co-funds to reduce private risk. Annuity payments from IR ensure DSCR comfort." },
    { model: "OMT Concession", psi: "35–50", irr: "7–10%", dscr: "1.0–1.1", npv: "Marginal", color: COLORS.amber, who: "IR funds, private operates", examples: "Agra, Tier-3 heritage stations", rationale: "Low commercial appeal. Private manages O&M efficiently; IR retains capital risk. Aligns with Amrit Bharat scheme." },
    { model: "IR Independent", psi: "< 35", irr: "< 7%", dscr: "< 1.0", npv: "< 0", color: COLORS.ruby, who: "100% Indian Railways", examples: "Rural, remote, strategic stations", rationale: "PPP non-viable. No private appetite. Develop via RRSK/budgetary support. Focus on safety & connectivity." },
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: COLORS.navyLight }}>
            {["Model", "PSI Range", "IRR Threshold", "DSCR", "NPV", "Capex Bearer", "Example Stations", "Rationale"].map(h => (
              <th key={h} style={{ padding: "10px 12px", color: COLORS.gold, fontWeight: 700, fontSize: 11, letterSpacing: 0.8, textAlign: "left", borderBottom: `2px solid ${COLORS.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <td style={{ padding: "12px 12px" }}><Chip label={row.model} color={row.color} /></td>
              <td style={{ padding: "12px 12px", color: COLORS.textPrimary, fontWeight: 600 }}>{row.psi}</td>
              <td style={{ padding: "12px 12px", color: row.color, fontWeight: 700 }}>{row.irr}</td>
              <td style={{ padding: "12px 12px", color: COLORS.textPrimary }}>{row.dscr}</td>
              <td style={{ padding: "12px 12px", color: COLORS.textPrimary }}>{row.npv}</td>
              <td style={{ padding: "12px 12px", color: COLORS.slateLight }}>{row.who}</td>
              <td style={{ padding: "12px 12px", color: COLORS.textSec, fontSize: 11 }}>{row.examples}</td>
              <td style={{ padding: "12px 12px", color: COLORS.textSec, fontSize: 11, maxWidth: 200 }}>{row.rationale}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [stations, setStations] = useState(PRESET_STATIONS);
  const [selected, setSelected] = useState(PRESET_STATIONS[0]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [editMode, setEditMode] = useState(false);
  const [activeGroup, setActiveGroup] = useState("Basic");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStation, setNewStation] = useState({ ...BLANK_STATION });

  // Live computations for selected station
  const psi = useMemo(() => computePSI(selected), [selected]);
  const fin = useMemo(() => computeFinancials(selected, "base"), [selected]);
  const rec = useMemo(() => getRecommendation(psi, fin.irr, fin.avgDSCR, fin.npv), [psi, fin]);
  const sensitivity = useMemo(() => sensitivityAnalysis(selected), [selected]);

  const updateSelected = useCallback((key, val) => {
    const updated = { ...selected, [key]: typeof val === "string" && key !== "name" && key !== "city" ? parseFloat(val) || 0 : val };
    setSelected(updated);
    setStations(prev => prev.map(s => s.id === updated.id ? updated : s));
  }, [selected]);

  const addStation = () => {
    const s = { ...newStation, id: Date.now() };
    setStations(prev => [...prev, s]);
    setSelected(s);
    setShowAddModal(false);
    setNewStation({ ...BLANK_STATION });
    setActiveTab("dashboard");
  };

  const removeStation = (id) => {
    setStations(prev => {
      const next = prev.filter(s => s.id !== id);
      if (selected.id === id && next.length) setSelected(next[0]);
      return next;
    });
  };

  const TABS = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "inputs", label: "⚙️ Parameters" },
    { id: "scenarios", label: "🎭 Scenarios" },
    { id: "sensitivity", label: "🌪️ Sensitivity" },
    { id: "cashflow", label: "📈 Cash Flows" },
    { id: "ranking", label: "🏆 Rankings" },
    { id: "matrix", label: "🗺️ Decision Matrix" },
  ];

  const s = selected;

  return (
    <div style={{ background: COLORS.navy, minHeight: "100vh", fontFamily: "'Inter', 'Segoe UI', sans-serif", color: COLORS.textPrimary }}>

      {/* ── HEADER ── */}
      <div style={{ background: COLORS.navyMid, borderBottom: `1px solid ${COLORS.border}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🚉</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.gold, letterSpacing: 0.5 }}>Railway PPP Decision Engine</div>
              <div style={{ fontSize: 11, color: COLORS.textSec, marginTop: 1 }}>NMP 2.0 · Station Redevelopment Viability & Prioritization Model</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={selected.id}
            onChange={e => { const st = stations.find(x => x.id === +e.target.value); if (st) setSelected(st); }}
            style={{ background: COLORS.navyLight, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
          >
            {stations.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
          <button onClick={() => setShowAddModal(true)} style={{ background: COLORS.gold, color: COLORS.navy, border: "none", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Add Station</button>
          {stations.length > 1 && <button onClick={() => removeStation(selected.id)} style={{ background: COLORS.ruby + "22", color: COLORS.ruby, border: `1px solid ${COLORS.ruby}44`, borderRadius: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>Remove</button>}
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ background: COLORS.navyMid, borderBottom: `1px solid ${COLORS.border}`, padding: "0 24px", display: "flex", gap: 4, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ background: "none", border: "none", borderBottom: `3px solid ${activeTab === t.id ? COLORS.gold : "transparent"}`, color: activeTab === t.id ? COLORS.gold : COLORS.textSec, padding: "12px 14px", fontSize: 13, fontWeight: activeTab === t.id ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s" }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ── DASHBOARD TAB ── */}
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Station header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{s.name}</h2>
                <div style={{ color: COLORS.textSec, fontSize: 13, marginTop: 4 }}>
                  {s.city} · Tier {s.tier} City · {s.landArea} acres · {(s.footfall / 1000).toFixed(0)}K pax/day
                </div>
              </div>
              <div style={{ background: rec.color + "18", border: `2px solid ${rec.color}55`, borderRadius: 14, padding: "14px 20px", textAlign: "center", minWidth: 180 }}>
                <div style={{ fontSize: 28 }}>{rec.icon}</div>
                <div style={{ color: rec.color, fontWeight: 800, fontSize: 16, marginTop: 4 }}>{rec.label}</div>
                <div style={{ color: COLORS.textSec, fontSize: 10, marginTop: 4, maxWidth: 180 }}>{rec.detail.slice(0, 80)}…</div>
              </div>
            </div>

            {/* KPI Row 1 */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <KPI label="PPP SUITABILITY INDEX" value={psi} unit="/100" color={psi >= 70 ? COLORS.emerald : psi >= 50 ? COLORS.gold : COLORS.ruby} sub="Weighted multi-criteria score" />
              <KPI label="PROJECT IRR" value={`${fin.irr}%`} unit="" color={fin.irr >= 14 ? COLORS.emerald : fin.irr >= 10 ? COLORS.gold : COLORS.ruby} sub={`Hurdle rate: ${s.discountRate}%`} />
              <KPI label="EQUITY IRR" value={`${fin.eirr}%`} unit="" color={fin.eirr >= 15 ? COLORS.emerald : COLORS.gold} sub="Post-debt equity return" />
              <KPI label="NET PRESENT VALUE" value={`₹${fin.npv}`} unit="Cr" color={fin.npv > 0 ? COLORS.emerald : COLORS.ruby} sub={`Disc. rate: ${s.discountRate}%`} />
            </div>

            {/* KPI Row 2 */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <KPI label="AVG. DSCR" value={fin.avgDSCR} unit="x" color={fin.avgDSCR >= 1.3 ? COLORS.emerald : fin.avgDSCR >= 1.1 ? COLORS.gold : COLORS.ruby} sub="Min 1.20x for lenders" />
              <KPI label="PAYBACK PERIOD" value={`Yr ${fin.paybackYear}`} unit="" color={COLORS.textPrimary} sub={`${s.concessionPeriod}yr concession`} />
              <KPI label="YR-1 REVENUE" value={`₹${fin.yr1Revenue}`} unit="Cr" color={COLORS.gold} sub="Commercial + UDF + Ancillary" />
              <KPI label="TOTAL CAPEX" value={`₹${fin.capex}`} unit="Cr" color={COLORS.textPrimary} sub="Incl. contingencies" />
              <KPI label="ANNUAL DEBT SVC" value={`₹${fin.annualDebtService}`} unit="Cr" color={COLORS.textSec} sub={`${fin.debtTenor}yr tenor @ 8.5%`} />
            </div>

            {/* PSI Breakdown */}
            <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14 }}>PPP Suitability Index — Component Breakdown</div>
              {[
                { label: "Passenger Footfall", score: Math.min(100, (s.footfall / 500000) * 100), weight: "22%" },
                { label: "Commercial Potential", score: s.commercialPotential, weight: "20%" },
                { label: "City GDP Scale", score: Math.min(100, (s.cityGDP / 12) * 100), weight: "14%" },
                { label: "Catchment Population", score: Math.min(100, (s.catchmentPop / 130) * 100), weight: "12%" },
                { label: "Available Land Area", score: Math.min(100, (s.landArea / 25) * 100), weight: "12%" },
                { label: "CBD Proximity", score: Math.min(100, Math.max(0, (1 - s.distanceCBD / 5)) * 100), weight: "10%" },
                { label: "Existing Revenue Base", score: Math.min(100, (s.existingRevenue / 350) * 100), weight: "10%" },
              ].map(({ label, score, weight }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 160, fontSize: 12, color: COLORS.textSec }}>{label}</div>
                  <div style={{ flex: 1, height: 8, background: COLORS.border, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${score}%`, height: "100%", background: score >= 70 ? COLORS.emerald : score >= 40 ? COLORS.gold : COLORS.ruby, borderRadius: 4, transition: "width 0.3s" }} />
                  </div>
                  <div style={{ width: 36, color: COLORS.gold, fontSize: 12, fontWeight: 600 }}>{score.toFixed(0)}</div>
                  <div style={{ width: 36, color: COLORS.textSec, fontSize: 11 }}>{weight}</div>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 10, marginTop: 6, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
                <span style={{ color: COLORS.textSec, fontSize: 12 }}>Composite PSI Score:</span>
                <span style={{ color: COLORS.gold, fontSize: 20, fontWeight: 800 }}>{psi}/100</span>
              </div>
            </div>

            {/* Recommendation Detail */}
            <div style={{ background: rec.color + "12", border: `1px solid ${rec.color}44`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: rec.color, marginBottom: 8 }}>{rec.icon} Recommendation: {rec.label}</div>
              <div style={{ color: COLORS.textSec, fontSize: 13, lineHeight: 1.7 }}>{rec.detail}</div>
              <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: COLORS.textSec }}><b style={{ color: COLORS.textPrimary }}>NMP 2.0 Alignment:</b> IR targets ₹1,00,000 Cr from 200 stations (OMT) + ₹7,500 Cr from 15 stations (DBFOT PPP)</div>
                <div style={{ fontSize: 12, color: COLORS.textSec }}><b style={{ color: COLORS.textPrimary }}>Concession Model:</b> {rec.model === "Full PPP" ? "DBFOT / BOT-Toll" : rec.model === "Hybrid" ? "HAM (60:40 funding)" : rec.model === "OMT" ? "Operate-Maintain-Transfer" : "Budgetary / RRSK"}</div>
              </div>
            </div>
          </div>
        )}

        {/* ── PARAMETERS TAB ── */}
        {activeTab === "inputs" && (
          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {GROUPS.map(g => (
                <button key={g} onClick={() => setActiveGroup(g)} style={{ background: activeGroup === g ? COLORS.gold : COLORS.navyMid, color: activeGroup === g ? COLORS.navy : COLORS.textSec, border: `1px solid ${activeGroup === g ? COLORS.gold : COLORS.border}`, borderRadius: 8, padding: "10px 16px", textAlign: "left", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{g} Parameters</button>
              ))}
            </div>
            <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 18, color: COLORS.gold }}>{activeGroup} Parameters — {s.name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
                {FIELDS.filter(f => f.group === activeGroup).map(f => (
                  <div key={f.key}>
                    <label style={{ display: "block", color: COLORS.textSec, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{f.label}</label>
                    {f.type === "select" ? (
                      <select value={s[f.key]} onChange={e => updateSelected(f.key, parseInt(e.target.value))}
                        style={{ width: "100%", background: COLORS.navyLight, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14 }}>
                        {f.options.map(o => <option key={o} value={o}>Tier {o}</option>)}
                      </select>
                    ) : f.type === "text" ? (
                      <input type="text" value={s[f.key]} onChange={e => updateSelected(f.key, e.target.value)}
                        style={{ width: "100%", background: COLORS.navyLight, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, boxSizing: "border-box" }} />
                    ) : (
                      <div>
                        <input type="range" min={f.min} max={f.max} step={f.step || 1} value={s[f.key]}
                          onChange={e => updateSelected(f.key, parseFloat(e.target.value))}
                          style={{ width: "100%", accentColor: COLORS.gold, cursor: "pointer" }} />
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: COLORS.textSec, fontSize: 11 }}>{f.min}</span>
                          <input type="number" value={s[f.key]} step={f.step || 1}
                            onChange={e => updateSelected(f.key, parseFloat(e.target.value))}
                            style={{ background: COLORS.navyLight, color: COLORS.gold, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 13, fontWeight: 700, width: 100, textAlign: "center" }} />
                          <span style={{ color: COLORS.textSec, fontSize: 11 }}>{f.max}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Live preview */}
              <div style={{ marginTop: 24, padding: 16, background: COLORS.navyMid, borderRadius: 10, display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div style={{ color: COLORS.textSec, fontSize: 12 }}>Live Preview →</div>
                {[["PSI", psi, COLORS.gold], ["IRR", `${fin.irr}%`, fin.irr >= 14 ? COLORS.emerald : COLORS.gold], ["NPV", `₹${fin.npv}Cr`, fin.npv > 0 ? COLORS.emerald : COLORS.ruby], ["Rec.", rec.label, rec.color]].map(([l, v, c]) => (
                  <div key={l}><span style={{ color: COLORS.textSec, fontSize: 11 }}>{l}: </span><span style={{ color: c, fontWeight: 700 }}>{v}</span></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SCENARIOS TAB ── */}
        {activeTab === "scenarios" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Three-Scenario Analysis — {s.name}</div>
            <div style={{ color: COLORS.textSec, fontSize: 13 }}>Stress-testing the financial model under pessimistic, base, and optimistic macro assumptions. Variations applied to footfall, construction cost, and revenue growth simultaneously.</div>
            <ScenarioPanel station={s} />
            <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Scenario Assumption Summary</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr>{["Variable", "Pessimistic", "Base Case", "Optimistic"].map(h => <th key={h} style={{ padding: "8px 12px", color: COLORS.textSec, fontWeight: 600, textAlign: "left", borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>)}</tr></thead>
                <tbody>
                  {[
                    ["Footfall Multiplier", "−20%", "0%", "+20%"],
                    ["Construction Cost", "+25%", "0%", "−10%"],
                    ["Revenue Growth", "−25%", "0%", "+20%"],
                    ["Lease Premium", "−25%", "0%", "+20%"],
                    ["O&M Cost", "+25%", "0%", "−10%"],
                  ].map(([l, p, b, o]) => (
                    <tr key={l} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "9px 12px", color: COLORS.textPrimary }}>{l}</td>
                      <td style={{ padding: "9px 12px", color: COLORS.ruby }}>{p}</td>
                      <td style={{ padding: "9px 12px", color: COLORS.gold }}>{b}</td>
                      <td style={{ padding: "9px 12px", color: COLORS.emerald }}>{o}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SENSITIVITY TAB ── */}
        {activeTab === "sensitivity" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Tornado Sensitivity Analysis — {s.name}</div>
            <div style={{ color: COLORS.textSec, fontSize: 13 }}>Each variable is shocked independently while others remain at base. Shows which assumptions most affect Project IRR. Wider bars = higher sensitivity = greater focus area for due diligence.</div>
            <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20 }}>
              <TornadoChart data={sensitivity} baseIRR={fin.irr} />
            </div>
            <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Sensitivity Data Table</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr>{["Variable", "Shocked IRR", "Δ IRR from Base", "Impact"].map(h => <th key={h} style={{ padding: "8px 12px", color: COLORS.textSec, fontWeight: 600, textAlign: "left", borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>)}</tr></thead>
                <tbody>
                  {sensitivity.map((d, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "9px 12px", color: COLORS.textPrimary }}>{d.label}</td>
                      <td style={{ padding: "9px 12px", color: COLORS.gold, fontWeight: 700 }}>{d.irr}%</td>
                      <td style={{ padding: "9px 12px", color: d.positive ? COLORS.emerald : COLORS.ruby, fontWeight: 700 }}>{d.positive ? "+" : ""}{d.delta}%</td>
                      <td style={{ padding: "9px 12px" }}>
                        <div style={{ width: `${Math.abs(d.delta) * 15}px`, height: 8, background: d.positive ? COLORS.emerald : COLORS.ruby, borderRadius: 4, maxWidth: 120 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CASHFLOW TAB ── */}
        {activeTab === "cashflow" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Cash Flow Model — {s.name} ({s.concessionPeriod}-Year Concession)</div>
            <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
              <CashflowChart cashflows={fin.cashflows} />
            </div>
            <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Annual Cash Flow Detail (Selected Years)</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr>{["Year", "Revenue (₹Cr)", "EBITDA (₹Cr)", "Debt Service", "FCF (₹Cr)", "Cumulative CF"].map(h => <th key={h} style={{ padding: "8px 12px", color: COLORS.textSec, fontWeight: 600, textAlign: "right", borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {fin.cashflows.filter((_, i) => i < 5 || i % 5 === 4 || i === fin.cashflows.length - 1).map(c => (
                      <tr key={c.year} style={{ borderBottom: `1px solid ${COLORS.border}`, background: c.cumCF >= 0 && fin.cashflows[c.year - 2]?.cumCF < 0 ? COLORS.emerald + "18" : "transparent" }}>
                        <td style={{ padding: "9px 12px", color: COLORS.gold, fontWeight: 700, textAlign: "right" }}>{c.year}</td>
                        <td style={{ padding: "9px 12px", color: COLORS.textPrimary, textAlign: "right" }}>{c.rev.toFixed(1)}</td>
                        <td style={{ padding: "9px 12px", color: COLORS.textPrimary, textAlign: "right" }}>{c.ebitda.toFixed(1)}</td>
                        <td style={{ padding: "9px 12px", color: COLORS.textSec, textAlign: "right" }}>{c.year <= fin.debtTenor ? fin.annualDebtService.toFixed(1) : "—"}</td>
                        <td style={{ padding: "9px 12px", color: c.fcf >= 0 ? COLORS.emerald : COLORS.ruby, fontWeight: 600, textAlign: "right" }}>{c.fcf.toFixed(1)}</td>
                        <td style={{ padding: "9px 12px", color: c.cumCF >= 0 ? COLORS.emerald : COLORS.ruby, fontWeight: 700, textAlign: "right" }}>{c.cumCF.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── RANKING TAB ── */}
        {activeTab === "ranking" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Station Prioritization Rankings — All {stations.length} Stations</div>
            <div style={{ color: COLORS.textSec, fontSize: 13 }}>Sorted by PPP Suitability Index (PSI). Click any row to load that station for detailed analysis. Green = Full PPP viable, Gold = Hybrid recommended, Amber = OMT only, Red = IR independent.</div>
            <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
              <RankingTable stations={stations} selected={selected} onSelect={s => { setSelected(s); setActiveTab("dashboard"); }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {[
                { label: "Full PPP Stations", count: stations.filter(s => { const p = computePSI(s); const f = computeFinancials(s, "base"); return p >= 70 && f.irr >= 14; }).length, color: COLORS.emerald },
                { label: "Hybrid PPP", count: stations.filter(s => { const p = computePSI(s); const f = computeFinancials(s, "base"); return p >= 50 && p < 70 && f.irr >= 10; }).length, color: COLORS.gold },
                { label: "OMT / Amrit Bharat", count: stations.filter(s => { const p = computePSI(s); const f = computeFinancials(s, "base"); return p >= 35 && p < 50 && f.irr >= 7; }).length, color: COLORS.amber },
                { label: "IR Independent", count: stations.filter(s => { const p = computePSI(s); const f = computeFinancials(s, "base"); return p < 35 || f.irr < 7; }).length, color: COLORS.ruby },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ background: COLORS.cardBg, border: `1px solid ${color}44`, borderRadius: 10, padding: 16, textAlign: "center" }}>
                  <div style={{ color, fontSize: 32, fontWeight: 800 }}>{count}</div>
                  <div style={{ color: COLORS.textSec, fontSize: 12, marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MATRIX TAB ── */}
        {activeTab === "matrix" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>PPP Model Decision Matrix</div>
            <div style={{ color: COLORS.textSec, fontSize: 13 }}>Framework for selecting the appropriate development model for any railway station. Based on NMP 2.0 guidelines, IR's concession policy, and international PPP best practices (JR East, MTRC Hong Kong, Network Rail).</div>
            <div style={{ background: COLORS.cardBg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 18 }}>
              <ModelMatrix />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {[
                { title: "Full PPP (DBFOT/BOT)", color: COLORS.emerald, points: ["Private bears 100% capex & O&M risk", "Revenue share to IR (typically 10–25%)", "Upfront premium to IR", "45–50 year concession period", "Asset reverts to IR at end of term", "Best for Tier-1 city mega-stations"] },
                { title: "Hybrid PPP (HAM)", color: COLORS.gold, points: ["IR funds 40% capex (construction support)", "Private funds 60% capex", "IR pays annuity during operations", "Reduces risk for private sector", "Suitable for Tier-2 cities", "Typical 35–45 year concession"] },
                { title: "OMT Concession", color: COLORS.amber, points: ["IR funds entire capex (EPC model)", "Private entity operates & maintains", "Concession fee paid to IR", "Performance penalties for SLAs", "Aligns with Amrit Bharat scheme", "Lower returns, lower risk for both"] },
                { title: "IR Independent", color: COLORS.ruby, points: ["100% government funding via RRSK", "Indian Railways controls all operations", "No private sector involvement", "For strategic/rural/heritage stations", "Focus on safety & accessibility", "May receive Viability Gap Funding"] },
              ].map(({ title, color, points }) => (
                <div key={title} style={{ background: COLORS.cardBg, border: `1px solid ${color}44`, borderRadius: 12, padding: 16 }}>
                  <Chip label={title} color={color} />
                  <ul style={{ margin: "12px 0 0 16px", padding: 0, color: COLORS.textSec, fontSize: 12, lineHeight: 1.8 }}>
                    {points.map(p => <li key={p}>{p}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── ADD STATION MODAL ── */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000A", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: COLORS.navyMid, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 28, width: 520, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: COLORS.gold, marginBottom: 20 }}>Add New Station</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {FIELDS.map(f => (
                <div key={f.key} style={{ gridColumn: f.key === "name" ? "1/-1" : "auto" }}>
                  <label style={{ display: "block", color: COLORS.textSec, fontSize: 11, fontWeight: 600, marginBottom: 5 }}>{f.label}</label>
                  {f.type === "select" ? (
                    <select value={newStation[f.key]} onChange={e => setNewStation(p => ({ ...p, [f.key]: parseInt(e.target.value) }))}
                      style={{ width: "100%", background: COLORS.navyLight, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13 }}>
                      {f.options.map(o => <option key={o} value={o}>Tier {o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} value={newStation[f.key]} step={f.step || 1}
                      onChange={e => setNewStation(p => ({ ...p, [f.key]: f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))}
                      style={{ width: "100%", background: COLORS.navyLight, color: COLORS.textPrimary, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, boxSizing: "border-box" }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={addStation} style={{ flex: 1, background: COLORS.gold, color: COLORS.navy, border: "none", borderRadius: 8, padding: "12px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Add Station</button>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, background: "none", color: COLORS.textSec, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "12px", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
