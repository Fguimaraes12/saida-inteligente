export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json();
  if (!response.ok) {
    if (
      response.status === 401 &&
      path !== "/auth/login" &&
      path !== "/auth/me"
    )
      window.dispatchEvent(new Event("session-expired"));
    const details = body.error?.details
      ?.map((d: { path: string; message: string }) => `${d.path}: ${d.message}`)
      .join("; ");
    throw new ApiError(
      response.status,
      [body.error?.message || "Não foi possível concluir a operação.", details]
        .filter(Boolean)
        .join(" "),
    );
  }
  return body;
}
export const jsonBody = (body: unknown) => JSON.stringify(body);
