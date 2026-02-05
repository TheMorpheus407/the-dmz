export type DependencyHealth = {
  ok: boolean;
  message: string;
};

export async function checkDatabaseHealth(): Promise<DependencyHealth> {
  return {
    ok: false,
    message: "Database connection not configured",
  };
}
