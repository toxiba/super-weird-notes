export function dateParts(value: string) {
  const date = new Date(value);
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const quarter = `Q${Math.floor(date.getMonth() / 3) + 1}`;
  return {
    year,
    quarter,
    month,
    day: String(date.getDate()).padStart(2, "0"),
  };
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
