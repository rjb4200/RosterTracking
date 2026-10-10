"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MTU_CATALOG_KINDS,
  MTU_ROUNDING_MODES,
} from "@/modules/reference/constants";

import type { MtuCatalogActionState } from "./actions";

export function MtuItemForm({
  action,
  submitLabel = "Create item",
  values,
}: {
  action: (
    prev: MtuCatalogActionState | undefined,
    formData: FormData,
  ) => Promise<MtuCatalogActionState>;
  submitLabel?: string;
  values?: {
    id: string;
    kind: string;
    name: string;
    unitLabel: string | null;
    perClassQty: string | null;
    perStudentQty: string | null;
    rounding: string | null;
    sortOrder: number;
  };
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [kind, setKind] = useState(values?.kind ?? MTU_CATALOG_KINDS.EQUIPMENT);

  return (
    <form action={formAction} className="stack-form">
      {values ? <input type="hidden" name="id" value={values.id} /> : null}
      <div className="form-grid">
        <div className="field">
          <Label htmlFor="kind">Kind</Label>
          <select
            id="kind"
            name="kind"
            className="select-input"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value={MTU_CATALOG_KINDS.EQUIPMENT}>Equipment</option>
            <option value={MTU_CATALOG_KINDS.SUPPLIES}>Supplies</option>
          </select>
        </div>
        <div className="field">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={values?.name} required />
        </div>
        {kind === MTU_CATALOG_KINDS.SUPPLIES ? (
          <>
            <div className="field">
              <Label htmlFor="unitLabel">Unit label</Label>
              <Input
                id="unitLabel"
                name="unitLabel"
                placeholder="each, gallon, ..."
                defaultValue={values?.unitLabel ?? ""}
                required
              />
            </div>
            <div className="field">
              <Label htmlFor="perClassQty">Per-class quantity</Label>
              <Input
                id="perClassQty"
                name="perClassQty"
                type="number"
                min="0"
                step="0.01"
                defaultValue={values?.perClassQty ?? "0"}
              />
            </div>
            <div className="field">
              <Label htmlFor="perStudentQty">Per-student quantity</Label>
              <Input
                id="perStudentQty"
                name="perStudentQty"
                type="number"
                min="0"
                step="0.01"
                defaultValue={values?.perStudentQty ?? "0"}
              />
            </div>
            <div className="field">
              <Label htmlFor="rounding">Rounding</Label>
              <select
                id="rounding"
                name="rounding"
                className="select-input"
                defaultValue={values?.rounding ?? MTU_ROUNDING_MODES.CEIL}
              >
                <option value={MTU_ROUNDING_MODES.CEIL}>Round up</option>
                <option value={MTU_ROUNDING_MODES.EXACT}>Exact</option>
              </select>
            </div>
          </>
        ) : null}
        <div className="field">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min="0"
            step="1"
            defaultValue={String(values?.sortOrder ?? 0)}
          />
        </div>
      </div>
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
