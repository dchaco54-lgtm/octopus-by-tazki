export type CurrencyCode = "UF" | "CLP";
export type CurrencyRateSourceType = "manual" | "api";

export type CurrencyRateRecord = {
  id: string;
  currency_code: CurrencyCode;
  period_year: number;
  period_month: number;
  reference_date: string;
  rate_value: number;
  source_type: CurrencyRateSourceType;
  source_note: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CurrencyRateUpsertInput = {
  id?: string | null;
  currencyCode: CurrencyCode;
  periodYear: number;
  periodMonth: number;
  referenceDate: string;
  rateValue: number;
  sourceType: CurrencyRateSourceType;
  sourceNote: string;
  isActive: boolean;
};

export type CurrencyRateActionResult =
  | {
      ok: true;
      message: string;
      rate: CurrencyRateRecord;
    }
  | {
      ok: false;
      error: string;
    };
