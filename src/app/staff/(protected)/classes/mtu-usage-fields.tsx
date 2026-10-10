"use client";

import { Label } from "@/components/ui/label";
import {
  estimateSupplyQuantity,
  type MtuConsumptionRule,
  type MtuUsageItem,
} from "@/modules/classes/mtu";

export interface MtuCatalogOption {
  id: string;
  kind: string;
  name: string;
  unitLabel: string | null;
  perClassQty: string | null;
  perStudentQty: string | null;
  rounding: string | null;
}

function ruleOf(option: MtuCatalogOption): MtuConsumptionRule {
  return {
    perClassQty:
      option.perClassQty === null ? null : Number(option.perClassQty),
    perStudentQty:
      option.perStudentQty === null ? null : Number(option.perStudentQty),
    rounding:
      option.rounding === "ceil" || option.rounding === "exact"
        ? option.rounding
        : null,
  };
}

function ruleSummary(option: MtuCatalogOption): string {
  const base = option.perClassQty ? Number(option.perClassQty) : 0;
  const rate = option.perStudentQty ? Number(option.perStudentQty) : 0;
  const parts: string[] = [];
  if (base > 0) parts.push(`${base} / class`);
  if (rate > 0) parts.push(`${rate} / student`);
  return parts.join(" + ");
}

/**
 * Structured Mobile Training Unit selection fields shared by class setup and
 * the review usage form: equipment on/off and supplies with an editable
 * quantity prefilled from the roster suggestion.
 */
export function MtuUsageFields({
  catalog,
  items = [],
  activeParticipants = 0,
}: {
  catalog: MtuCatalogOption[];
  items?: MtuUsageItem[];
  activeParticipants?: number;
}) {
  const equipment = catalog.filter((option) => option.kind === "equipment");
  const supplies = catalog.filter((option) => option.kind === "supplies");
  const selectedEquipment = new Set(
    items
      .filter((item) => item.kind === "equipment")
      .map((item) => item.itemId),
  );
  const selectedSupplies = new Map(
    items
      .filter((item) => item.kind === "supplies")
      .map((item) => [item.itemId, item]),
  );

  if (equipment.length === 0 && supplies.length === 0) return null;

  return (
    <>
      {equipment.length > 0 ? (
        <fieldset className="field field-wide">
          <legend>MTU equipment used</legend>
          <div className="checkbox-list">
            {equipment.map((option) => (
              <Label key={option.id} className="checkbox-field">
                <input
                  type="checkbox"
                  name="mtuEquipmentIds"
                  value={option.id}
                  defaultChecked={selectedEquipment.has(option.id)}
                />
                {option.name}
              </Label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {supplies.length > 0 ? (
        <fieldset className="field field-wide">
          <legend>MTU supplies used</legend>
          <p className="text-muted-foreground">
            Quantities start from the expected usage for {activeParticipants}{" "}
            participant{activeParticipants === 1 ? "" : "s"} and can be
            adjusted.
          </p>
          <div className="mtu-supply-list">
            {supplies.map((option) => {
              const current = selectedSupplies.get(option.id);
              const suggestion = estimateSupplyQuantity(
                ruleOf(option),
                activeParticipants,
              );
              const defaultQty = current?.quantity ?? suggestion;
              const summary = ruleSummary(option);
              return (
                <div key={option.id} className="mtu-supply-row">
                  <Label className="checkbox-field">
                    <input
                      type="checkbox"
                      name="mtuSupplyIds"
                      value={option.id}
                      defaultChecked={current != null}
                    />
                    <span>
                      {option.name}
                      {summary ? (
                        <span className="text-muted-foreground">
                          {" "}
                          ({summary})
                        </span>
                      ) : null}
                    </span>
                  </Label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="search-input mtu-supply-qty"
                    name={`mtuSupplyQty:${option.id}`}
                    defaultValue={String(defaultQty)}
                    aria-label={`${option.name} quantity${
                      option.unitLabel ? ` (${option.unitLabel})` : ""
                    }`}
                  />
                  <span className="text-muted-foreground">
                    {option.unitLabel ?? ""}
                  </span>
                </div>
              );
            })}
          </div>
        </fieldset>
      ) : null}
    </>
  );
}
