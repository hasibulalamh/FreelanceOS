// Tiny class-name joiner. Kept dependency-free until class complexity
// justifies clsx/tailwind-merge.
export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}
