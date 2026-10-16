import { estimateSupplyQuantity } from "@/modules/classes/mtu";
import { MTU_CATALOG_SEED } from "@/modules/reference/constants";
import { type ReportPeriod, validateReportPeriod } from "./period";

export interface ReportClass {
  id: string;
  name: string | null;
  status: string;
  mtuSelected: boolean;
  siteId: string | null;
  siteName: string | null;
  siteAddress: string | null;
  hostAgency: string;
  courseNumber: string | null;
  instructorCount: number;
  components: {
    startsAt: string;
    creditedHours: number;
    title: string | null;
    trainingCode: string | null;
  }[];
  students: {
    attendanceId: string;
    name: string;
    studentNumber: string | null;
    agency: string;
    guest: boolean;
    removedAt: string | null;
  }[];
  items: {
    itemId: string;
    name: string;
    kind: string;
    unitLabel: string | null;
    quantity: number | null;
    mileage: number | null;
    source: string;
    perClassQty: number | null;
    perStudentQty: number | null;
    rounding: "ceil" | "exact" | null;
  }[];
  equipmentUsed: string | null;
  mileage: string | null;
  usedSupplies: string | null;
}

export function isReportClassInPeriod(row: ReportClass, period: ReportPeriod) {
  const startsAt = Math.min(
    ...row.components.map((component) =>
      new Date(component.startsAt).getTime(),
    ),
  );
  return (
    row.mtuSelected &&
    row.status !== "cancelled" &&
    row.students.some((student) => student.removedAt === null) &&
    startsAt >= period.from.getTime() &&
    startsAt < period.to.getTime()
  );
}

export function aggregateMtuSummary(
  input: readonly ReportClass[],
  period: ReportPeriod,
) {
  validateReportPeriod(period);
  const classes = input
    .filter((row) => isReportClassInPeriod(row, period))
    .map((row) => ({
      ...row,
      students: row.students
        .filter((student) => student.removedAt === null)
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name) ||
            a.attendanceId.localeCompare(b.attendanceId),
        ),
      classDate: new Date(
        Math.min(
          ...row.components.map((component) =>
            new Date(component.startsAt).getTime(),
          ),
        ),
      ),
      hours: row.components.reduce(
        (sum, component) => sum + component.creditedHours,
        0,
      ),
    }))
    .sort(
      (a, b) =>
        a.classDate.getTime() - b.classDate.getTime() ||
        a.id.localeCompare(b.id),
    );
  const round = (n: number) => Math.round(n * 100) / 100;
  const transportation = new Map<
    string,
    {
      itemId: string;
      name: string;
      miles: number;
      uses: number;
      missingMileage: number;
    }
  >();
  const supplies = new Map<
    string,
    {
      itemId: string;
      name: string;
      unitLabel: string | null;
      quantity: number;
      estimatedClasses: number;
      missingQuantity: number;
    }
  >();
  const equipment = new Map<
    string,
    { itemId: string; name: string; uses: number }
  >();
  for (const row of classes) {
    for (const item of row.items) {
      if (item.kind === "transport") {
        const total = transportation.get(item.itemId) ?? {
          itemId: item.itemId,
          name: item.name,
          miles: 0,
          uses: 0,
          missingMileage: 0,
        };
        total.uses += 1;
        if (item.mileage === null) total.missingMileage += 1;
        else total.miles = round(total.miles + item.mileage);
        transportation.set(item.itemId, total);
      } else if (item.kind === "supplies") {
        const total = supplies.get(item.itemId) ?? {
          itemId: item.itemId,
          name: item.name,
          unitLabel: item.unitLabel,
          quantity: 0,
          estimatedClasses: 0,
          missingQuantity: 0,
        };
        const estimated =
          item.source === "suggested" && row.status !== "finalized";
        const quantity = estimated
          ? estimateSupplyQuantity(item, row.students.length)
          : item.quantity;
        if (estimated) total.estimatedClasses += 1;
        if (quantity === null) total.missingQuantity += 1;
        else total.quantity = round(total.quantity + quantity);
        supplies.set(item.itemId, total);
      } else if (item.kind === "equipment") {
        const total = equipment.get(item.itemId) ?? {
          itemId: item.itemId,
          name: item.name,
          uses: 0,
        };
        total.uses += 1;
        equipment.set(item.itemId, total);
      }
    }
  }
  // Seeds have generated UUIDs, so exact seed names are only zero-line placeholders.
  // Actual usage always remains keyed by catalog ID, including renamed vehicles.
  const transportLines = [...transportation.values()];
  for (const seed of MTU_CATALOG_SEED.filter(
    (item) => item.kind === "transport",
  )) {
    if (!transportLines.some((item) => item.name === seed.name)) {
      transportLines.push({
        itemId: `seed:${seed.name}`,
        name: seed.name,
        miles: 0,
        uses: 0,
        missingMileage: 0,
      });
    }
  }
  const byName = (a: { name: string }, b: { name: string }) =>
    a.name.localeCompare(b.name);
  const locations = new Map<
    string,
    { name: string; address: string | null; classes: typeof classes }
  >();
  for (const row of classes) {
    const key = row.siteId ?? "no-site";
    const location = locations.get(key) ?? {
      name: row.siteName ?? "Online / no training site",
      address: row.siteAddress,
      classes: [],
    };
    location.classes.push(row);
    locations.set(key, location);
  }
  return {
    period,
    classes,
    totals: {
      classes: classes.length,
      instructorHours: round(
        classes.reduce((sum, row) => sum + row.hours * row.instructorCount, 0),
      ),
      studentHours: round(
        classes.reduce((sum, row) => sum + row.hours * row.students.length, 0),
      ),
      students: classes.reduce((sum, row) => sum + row.students.length, 0),
      sites: new Set(classes.flatMap((row) => (row.siteId ? [row.siteId] : [])))
        .size,
    },
    transportation: transportLines.sort(byName),
    supplies: [...supplies.values()].sort(byName),
    equipment: [...equipment.values()].sort(byName),
    locations: [...locations.values()].sort(byName),
  };
}

export type MtuSummary = ReturnType<typeof aggregateMtuSummary>;
