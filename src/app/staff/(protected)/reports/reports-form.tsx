"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ReportInputKind } from "@/modules/reports/catalog";

interface Option {
  value: string;
  label: string;
}

export function ReportsForm({
  reports,
  presets,
  students,
  agencies,
  sites,
  initial,
}: {
  reports: {
    id: string;
    label: string;
    description: string;
    input: ReportInputKind | null;
  }[];
  presets: { id: string; label: string; from: string; to: string }[];
  students: Option[];
  agencies: Option[];
  sites: Option[];
  initial: {
    report: string;
    from: string;
    to: string;
    student: string;
    agency: string;
    site: string;
  };
}) {
  const [reportId, setReportId] = useState(initial.report);
  const [presetId, setPresetId] = useState("");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [studentId, setStudentId] = useState(initial.student);
  const [agencyId, setAgencyId] = useState(initial.agency);
  const [siteId, setSiteId] = useState(initial.site);
  const [withCertificates, setWithCertificates] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = reports.find((report) => report.id === reportId);
  const input = selected?.input ?? null;
  const inputValue =
    input === "student" ? studentId : input === "agency" ? agencyId : siteId;
  const inputReady = !input || Boolean(inputValue);
  const ready = Boolean(from && to && reportId) && from <= to && inputReady;

  return (
    <form
      className="mt-6 grid max-w-xl gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!from || !to || !reportId) {
          setError("Select a period and a report.");
          return;
        }
        if (from > to) {
          setError("The start date must be on or before the end date.");
          return;
        }
        if (!inputReady) {
          setError(`Select a ${input} for this report.`);
          return;
        }
        setBusy(true);
        setError("");
        try {
          const query = new URLSearchParams({ report: reportId, from, to });
          if (input === "student") query.set("student", studentId);
          if (input === "agency") query.set("agency", agencyId);
          if (input === "site") query.set("site", siteId);
          if (input === "student" && withCertificates)
            query.set("certificates", "1");
          const response = await fetch(`/api/staff/reports?${query}`, {
            cache: "no-store",
          });
          if (!response.ok) {
            setError(
              response.status === 401 || response.status === 403
                ? "You do not have access to generate reports. Sign in with an authorized account."
                : "The report could not be generated. Check your inputs and try again.",
            );
            return;
          }
          const url = URL.createObjectURL(await response.blob());
          const link = document.createElement("a");
          link.href = url;
          link.download =
            response.headers
              .get("Content-Disposition")
              ?.match(/filename="([^"]+)"/)?.[1] ?? "report.pdf";
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch {
          setError("The report could not be downloaded. Please try again.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="report-preset">Renewal period</label>
      <select
        id="report-preset"
        className="select-input"
        value={presetId}
        onChange={(event) => {
          const next = event.target.value;
          setPresetId(next);
          const preset = presets.find((entry) => entry.id === next);
          if (preset) {
            setFrom(preset.from);
            setTo(preset.to);
            setError("");
          }
        }}
      >
        <option value="">Custom dates</option>
        {presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.label}
          </option>
        ))}
      </select>
      <label htmlFor="report-from">From</label>
      <input
        id="report-from"
        name="from"
        type="date"
        className="search-input"
        value={from}
        max={to || "9999-12-31"}
        onChange={(event) => {
          setFrom(event.target.value);
          setPresetId("");
        }}
        required
      />
      <label htmlFor="report-to">To</label>
      <input
        id="report-to"
        name="to"
        type="date"
        className="search-input"
        value={to}
        min={from}
        max="9999-12-31"
        onChange={(event) => {
          setTo(event.target.value);
          setPresetId("");
        }}
        required
      />
      <label htmlFor="report-picker">Report</label>
      <select
        id="report-picker"
        className="select-input"
        value={reportId}
        onChange={(event) => {
          setReportId(event.target.value);
          setError("");
        }}
        required
      >
        <option value="">Select a report</option>
        {reports.map((report) => (
          <option key={report.id} value={report.id}>
            {report.label}
          </option>
        ))}
      </select>
      {selected ? (
        <p className="text-muted-foreground">{selected.description}</p>
      ) : null}
      {input === "student" ? (
        <>
          <label htmlFor="report-student">Student</label>
          <select
            id="report-student"
            className="select-input"
            value={studentId}
            onChange={(event) => {
              setStudentId(event.target.value);
              setError("");
            }}
            required
          >
            <option value="">Select a student</option>
            {students.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <label className="inline-form">
            <input
              type="checkbox"
              checked={withCertificates}
              onChange={(event) => setWithCertificates(event.target.checked)}
            />
            Append each class&apos;s completion certificate
          </label>
        </>
      ) : null}
      {input === "agency" ? (
        <>
          <label htmlFor="report-agency">Agency</label>
          <select
            id="report-agency"
            className="select-input"
            value={agencyId}
            onChange={(event) => {
              setAgencyId(event.target.value);
              setError("");
            }}
            required
          >
            <option value="">Select an agency</option>
            {agencies.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      ) : null}
      {input === "site" ? (
        <>
          <label htmlFor="report-site">Training site</label>
          <select
            id="report-site"
            className="select-input"
            value={siteId}
            onChange={(event) => {
              setSiteId(event.target.value);
              setError("");
            }}
            required
          >
            <option value="">Select a training site</option>
            {sites.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      ) : null}
      {from && to ? (
        <p className="text-muted-foreground">
          {from} through {to} (inclusive)
        </p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
      <Button type="submit" disabled={busy || !ready}>
        {busy ? "Generating report..." : "Download report PDF"}
      </Button>
    </form>
  );
}
