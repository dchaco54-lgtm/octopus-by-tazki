import { CurrencyRatesClient } from "@/modules/settings/currencies/currency-rates-client";
import { listCurrencyRates } from "@/services/currency-rates-service";

export default async function SettingsCurrenciesPage() {
  const { rows } = await listCurrencyRates();

  return <CurrencyRatesClient initialRates={rows} />;
}
