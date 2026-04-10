import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

const STATUS_MAP: Record<string, "success" | "warning" | "danger" | "default"> = {
  active: "success",
  inactive: "default",
  suspended: "danger",
  pending: "warning",
  billed: "success",
  blocked: "danger",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  return <Badge variant={STATUS_MAP[normalized] ?? "default"}>{status}</Badge>;
}
