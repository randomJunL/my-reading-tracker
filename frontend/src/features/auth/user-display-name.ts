export function getUserFirstName(
  fullName: unknown,
  email?: string | null,
): string {
  if (typeof fullName === "string") {
    const trimmedName = fullName.trim();

    if (trimmedName) {
      return trimmedName.split(/\s+/)[0];
    }
  }

  return email?.split("@")[0] || "Reader";
}
