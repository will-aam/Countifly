export function getHistoryDisplayName(fileName: string, countType?: string | null) {
  const cleanName = String(fileName || "contagem.csv")
    .replace(/^\[COUNT_TYPE:(?:import|audit|team|api|legacy)\]\s*/i, "")
    .replace(/^\[IMP\]\s*/i, "")
    .replace(/^\[AUD[^\]]*\]\s*/i, "")
    .replace(/_FINAL\.csv$/i, ".csv");

  const type = String(countType || "").toLowerCase();
  if (type === "import" || (!type && /^\[IMP\]/i.test(fileName))) {
    return `[IMP] ${cleanName}`;
  }
  if (type === "audit" || (!type && /^\[AUD/i.test(fileName))) {
    return `[AUD] ${cleanName}`;
  }
  return cleanName;
}
