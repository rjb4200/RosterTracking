"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ReportsForm({
  reports,
}: {
  reports: { id: string; label: string; description: string }[];
}) {
  const [reportId, setReportId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ready = Boolean(from && to && reportId) && from <= to;

  return (
    <form
      className="mt-6 grid max-w-xl gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!from || !to || !reportId) {
          setError("Select a date range and a report.");
          return;
        }
        if (from > to) {
          setError("The start date must be on or before the end date.");
          return;
        }
        setBusy(true);
        setError("");
        try {
          const query = new URLSearchParams({ report: reportId, from, to });
          const response = await fetch(`/api/staff/reports?${query}`, {
            cache: "no-store",
          });
          if (!response.ok) {
            setError(
              response.status === 401 || response.status === 403
                ? "You do not have access to generate reports. Sign in with an authorized account."
                : "The report could not be generated. Check your dates and try again.",
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
      <label htmlFor="report-from">From</label>
      <input
        id="report-from"
        name="from"
        type="date"
        className="search-input"
        value={from}
        max={to || "9999-12-31"}
        onChange={(event) => setFrom(event.target.value)}
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
        onChange={(event) => setTo(event.target.value)}
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
      {reportId ? (
        <p className="text-muted-foreground">
          {reports.find((report) => report.id === reportId)?.description}
        </p>
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
