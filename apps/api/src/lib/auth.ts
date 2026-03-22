import { FastifyRequest, FastifyReply } from "fastify";
import { jwtVerify } from "jose";

const AUTH_SECRET = process.env.AUTH_SECRET;
const secret = AUTH_SECRET ? new TextEncoder().encode(AUTH_SECRET) : undefined;

if (!secret && process.env.NODE_ENV !== "test") {
  console.warn("[auth] AUTH_SECRET yok - API istekleri 401 donecek. .env kontrol edin ve API'yi yeniden baslatin.");
}

export interface AuthPayload {
  userId: string;
  organizationId: string | null;
}

export type AuthErrorReason = "no-secret" | "no-header" | "invalid-token" | "no-org";

export async function getAuth(
  request: FastifyRequest
): Promise<{ auth: AuthPayload } | { error: AuthErrorReason }> {
  if (!secret) return { error: "no-secret" };
  const authHeader = request.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: "no-header" };

  try {
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub;
    const organizationId = (payload.organizationId as string) ?? null;
    if (!sub) return { error: "invalid-token" };
    if (!organizationId) return { error: "no-org" };
    return { auth: { userId: sub, organizationId } };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[auth] JWT verify hatasi:", err instanceof Error ? err.message : err);
    }
    return { error: "invalid-token" };
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthPayload & { organizationId: string } | null> {
  const result = await getAuth(request);
  if ("error" in result) {
    const msg =
      result.error === "no-secret"
        ? "Sunucu yapilandirmasi eksik"
        : result.error === "no-header"
          ? "Oturum token gerekli"
          : result.error === "no-org"
            ? "Organizasyon bulunamadi"
            : "Token gecersiz veya suresi dolmus";
    void reply.status(401).header("X-Auth-Error", result.error).send({ message: msg });
    return null;
  }
  return result.auth as AuthPayload & { organizationId: string };
}
