import type { VehicleInfo } from "@/types/ro";

export function RoCapSheet(props: {
  customerName: string;
  setCustomerName: (v: string) => void;
  mileage: string;
  setMileage: (v: string) => void;
  vehicle?: VehicleInfo;
  setVehicle: (v?: VehicleInfo) => void;
  notes: string;
  setNotes: (v: string) => void;
}) {
  const vehicle = props.vehicle ?? {};

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">RO Details</h3>
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Customer name"
            value={props.customerName}
            onChange={(e) => props.setCustomerName(e.target.value)}
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Mileage"
            value={props.mileage}
            onChange={(e) => props.setMileage(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Year"
            value={vehicle.year ?? ""}
            onChange={(e) =>
              props.setVehicle({
                ...vehicle,
                year: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Make"
            value={vehicle.make ?? ""}
            onChange={(e) => props.setVehicle({ ...vehicle, make: e.target.value || undefined })}
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Model"
            value={vehicle.model ?? ""}
            onChange={(e) => props.setVehicle({ ...vehicle, model: e.target.value || undefined })}
          />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder="Trim"
            value={vehicle.trim ?? ""}
            onChange={(e) => props.setVehicle({ ...vehicle, trim: e.target.value || undefined })}
          />
        </div>

        <textarea
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Notes"
          rows={2}
          value={props.notes}
          onChange={(e) => props.setNotes(e.target.value)}
        />
      </div>
    </div>
  );
}
