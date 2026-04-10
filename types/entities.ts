export type EntityStatus = "active" | "inactive" | "suspended";
export type UserRole = "basic" | "editor" | "admin";

export interface UserProfile {
  id: string;
  auth_user_id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  legal_name: string;
  trade_name: string;
  rut: string;
  billing_email: string;
  admin_email: string;
  phone: string | null;
  address: string | null;
  commune: string | null;
  city: string | null;
  country: string;
  legal_representative_name: string | null;
  legal_representative_rut: string | null;
  status: EntityStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  activeClients: number;
  activeSubscriptions: number;
  suspendedSubscriptions: number;
  pendingBilling: number;
  monthlyBilling: number;
  openOpportunities: number;
}
