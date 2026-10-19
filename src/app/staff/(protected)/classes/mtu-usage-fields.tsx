"use client";

import type { ReactNode } from "react";

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
  transportMileage: Record<string, string>;
  mileage: string;
  equipmentUsed: string;
  usedSupplies: string;
}

export function emptyMtuUsageValue(): MtuUsageValue {
  return {
    equipmentIds: [],
    supplyQuantities: {},
    transportIds: [],
    transportMileage: {},
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
    else if (item.kind === "transport") {
      value.transportIds.push(item.itemId);
      value.transportMileage[item.itemId] =
        item.mileage === null ? "" : String(item.mileage);
    } else
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
 * A usage group. On the review screen the groups collapse (Equipment used,
 * Supplies used, Transport) so the confirmation step is scannable; the wizard
 * keeps always-open fieldsets.
 */
function UsageGroup({
  label,
  collapsible,
  children,
}: {
  label: string;
  collapsible: boolean;
  children: ReactNode;
}) {
  if (collapsible) {
    return (
      <details className="field field-wide">
        <summary>{label}</summary>
        {children}
      </details>
    );
  }
  return (
    <fieldset className="field field-wide">
      <legend>{label}</legend>
      {children}
    </fieldset>
  );
}

/**
 * Structured Mobile Training Unit selection shared by class setup and the
 * review/finalization usage forms. In `select` mode it renders equipment,
 * supplies, and transport checkboxes only; in `confirm` mode it also renders
 * editable supply quantities prefilled from the roster estimate. Every selected
 * transport has independently editable mileage, required only during creation.
 * With `collapsible`, each usage group collapses behind its summary.
 */
export function MtuUsageFields({
  catalog,
  mode,
  value,
  onChange,
  activeParticipants = 0,
  requireMileage = false,
  invalidMileageIds = [],
  collapsible = false,
}: {
  catalog: MtuCatalogOption[];
  mode: "select" | "confirm";
  value: MtuUsageValue;
  onChange: (next: MtuUsageValue) => void;
  activeParticipants?: number;
  requireMileage?: boolean;
  invalidMileageIds?: string[];
  collapsible?: boolean;
}) {
  const equipment = catalog.filter((option) => option.kind === "equipment");
  const supplies = catalog.filter((option) => option.kind === "supplies");
  const transport = catalog.filter((option) => option.kind === "transport");

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
        <UsageGroup label="Equipment used" collapsible={collapsible}>
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
        </UsageGroup>
      ) : null}

      {supplies.length > 0 ? (
        <UsageGroup label="Supplies used" collapsible={collapsible}>
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
        </UsageGroup>
      ) : null}

      {transport.length > 0 ? (
        <UsageGroup label="Transport" collapsible={collapsible}>
          <div className="checkbox-list">
            {transport.map((option) => (
              <div key={option.id}>
                <Label className="checkbox-field">
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
                {value.transportIds.includes(option.id) ? (
                  <div className="field">
                    <Label htmlFor={`mtuTransportMileage:${option.id}`}>
                      {option.name} mileage estimate{" "}
                      {requireMileage && option.requiresMileage
                        ? "(required)"
                        : "(optional)"}
                    </Label>
                    <input
                      id={`mtuTransportMileage:${option.id}`}
                      name={`mtuTransportMileage:${option.id}`}
                      type="number"
                      min="0"
                      step="any"
                      className="search-input"
                      value={value.transportMileage[option.id] ?? ""}
                      onChange={(event) =>
                        update({
                          transportMileage: {
                            ...value.transportMileage,
                            [option.id]: event.target.value,
                          },
                        })
                      }
                      aria-invalid={
                        invalidMileageIds.includes(option.id) || undefined
                      }
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </UsageGroup>
      ) : null}

      <details className="field field-wide">
        <summary>Additional details</summary>
        <div className="field">
          <Label htmlFor="mtuMileage">
            Other / legacy mileage (unattributed)
          </Label>
          <textarea
            id="mtuMileage"
            name="mtuMileage"
            className="search-input"
            rows={2}
            maxLength={200}
            value={value.mileage}
            onChange={(event) => update({ mileage: event.target.value })}
          />
        </div>
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
