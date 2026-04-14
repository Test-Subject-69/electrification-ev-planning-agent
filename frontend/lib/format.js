export function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1
  }).format(Number(value || 0));
}
