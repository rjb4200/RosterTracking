"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ReportsForm({
  reports,
}: {
  reports: { id: string; label: string; description: string }[];
}) {
  const [timeFrame, setTimeFrame] = useState("");
  const [reportId, setReportId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function selectTimeFrame(value: string) {
    setTimeFrame(value);
    setError("");
    if (!value || value === "custom") {
      setFrom("");
      setTo("");
      return;
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start =
      value === "this-month"
        ? new Date(year, month, 1)
        : value === "last-month"
          ? new Date(year, month - 1, 1)
          : value === "this-year"
            ? new Date(year, 0, 1)
            : new Date(year - 1, 0, 1);
    const end =
      value === "this-month"
        ? new Date(year, month + 1, 0)
        : value === "last-month"
          ? new Date(year, month, 0)
          : value === "this-year"
            ? new Date(year, 11, 31)
            : new Date(year - 1, 11, 31);
    const date = (value: Date) =>
      `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    setFrom(date(start));
    setTo(date(end));
  }

  return (
    <form
      className="mt-6 grid max-w-xl gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!timeFrame || !reportId || !from || !to) {
          setError(
            "Select a time frame and report, including both custom dates.",
          );
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
      <label htmlFor="report-time-frame">Time frame</label>
      <select
        id="report-time-frame"
        className="select-input"
        value={timeFrame}
        onChange={(event) => selectTimeFrame(event.target.value)}
        required
      >
        <option value="">Select a time frame</option>
        <option value="this-month">This month</option>
        <option value="last-month">Last month</option>
        <option value="this-year">This year</option>
        <option value="last-year">Last year</option>
        <option value="custom">Custom dates</option>
      </select>
      {timeFrame === "custom" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            From
            <input
              className="search-input block w-full"
              type="date"
              required
              value={from}
              max={to || "9999-12-31"}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label>
            To
            <input
              className="search-input block w-full"
              type="date"
              required
              value={to}
              min={from}
              max="9999-12-31"
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
        </div>
      ) : from && to ? (
        <p className="text-muted-foreground">
          {from} through {to} (inclusive)
        </p>
      ) : null}
      <label htmlFor="report-picker">Report</label>
      <select
        id="report-picker"
        className="select-input"
        value={reportId}
        onChange={(event) => setReportId(event.target.value)}
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
      {error ? <p role="alert">{error}</p> : null}
      <Button
        type="submit"
        disabled={busy || !timeFrame || !reportId || !from || !to}
      >
        {busy ? "Generating report..." : "Download report PDF"}
      </Button>
    </form>
  );
}
