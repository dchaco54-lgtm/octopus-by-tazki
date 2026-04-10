import {
  BarChart3,
  Building2,
  Boxes,
  Coins,
  CreditCard,
  FileBarChart2,
  type LucideIcon,
  Settings2,
  WalletCards,
  WalletMinimal,
} from "lucide-react";

export interface NavigationItem {
  key: string;
  href?: string;
  label: string;
  icon: LucideIcon;
  description: string;
  subItems?: string[];
  comingSoon?: boolean;
}

export const navigationItems: NavigationItem[] = [
  {
    key: "clients",
    href: "/clients",
    label: "Clientes",
    icon: Building2,
    description: "Empresas, contactos y operacion base.",
    subItems: ["Ficha maestra", "Contactos", "Facturacion", "Ordenes de compra"],
  },
  {
    key: "products",
    href: "/products",
    label: "Productos",
    icon: Boxes,
    description: "Catalogos de planes, addons, servicios y pricing.",
    subItems: ["Planes", "Addons", "Servicios", "Pricing"],
  },
  {
    key: "subscriptions",
    href: "/subscriptions",
    label: "Suscripciones",
    icon: WalletCards,
    description: "Contratos, renovaciones y cambios de plan.",
    subItems: ["Vigentes", "Renovaciones", "Cambios de plan"],
  },
  {
    key: "billing",
    href: "/billing",
    label: "Facturacion",
    icon: CreditCard,
    description: "Facturas, bloqueos y seguimiento documental.",
    subItems: ["Emision", "DTE", "Bloqueos"],
  },
  {
    key: "collections",
    href: "/collections",
    label: "Cobranza",
    icon: WalletMinimal,
    description: "Gestion de deuda y recaudacion.",
    subItems: ["Cartera", "Compromisos", "Seguimiento"],
  },
  {
    key: "commissions",
    href: "/commissions",
    label: "Comisiones",
    icon: Coins,
    description: "Liquidacion comercial y seguimiento de payout.",
    subItems: ["Liquidaciones", "Estados", "Historial"],
  },
  {
    key: "reports",
    href: "/reports",
    label: "Reportes",
    icon: FileBarChart2,
    description: "Analitica y cortes operacionales.",
    subItems: ["Operaciones", "Facturacion", "Comercial"],
  },
  {
    key: "settings",
    href: "/settings",
    label: "Configuracion",
    icon: Settings2,
    description: "Ajustes generales del sistema.",
    subItems: ["Monedas", "Usuarios", "Catalogos", "Preferencias"],
  },
];

export const secondaryNavigationItems: NavigationItem[] = [
  {
    key: "usage",
    href: "/usage",
    label: "Uso",
    icon: BarChart3,
    description: "Consumo y adopcion operativa.",
    subItems: ["Adopcion", "Actividad", "Metricas"],
  },
];
