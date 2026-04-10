export type BillingRecordOrigin = "tazki" | "externo";
export type BillingRecordStatus = "draft" | "issued" | "pending_payment" | "paid" | "cancelled";
export type BillingExternalStatusMode = "automatic" | "pending_payment" | "paid";
export type BillingDocumentMode = "draft" | "issued";
export type BillingOutputKind = "xml" | "pdf";
export type BillingSourceSystem = "octopus_ui" | "historical_migration" | "api" | "hubspot" | "external_upload";
export type BillingSecondaryReferenceType = "HES" | "MIGO" | "EDP";

export type BillingLineInput = {
  id?: string;
  productId: string;
  accountCode: string;
  quantity: number;
  price: number;
  taxRate: number;
};

export type BillingNoteInput = {
  id?: string;
  body: string;
  author?: string;
  createdAt?: string;
};

export type BillingPersistPayload = {
  billingRecordId?: string | null;
  origin: BillingRecordOrigin;
  sourceSystem?: BillingSourceSystem | null;
  externalStatusMode: BillingExternalStatusMode;
  ufValue: number | null;
  companyId: string;
  payerCompanyId: string;
  subscriptionId: string;
  currency: "UF" | "CLP";
  documentType: string;
  documentNumber: string;
  invoiceDate: string;
  dueDate: string;
  dteStatus: string;
  paymentCondition: string;
  referenceText: string;
  paymentLink: string;
  servicePeriod: string;
  purchaseOrderReference: string;
  secondaryReferenceType: BillingSecondaryReferenceType;
  hesReference: string;
  executiveId: string;
  costCenter: string;
  hubspotId: string;
  dteEmail: string;
  observations: string;
  lines: BillingLineInput[];
  notes: BillingNoteInput[];
};

export type BillingPersistResult =
  | {
      ok: true;
      recordId: string;
      invoiceStatus: BillingRecordStatus;
      message: string;
      downloadPath?: string | null;
    }
  | {
      ok: false;
      error: string;
    };
