"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * The post-class workspace keeps one correction area open at a time. The page
 * renders summary areas and their editors; this provider holds which area is
 * open, which form its header saves, and whether that form has unsaved edits.
 */
type WorkspaceContextValue = {
  openId: string | null;
  requestOpen: (id: string) => void;
  requestClose: () => void;
  closeArea: () => void;
  confirmDiscard: (run: () => void) => void;
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
  formIdFor: (areaId: string) => string | null;
  registerForm: (areaId: string, formId: string) => void;
  unregisterForm: (areaId: string, formId: string) => void;
};

const noop = () => {};

const WorkspaceContext = createContext<WorkspaceContextValue>({
  openId: null,
  requestOpen: noop,
  requestClose: noop,
  closeArea: noop,
  confirmDiscard: (run) => run(),
  dirty: false,
  setDirty: noop,
  formIdFor: () => null,
  registerForm: noop,
  unregisterForm: noop,
});

const AreaContext = createContext<string | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [dirty, setDirtyState] = useState(false);
  const [pending, setPending] = useState<{ run: () => void } | null>(null);
  const [forms, setForms] = useState<Record<string, string>>({});

  const closeArea = useCallback(() => {
    setDirtyState(false);
    setOpenId(null);
  }, []);

  const guard = useCallback(
    (run: () => void) => {
      if (dirty) {
        setPending({ run });
      } else {
        run();
      }
    },
    [dirty],
  );

  const requestOpen = useCallback(
    (id: string) => {
      guard(() => {
        setDirtyState(false);
        setOpenId(id);
      });
    },
    [guard],
  );

  const requestClose = useCallback(() => guard(closeArea), [guard, closeArea]);

  const confirmDiscard = useCallback((run: () => void) => guard(run), [guard]);

  const discard = useCallback(() => {
    const target = pending;
    setPending(null);
    setDirtyState(false);
    target?.run();
  }, [pending]);

  const registerForm = useCallback((areaId: string, formId: string) => {
    setForms((current) =>
      current[areaId] === formId ? current : { ...current, [areaId]: formId },
    );
  }, []);

  const unregisterForm = useCallback((areaId: string, formId: string) => {
    setForms((current) => {
      if (current[areaId] !== formId) return current;
      const next = { ...current };
      delete next[areaId];
      return next;
    });
  }, []);

  const setDirty = useCallback((next: boolean) => setDirtyState(next), []);
  const formIdFor = useCallback(
    (areaId: string) => forms[areaId] ?? null,
    [forms],
  );

  const value = useMemo(
    () => ({
      openId,
      requestOpen,
      requestClose,
      closeArea,
      confirmDiscard,
      dirty,
      setDirty,
      formIdFor,
      registerForm,
      unregisterForm,
    }),
    [
      openId,
      requestOpen,
      requestClose,
      closeArea,
      confirmDiscard,
      dirty,
      setDirty,
      formIdFor,
      registerForm,
      unregisterForm,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
      <Dialog
        open={pending !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPending(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Discard unsaved changes?</DialogTitle>
            <DialogDescription>
              The changes in this area will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={discard}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceContext.Provider>
  );
}

/** The workspace state, or no-op defaults outside a workspace. */
export function useWorkspace() {
  return useContext(WorkspaceContext);
}

/**
 * Register an editor form with its area so the header can save it. Outside an
 * area (the class edit screen) this is a no-op.
 */
export function useAreaForm(formId?: string) {
  const areaId = useContext(AreaContext);
  const { registerForm, unregisterForm } = useWorkspace();
  useEffect(() => {
    if (!areaId || !formId) return;
    registerForm(areaId, formId);
    return () => unregisterForm(areaId, formId);
  }, [areaId, formId, registerForm, unregisterForm]);
}

/** Close the open area once its action reports success. */
export function useCloseOnSaved(success: string | undefined) {
  const { closeArea } = useWorkspace();
  useEffect(() => {
    if (success) closeArea();
  }, [success, closeArea]);
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
  const { openId, requestOpen, requestClose, formIdFor } = useWorkspace();
  const isOpen = openId === id;
  const formId = formIdFor(id);
  return (
    <section className="workspace-area" id={`area-${id}`}>
      <header className="workspace-area-head">
        <div>
          <h3>{label}</h3>
          {summary ? <p className="workspace-area-summary">{summary}</p> : null}
        </div>
        <div className="workspace-area-actions">
          {isOpen ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={requestClose}
              >
                Close
              </Button>
              {formId ? (
                <Button type="submit" form={formId} size="sm">
                  Save and close
                </Button>
              ) : null}
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={false}
              aria-controls={`area-body-${id}`}
              onClick={() => requestOpen(id)}
            >
              Edit
            </Button>
          )}
        </div>
      </header>
      {review ? <div className="workspace-area-review">{review}</div> : null}
      {isOpen ? (
        <AreaContext.Provider value={id}>
          <div className="workspace-area-body" id={`area-body-${id}`}>
            {children}
          </div>
        </AreaContext.Provider>
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
  const { requestOpen } = useWorkspace();
  return (
    <button
      type="button"
      className="workspace-area-opener"
      onClick={() => requestOpen(area)}
    >
      {children}
    </button>
  );
}
