export const BUS_TABS = ["north_gate", "tsmc", "nanda", "city"] as const;

export type BusTab = (typeof BUS_TABS)[number];

export function normalizeBusTab(value: string | null | undefined): BusTab {
  return BUS_TABS.includes(value as BusTab) ? (value as BusTab) : "north_gate";
}
