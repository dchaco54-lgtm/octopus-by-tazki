import type { SubscriptionListRowClient } from "@/modules/subscriptions/list-view/types";
import { listSubscriptions } from "@/services/subscriptions-service";
import { SubscriptionsListClient } from "@/modules/subscriptions/subscriptions-list-client";

interface SubscriptionsPageProps {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
}

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const params = await searchParams;
  const { rows, error } = await listSubscriptions();

  return (
    <section className="mx-auto max-w-[1440px] bg-white">
      <SubscriptionsListClient
        rows={rows as SubscriptionListRowClient[]}
        error={error}
        initialSearch={params.q}
        initialStatus={params.status}
      />
    </section>
  );
}
