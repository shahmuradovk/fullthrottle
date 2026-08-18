// Serializable descriptions passed from the server (which knows the attribute
// template and facet counts) to the client sidebar (which edits the URL).

export type CheckOption = {
  label: string;
  value: string;
  count: number;
  selected: boolean;
};

export type SidebarGroup =
  | { kind: "check"; name: string; param: string; options: CheckOption[] }
  | {
      kind: "range";
      name: string;
      paramMin: string;
      paramMax: string;
      unit: string;
      min: string; // current value or ""
      max: string;
      placeholderMin: string;
      placeholderMax: string;
    };

export type ActiveChip = {
  label: string;
  // Removing a chip = these edits to the query string.
  remove: { param: string; value?: string }[];
};
