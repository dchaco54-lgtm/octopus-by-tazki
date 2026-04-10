import { SubscriptionDetailScreen } from "@/modules/subscriptions/subscription-detail-screen";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface SubscriptionDetailViewPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SubscriptionDetailViewPage({ params, searchParams }: SubscriptionDetailViewPageProps) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tab = typeof sp.tab === "string" ? sp.tab : undefined;
  const edit = sp.edit === "1";
  const errorMessage = typeof sp.error === "string" ? sp.error : undefined;

  if (!tab) {
    redirect(`/subscriptions/${id}/view?tab=products`);
  }

  return SubscriptionDetailScreen({
    subscriptionId: id,
    tab,
    baseHref: `/subscriptions/${id}/view`,
    edit,
    errorMessage,
  });
}
