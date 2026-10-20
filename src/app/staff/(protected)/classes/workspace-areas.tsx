"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

/**
 * The post-class workspace keeps one correction area open at a time. The page
 * renders summary areas and their editors; this provider holds which area is
 * open so readiness issues and edit affordances can both drive it.
 */
const WorkspaceContext = createContext<{
  openId: string | null;
  open: (id: string) => void;
}>({ openId: null, open: () => {} });

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <WorkspaceContext.Provider value={{ openId, open: setOpenId }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/** A summary area with one editor, shown only while this area is open. */
export function WorkspaceArea({
  id,
  label,
  summary,
  review,
  children,
}: {
  id: string;
  label: string;
  summary?: ReactNode;
  review?: ReactNode;
  children: ReactNode;
}) {
  const { openId, open } = useContext(WorkspaceContext);
  const isOpen = openId === id;
  return (
    <section className="workspace-area" id={`area-${id}`}>
      <header className="workspace-area-head">
        <div>
          <h3>{label}</h3>
          {summary ? <p className="workspace-area-summary">{summary}</p> : null}
        </div>
        <button
          type="button"
          className="workspace-area-toggle"
          aria-expanded={isOpen}
          aria-controls={`area-body-${id}`}
          onClick={() => open(isOpen ? "" : id)}
        >
          {isOpen ? "Close" : "Edit"}
        </button>
      </header>
      {review ? <div className="workspace-area-review">{review}</div> : null}
      {isOpen ? (
        <div className="workspace-area-body" id={`area-body-${id}`}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** A readiness-issue control that opens the area that resolves it. */
export function AreaOpener({
  area,
  children,
}: {
  area: string;
  children: ReactNode;
}) {
  const { open } = useContext(WorkspaceContext);
  return (
    <button
      type="button"
      className="workspace-area-opener"
      onClick={() => open(area)}
    >
      {children}
    </button>
  );
}
