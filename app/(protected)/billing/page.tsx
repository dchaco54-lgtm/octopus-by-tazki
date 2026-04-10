import { BillingListClient } from "@/modules/billing/billing-list-client";
import { listBillingRecords } from "@/services/billing-service";

export default async function BillingPage() {
  const { rows, error } = await listBillingRecords();

  return <BillingListClient rows={rows} error={error} />;
}
