export function getStatusColors(status) {
  switch (status) {
    case "warning":
      return { bg: "bg-amber-500", text: "text-amber-500", hex: "#F59E0B" };
    case "critical":
      return { bg: "bg-red-500", text: "text-red-500", hex: "#EF4444" };
    case "healthy":
    default:
      return { bg: "bg-emerald-500", text: "text-emerald-500", hex: "#10B981" };
  }
}
