export function formatCurrency(amount: string | number, currency = "GBP"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}

export function formatInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function getSportColor(sport: string): string {
  const map: Record<string, string> = {
    football: "bg-emerald-500",
    soccer: "bg-emerald-500",
    basketball: "bg-orange-500",
    tennis: "bg-yellow-400",
    cricket: "bg-lime-500",
    rugby: "bg-red-600",
    swimming: "bg-blue-500",
    cycling: "bg-purple-500",
    volleyball: "bg-pink-500",
    badminton: "bg-teal-500",
  };
  return map[sport.toLowerCase()] ?? "bg-indigo-500";
}

export function getStatusColor(status: string): "default" | "info" | "success" | "muted" | "danger" {
  const map: Record<string, "default" | "info" | "success" | "muted" | "danger"> = {
    scheduled: "info",
    ongoing: "success",
    completed: "muted",
    cancelled: "danger",
  };
  return map[status] ?? "muted";
}

export function getRSVPColor(status: string): "success" | "danger" | "warning" | "info" | "muted" {
  const map: Record<string, "success" | "danger" | "warning" | "info" | "muted"> = {
    confirmed: "success",
    declined: "danger",
    maybe: "warning",
    waitlisted: "info",
  };
  return map[status] ?? "muted";
}

export function getPaymentColor(status: string): "success" | "warning" | "muted" {
  const map: Record<string, "success" | "warning" | "muted"> = {
    paid: "success",
    pending: "warning",
    waived: "muted",
  };
  return map[status] ?? "muted";
}
