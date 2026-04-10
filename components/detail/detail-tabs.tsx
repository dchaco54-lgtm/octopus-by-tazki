interface DetailTabsProps<T extends string> {
  tabs: Array<{ key: T; label: string }>;
  activeTab: T;
  onSelect: (key: T) => void;
}

export function DetailTabs<T extends string>({ tabs, activeTab, onSelect }: DetailTabsProps<T>) {
  return (
    <div className="-mx-5 border-b border-[var(--tazki-slate-200)] px-5">
      <nav className="flex flex-wrap gap-0.5">
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelect(tab.key)}
              className={`-mb-px rounded-t-md border border-[var(--tazki-slate-200)] px-3 py-2 text-[13px] font-semibold ${
                selected
                  ? "border-b-white bg-white text-[var(--tazki-slate-950)]"
                  : "border-b-[var(--tazki-slate-200)] bg-[var(--tazki-slate-50)] text-[var(--tazki-slate-600)] hover:bg-white hover:text-[var(--tazki-slate-950)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
