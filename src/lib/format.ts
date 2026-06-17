export function yen(value: number | null | undefined) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    label: `${now.getFullYear()}年${now.getMonth() + 1}月`,
  };
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}
