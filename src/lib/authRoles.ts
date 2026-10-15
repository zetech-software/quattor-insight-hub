export const ROLE_PRIORITY = ["admin","manager","support","client"] as const;
export function selectAppRole(rows: ReadonlyArray<{role:string}>) {
  return ROLE_PRIORITY.find((role)=>rows.some((row)=>row.role===role)) ?? null;
}
