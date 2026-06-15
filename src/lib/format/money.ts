export function formatMoney(value: number, maximumFractionDigits = 0) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits
  }).format(Number.isFinite(value) ? value : 0)} MDL`;
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(Number.isFinite(value) ? value : 0)}%`;
}
