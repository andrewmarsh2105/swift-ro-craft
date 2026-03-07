import type { LaborType } from "@/types/ro";

export const laborTypeOptions: Array<{ value: LaborType; label: string }> = [
  { value: "customer-pay", label: "Customer Pay" },
  { value: "warranty", label: "Warranty" },
  { value: "internal", label: "Internal" },
];
