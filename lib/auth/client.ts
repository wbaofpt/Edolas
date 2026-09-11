type LogoutRequest = (
  input: string,
  init?: RequestInit
) => Promise<{ ok: boolean }>;

export type LogoutClientDependencies = {
  request?: LogoutRequest;
  refresh: () => void;
};

export async function logoutCurrentSession({
  request = fetch,
  refresh
}: LogoutClientDependencies) {
  const response = await request("/api/auth/logout", { method: "POST" });

  if (!response.ok) {
    throw new Error("Không thể đăng xuất. Vui lòng thử lại.");
  }

  refresh();
}
