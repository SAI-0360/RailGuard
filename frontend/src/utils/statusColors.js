// Severity color tokens. These hues are reserved exclusively for severity;
// the interactive accent (#4CB8E8) is a separate vocabulary.
export function getStatusColors(status) {
  switch (status) {
    case "warning":
      return { bg: "bg-warn", text: "text-warn", hex: "#E6A23C" };
    case "critical":
      return { bg: "bg-crit", text: "text-crit", hex: "#F0524F" };
    case "healthy":
    default:
      return { bg: "bg-ok", text: "text-ok", hex: "#3FB890" };
  }
}
