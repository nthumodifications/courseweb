import * as React from "react";
import ExpandableFilter from "./ExpandableFilter";

type CheckboxExpandableFilterProps = Omit<
  React.ComponentProps<typeof ExpandableFilter>,
  "mode"
>;

/**
 * @deprecated `ExpandableFilter` and `CheckboxExpandableFilter` were ~90%
 * duplicated code and have been merged into `ExpandableFilter` with a
 * `mode: "checkbox" | "simple"` prop. This file is kept as a thin wrapper so
 * any existing imports of `CheckboxExpandableFilter` keep working; prefer
 * importing `ExpandableFilter` with `mode="checkbox"` directly going forward.
 */
const CheckboxExpandableFilter = (props: CheckboxExpandableFilterProps) => (
  <ExpandableFilter {...props} mode="checkbox" />
);

export default CheckboxExpandableFilter;
