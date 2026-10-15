"use client";

import { usePathname } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ISSUE_CATEGORIES,
  isIssueReportingOffered,
} from "@/modules/issue-reporting/constants";

import type { ReportIssueState } from "./report-issue-action";

export function ReportIssue({
  action,
  triggerLabel = "Report an issue",
  triggerClassName = "text-button",
  correlationId,
  defaultSubject = "",
}: {
  action: (
    previous: ReportIssueState | undefined,
    formData: FormData,
  ) => Promise<ReportIssueState>;
  triggerLabel?: string;
  triggerClassName?: string;
  correlationId?: string;
  defaultSubject?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, undefined);
  const pathname = usePathname();
  const [userAgent, setUserAgent] = useState("");

  useEffect(() => {
    setUserAgent(window.navigator.userAgent);
  }, []);

  if (!isIssueReportingOffered()) return null;

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an issue</DialogTitle>
            <DialogDescription>
              This files an issue on the project's GitHub repository.
            </DialogDescription>
          </DialogHeader>
          {state?.url ? (
            <div className="stack-form">
              <p>
                Filed as{" "}
                <a href={state.url} target="_blank" rel="noreferrer">
                  issue #{state.number}
                </a>
                .
              </p>
              <div className="admin-actions">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <form action={formAction} className="stack-form">
              <input type="hidden" name="route" value={pathname} />
              <input type="hidden" name="userAgent" value={userAgent} />
              {correlationId ? (
                <input
                  type="hidden"
                  name="correlationId"
                  value={correlationId}
                />
              ) : null}
              <div className="field">
                <Label htmlFor="issueCategory">Category</Label>
                <select
                  id="issueCategory"
                  name="category"
                  className="select-input"
                  defaultValue="bug"
                >
                  {Object.entries(ISSUE_CATEGORIES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <Label htmlFor="issueSubject">Subject</Label>
                <Input
                  id="issueSubject"
                  name="subject"
                  defaultValue={defaultSubject}
                  maxLength={200}
                  required
                />
              </div>
              <div className="field">
                <Label htmlFor="issueDescription">What happened?</Label>
                <textarea
                  id="issueDescription"
                  name="description"
                  className="search-input"
                  rows={5}
                  maxLength={4000}
                  required
                />
              </div>
              <p className="text-muted-foreground">
                Do not include student names, phone numbers, or credentials.
              </p>
              {state?.error ? (
                <p className="form-error" role="alert">
                  {state.error}
                </p>
              ) : null}
              <div className="admin-actions">
                <Button type="submit" disabled={pending}>
                  {pending ? "Filing..." : "Submit report"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
