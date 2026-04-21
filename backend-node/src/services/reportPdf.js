import React from "react";
import { renderToBuffer, Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYMZg.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf", fontWeight: 700 }
  ]
});
const colors = {
  primary: "#0f172a",
  secondary: "#334155",
  accent: "#3b82f6",
  white: "#ffffff",
  bg: "#f8fafc",
  border: "#e2e8f0",
  text: "#1e293b",
  muted: "#64748b",
  risk: {
    watch: "#16a34a",
    "pre-burnout": "#ea580c",
    "acute-distress": "#dc2626"
  }
};
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: "Inter",
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.white
  },
  header: {
    marginBottom: 30,
    borderBottom: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end"
  },
  headerLeft: {
    flexDirection: "column"
  },
  brand: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.primary,
    letterSpacing: -1
  },
  reportType: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.accent,
    textTransform: "uppercase",
    marginTop: 4
  },
  metaInfo: {
    fontSize: 8,
    color: colors.muted,
    textAlign: "right"
  },
  riskSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    padding: 15,
    borderRadius: 8
  },
  riskLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: colors.white,
    textTransform: "uppercase",
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 4
  },
  riskDesc: {
    fontSize: 10,
    fontWeight: 500,
    color: colors.secondary,
    flex: 1
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 25
  },
  gridItem: {
    width: "47%",
    padding: 12,
    backgroundColor: colors.bg,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border
  },
  gridLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 4
  },
  gridValue: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.primary
  },
  section: {
    marginBottom: 25
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.primary,
    borderLeft: 4,
    borderLeftColor: colors.accent,
    paddingLeft: 10,
    marginBottom: 12,
    textTransform: "uppercase"
  },
  diagnosisCard: {
    padding: 15,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    marginBottom: 10
  },
  diagnosisTitle: {
    fontSize: 9,
    fontWeight: 700,
    color: colors.accent,
    marginBottom: 6,
    textTransform: "uppercase"
  },
  diagnosisText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: colors.secondary
  },
  protocolCard: {
    padding: 20,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#bfdbfe",
    borderRadius: 10
  },
  protocolText: {
    fontSize: 11,
    lineHeight: 1.6,
    color: "#1e40af",
    fontWeight: 500
  },
  worryList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  worryPill: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 10,
    paddingRight: 10,
    backgroundColor: "#e2e8f0",
    borderRadius: 100,
    fontSize: 9,
    fontWeight: 600,
    color: colors.secondary
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    borderTop: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    textAlign: "center",
    fontSize: 7,
    color: colors.muted
  }
});
const Section = ({ title, children }) => /* @__PURE__ */ React.createElement(View, { style: styles.section }, /* @__PURE__ */ React.createElement(Text, { style: styles.sectionHeader }, title), children);
const DiagnosisBox = ({ title, text }) => /* @__PURE__ */ React.createElement(View, { style: styles.diagnosisCard }, /* @__PURE__ */ React.createElement(Text, { style: styles.diagnosisTitle }, title), /* @__PURE__ */ React.createElement(Text, { style: styles.diagnosisText }, text));
const ScoreLine = ({ label, value }) => /* @__PURE__ */ React.createElement(View, { style: { flexDirection: "row", justifyContent: "space-between", borderBottom: 1, borderBottomColor: "#e2e8f0", paddingBottom: 4, marginBottom: 4 } }, /* @__PURE__ */ React.createElement(Text, { style: { fontSize: 9, color: colors.muted } }, label), /* @__PURE__ */ React.createElement(Text, { style: { fontSize: 9, fontWeight: 700, color: colors.primary } }, value));
const ClinicalReportDocument = ({ report }) => {
  const generatedAt = new Date(report.meta?.generatedAt || report.createdAt || Date.now()).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
  const riskColor = colors.risk[report.riskLevel] || colors.risk.watch;
  const ai = report.aiBrief || {};
  return /* @__PURE__ */ React.createElement(Document, null, /* @__PURE__ */ React.createElement(Page, { size: "A4", style: styles.page }, /* @__PURE__ */ React.createElement(View, { style: styles.header }, /* @__PURE__ */ React.createElement(View, { style: styles.headerLeft }, /* @__PURE__ */ React.createElement(Text, { style: styles.brand }, "AuraOS"), /* @__PURE__ */ React.createElement(Text, { style: styles.reportType }, "Clinical Session Diagnosis")), /* @__PURE__ */ React.createElement(View, null, /* @__PURE__ */ React.createElement(Text, { style: styles.metaInfo }, "REPORT ID: ", String(report._id).slice(-8).toUpperCase()), /* @__PURE__ */ React.createElement(Text, { style: styles.metaInfo }, "DATE: ", generatedAt))), /* @__PURE__ */ React.createElement(View, { style: [styles.riskSection, { backgroundColor: riskColor + "15", borderLeft: 5, borderLeftColor: riskColor }] }, /* @__PURE__ */ React.createElement(Text, { style: [styles.riskLabel, { backgroundColor: riskColor }] }, (report.riskLevel || "WATCH").replace("-", " ")), /* @__PURE__ */ React.createElement(Text, { style: styles.riskDesc }, report.riskLevel === "acute-distress" ? "ALARM: Critical neurological load detected. Immediate somatic intervention required." : report.riskLevel === "pre-burnout" ? "WARNING: Sustained sympathetic activation. High risk of task paralysis." : "STABLE: Baseline stress detected. Normal coping mechanisms active.")), /* @__PURE__ */ React.createElement(View, { style: styles.grid }, /* @__PURE__ */ React.createElement(View, { style: styles.gridItem }, /* @__PURE__ */ React.createElement(Text, { style: styles.gridLabel }, "Vocal Arousal Index"), /* @__PURE__ */ React.createElement(Text, { style: styles.gridValue }, Number(report.vocalArousalScore || 0).toFixed(1), " / 10.0")), /* @__PURE__ */ React.createElement(View, { style: styles.gridItem }, /* @__PURE__ */ React.createElement(Text, { style: styles.gridLabel }, "Primary Blocker"), /* @__PURE__ */ React.createElement(Text, { style: styles.gridValue }, report.selectedBlocker || "Unspecified")), /* @__PURE__ */ React.createElement(View, { style: styles.gridItem }, /* @__PURE__ */ React.createElement(Text, { style: styles.gridLabel }, "Report Window"), /* @__PURE__ */ React.createElement(Text, { style: styles.gridValue }, report.dateRangeDays ? `${report.dateRangeDays} days` : "Session")), /* @__PURE__ */ React.createElement(View, { style: styles.gridItem }, /* @__PURE__ */ React.createElement(Text, { style: styles.gridLabel }, "Guardian"), /* @__PURE__ */ React.createElement(Text, { style: styles.gridValue }, report.guardian?.name || report.guardian?.email || "Not linked")), /* @__PURE__ */ React.createElement(View, { style: [styles.gridItem, { width: "100%" }] }, /* @__PURE__ */ React.createElement(Text, { style: styles.gridLabel }, "Active Engagement Task"), /* @__PURE__ */ React.createElement(Text, { style: styles.gridValue }, report.currentTask || "N/A"))), /* @__PURE__ */ React.createElement(Section, { title: "Executive Summary" }, /* @__PURE__ */ React.createElement(DiagnosisBox, { title: "Clinical Interpretation", text: report.aiBrief?.executive_summary || report.aiStressSummary || "No summary available." })), /* @__PURE__ */ React.createElement(Section, { title: "Patient Intake + Guardian Observations" }, /* @__PURE__ */ React.createElement(DiagnosisBox, { title: "Cross-Intake Correlation", text: report.aiBrief?.intake_correlations || "Intake correlation data was not available for this report." }), report.patientIntakeSnapshot?.derivedScores && /* @__PURE__ */ React.createElement(View, { style: styles.diagnosisCard }, /* @__PURE__ */ React.createElement(Text, { style: styles.diagnosisTitle }, "Patient Baseline Scores"), Object.entries(report.patientIntakeSnapshot.derivedScores).map(([key, value]) => /* @__PURE__ */ React.createElement(ScoreLine, { key, label: key, value: `${value}/10` }))), report.guardianIntakeSnapshot?.derivedScores && /* @__PURE__ */ React.createElement(View, { style: styles.diagnosisCard }, /* @__PURE__ */ React.createElement(Text, { style: styles.diagnosisTitle }, "Guardian Observation Scores"), Object.entries(report.guardianIntakeSnapshot.derivedScores).map(([key, value]) => /* @__PURE__ */ React.createElement(ScoreLine, { key, label: key, value: `${value}/10` })))), /* @__PURE__ */ React.createElement(Section, { title: "Telemetry Correlations" }, /* @__PURE__ */ React.createElement(DiagnosisBox, { title: "Dynamic Synthesis", text: report.aiBrief?.telemetry_correlations || "Telemetry correlation data was not available for this report." })), /* @__PURE__ */ React.createElement(Section, { title: "Neuro-Somatic Markers" }, /* @__PURE__ */ React.createElement(DiagnosisBox, { title: "Biological Stress Signal", text: report.aiBrief?.somatic_biological_markers || "Biological telemetry baseline within normal limits." })), /* @__PURE__ */ React.createElement(Section, { title: "Cognitive Rigidity & Focus" }, /* @__PURE__ */ React.createElement(DiagnosisBox, { title: "Performance Analysis", text: report.aiBrief?.cognitive_rigidity_focus || "Focus markers indicate stable executive switching." })), /* @__PURE__ */ React.createElement(Section, { title: "Clinical Protocol (Guardian Instructions)" }, /* @__PURE__ */ React.createElement(View, { style: styles.protocolCard }, /* @__PURE__ */ React.createElement(Text, { style: styles.protocolText }, report.aiBrief?.guardian_protocol || report.aiBrief?.actionable_protocol || "Monitor patient for signs of fatigue and provide hydration."))), /* @__PURE__ */ React.createElement(Section, { title: "Protective Factors" }, /* @__PURE__ */ React.createElement(DiagnosisBox, { title: "Patient Strengths", text: report.aiBrief?.patient_strengths || "Protective factors were not available in this report." })), report.shatteredWorryBlocks?.length > 0 && /* @__PURE__ */ React.createElement(Section, { title: "Extracted Cognitive Nodes (Worry Forge)" }, /* @__PURE__ */ React.createElement(View, { style: styles.worryList }, report.shatteredWorryBlocks.slice(0, 10).map((w, i) => /* @__PURE__ */ React.createElement(Text, { key: i, style: styles.worryPill }, w.text, " (", w.weight, "/10)")))), /* @__PURE__ */ React.createElement(Text, { style: styles.footer }, "CONFIDENTIAL CLINICAL REPORT. Generated by AuraOS Clinical Intelligence Layer. This document is intended for guardians and clinicians to support behavioral triage. AuraOS - Vihaan DTU 9.0 Digital Therapeutic.")));
};
const buildClinicalReportPdfBuffer = async (report) => {
  const mappedReport = {
    ...report,
    aiBrief: report.aiBrief || {
      executive_summary: report.aiStressSummary,
      intake_correlations: "Legacy report: intake correlations were not stored.",
      telemetry_correlations: "Legacy report: telemetry correlations were not stored.",
      somatic_biological_markers: "Vocal arousal detected at " + report.vocalArousalScore + "/10.",
      cognitive_rigidity_focus: "Performance data not fully analyzed in legacy report.",
      actionable_protocol: "Check in with the patient using warm, supportive language.",
      guardian_protocol: "Check in with the patient using warm, supportive language.",
      patient_strengths: "Legacy report: strengths were not stored."
    }
  };
  return await renderToBuffer(/* @__PURE__ */ React.createElement(ClinicalReportDocument, { report: mappedReport }));
};
export {
  buildClinicalReportPdfBuffer
};
