import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { US_STATES } from "@/lib/us-states";

export type AddressValue = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
};

// Shared between the account address book and checkout. US-only by
// construction: the state list is the 50-state + DC enum, no country field
// exists anywhere.
export function AddressFields({
  idPrefix,
  value,
  errors,
}: {
  idPrefix: string;
  value?: AddressValue;
  errors?: Partial<Record<keyof AddressValue, string>>;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      <Input
        id={`${idPrefix}-line1`}
        name="line1"
        label="Street address"
        defaultValue={value?.line1}
        error={errors?.line1}
        autoComplete="address-line1"
      />
      <Input
        id={`${idPrefix}-line2`}
        name="line2"
        label="Apt / suite (optional)"
        defaultValue={value?.line2}
        autoComplete="address-line2"
      />
      <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 max-md:grid-cols-1">
        <Input
          id={`${idPrefix}-city`}
          name="city"
          label="City"
          defaultValue={value?.city}
          error={errors?.city}
          autoComplete="address-level2"
        />
        <Select
          id={`${idPrefix}-state`}
          name="state"
          label="State"
          defaultValue={value?.state ?? "NV"}
          options={US_STATES.map((s) => ({ value: s, label: s }))}
          autoComplete="address-level1"
        />
        <Input
          id={`${idPrefix}-zip`}
          name="zip"
          label="ZIP"
          mono
          maxLength={5}
          defaultValue={value?.zip}
          error={errors?.zip}
          autoComplete="postal-code"
          inputMode="numeric"
        />
      </div>
      <Input
        id={`${idPrefix}-phone`}
        name="phone"
        label="Phone (optional)"
        defaultValue={value?.phone}
        autoComplete="tel"
        hint="Only used by the carrier for delivery questions."
      />
    </div>
  );
}
