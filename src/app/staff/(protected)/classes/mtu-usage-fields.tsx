"use client";

import { useState } from "react";

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
  requiresMileage?: boolean | null;
}

export interface MtuUsageValue {
  equipmentIds: string[];
  supplyQuantities: Record<string, string>;
  transportIds: string[];
  mileage: string;
  equipmentUsed: string;
  usedSupplies: string;
}

export function emptyMtuUsageValue(): MtuUsageValue {
  return {
    equipmentIds: [],
    supplyQuantities: {},
    transportIds: [],
    mileage: "",
    equipmentUsed: "",
    usedSupplies: "",
  };
}

export function mtuUsageValueFromDetail(
  usage:
    | {
        equipmentUsed: string | null;
        mileage: string | null;
        usedSupplies: string | null;
        items?: MtuUsageItem[];
      }
    | null
    | undefined,
): MtuUsageValue {
  if (!usage) return emptyMtuUsageValue();
  const value = emptyMtuUsageValue();
  value.mileage = usage.mileage ?? "";
  value.equipmentUsed = usage.equipmentUsed ?? "";
  value.usedSupplies = usage.usedSupplies ?? "";
  for (const item of usage.items ?? []) {
    if (item.kind === "equipment") value.equipmentIds.push(item.itemId);
    else if (item.kind === "transport") value.transportIds.push(item.itemId);
    else
      value.supplyQuantities[item.itemId] =
        item.quantity === null ? "" : String(item.quantity);
  }
  return value;
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

function toggle(list: string[], id: string, on: boolean): string[] {
  return on
    ? [...new Set([...list, id])]
    : list.filter((value) => value !== id);
}

/**
 * Structured Mobile Training Unit selection shared by class setup and the
 * review/finalization usage forms. In `select` mode it renders equipment,
 * supplies, and transport checkboxes only; in `confirm` mode it also renders
 * editable supply quantities prefilled from the roster estimate. Mileage sits
 * under a Transport subsection that opens when a driving vehicle is selected.
 */
export function MtuUsageFields({
  catalog,
  mode,
  value,
  onChange,
  activeParticipants = 0,
  requireMileage = false,
}: {
  catalog: MtuCatalogOption[];
  mode: "select" | "confirm";
  value: MtuUsageValue;
  onChange: (next: MtuUsageValue) => void;
  activeParticipants?: number;
  requireMileage?: boolean;
}) {
  const [mileageOpen, setMileageOpen] = useState(false);
  const equipment = catalog.filter((option) => option.kind === "equipment");
  const supplies = catalog.filter((option) => option.kind === "supplies");
  const transport = catalog.filter((option) => option.kind === "transport");

  const drivingSelected =
    requireMileage &&
    transport.some(
      (option) =>
        option.requiresMileage && value.transportIds.includes(option.id),
    );
  const mileageExpanded = drivingSelected || mileageOpen;

  if (
    equipment.length === 0 &&
    supplies.length === 0 &&
    transport.length === 0
  ) {
    return null;
  }

  const update = (patch: Partial<MtuUsageValue>) =>
    onChange({ ...value, ...patch });

  const renderSupplyRow = (option: MtuCatalogOption) => {
    const selected = option.id in value.supplyQuantities;
    const suggestion = estimateSupplyQuantity(
      ruleOf(option),
      activeParticipants,
    );
    return (
      <div key={option.id} className="mtu-supply-row">
        <Label className="checkbox-field">
          <input
            type="checkbox"
            name="mtuSupplyIds"
            value={option.id}
            checked={selected}
            onChange={(event) => {
              const next = { ...value.supplyQuantities };
              if (event.target.checked) next[option.id] = "";
              else delete next[option.id];
              update({ supplyQuantities: next });
            }}
          />
          <span>
            {option.name}
            {option.unitLabel ? (
              <span className="text-muted-foreground">
                {" "}
                ({option.unitLabel})
              </span>
            ) : null}
          </span>
        </Label>
        {mode === "confirm" ? (
          <input
            type="number"
            min="0"
            step="0.01"
            className="search-input mtu-supply-qty"
            name={`mtuSupplyQty:${option.id}`}
            value={value.supplyQuantities[option.id] ?? ""}
            placeholder={String(suggestion)}
            onChange={(event) =>
              update({
                supplyQuantities: {
                  ...value.supplyQuantities,
                  [option.id]: event.target.value,
                },
              })
            }
            aria-label={`${option.name} quantity`}
          />
        ) : null}
      </div>
    );
  };

  return (
    <>
      {equipment.length > 0 ? (
        <fieldset className="field field-wide">
          <legend>Equipment used</legend>
          <div className="checkbox-list">
            {equipment.map((option) => (
              <Label key={option.id} className="checkbox-field">
                <input
                  type="checkbox"
                  name="mtuEquipmentIds"
                  value={option.id}
                  checked={value.equipmentIds.includes(option.id)}
                  onChange={(event) =>
                    update({
                      equipmentIds: toggle(
                        value.equipmentIds,
                        option.id,
                        event.target.checked,
                      ),
                    })
                  }
                />
                {option.name}
              </Label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {supplies.length > 0 ? (
        <fieldset className="field field-wide">
          <legend>Supplies used</legend>
          {mode === "confirm" ? (
            (() => {
              const rows = supplies.map((option) => ({
                option,
                selected: option.id in value.supplyQuantities,
                expected: estimateSupplyQuantity(
                  ruleOf(option),
                  activeParticipants,
                ),
              }));
              const primary = rows.filter(
                (row) => row.selected || row.expected > 0,
              );
              const rest = rows.filter(
                (row) => !row.selected && row.expected <= 0,
              );
              return (
                <>
                  <div className="mtu-supply-list">
                    {primary.map((row) => renderSupplyRow(row.option))}
                  </div>
                  {rest.length > 0 ? (
                    <details>
                      <summary>Add another supply</summary>
                      <div className="mtu-supply-list">
                        {rest.map((row) => renderSupplyRow(row.option))}
                      </div>
                    </details>
                  ) : null}
                </>
              );
            })()
          ) : (
            <div className="mtu-supply-list">
              {supplies.map((option) => renderSupplyRow(option))}
            </div>
          )}
        </fieldset>
      ) : null}

      {transport.length > 0 ? (
        <fieldset className="field field-wide">
          <legend>Transport</legend>
          <div className="checkbox-list">
            {transport.map((option) => (
              <Label key={option.id} className="checkbox-field">
                <input
                  type="checkbox"
                  name="mtuTransportIds"
                  value={option.id}
                  checked={value.transportIds.includes(option.id)}
                  onChange={(event) =>
                    update({
                      transportIds: toggle(
                        value.transportIds,
                        option.id,
                        event.target.checked,
                      ),
                    })
                  }
                />
                {option.name}
              </Label>
            ))}
          </div>
          <details
            open={mileageExpanded}
            onToggle={(event) => setMileageOpen(event.currentTarget.open)}
          >
            <summary>
              Mileage estimate {drivingSelected ? "(required)" : "(optional)"}
            </summary>
            <input
              type="number"
              min="0"
              step="1"
              className="search-input"
              name="mtuMileage"
              value={value.mileage}
              onChange={(event) => update({ mileage: event.target.value })}
              required={drivingSelected}
              aria-label="Mileage estimate"
            />
          </details>
        </fieldset>
      ) : null}

      <details className="field field-wide">
        <summary>Additional details</summary>
        <div className="field">
          <Label htmlFor="mtuEquipmentUsed">Other equipment (not listed)</Label>
          <textarea
            id="mtuEquipmentUsed"
            className="search-input"
            name="mtuEquipmentUsed"
            rows={2}
            value={value.equipmentUsed}
            onChange={(event) => update({ equipmentUsed: event.target.value })}
          />
        </div>
        <div className="field">
          <Label htmlFor="mtuUsedSupplies">Other supplies (not listed)</Label>
          <textarea
            id="mtuUsedSupplies"
            className="search-input"
            name="mtuUsedSupplies"
            rows={2}
            value={value.usedSupplies}
            onChange={(event) => update({ usedSupplies: event.target.value })}
          />
        </div>
      </details>
    </>
  );
}
