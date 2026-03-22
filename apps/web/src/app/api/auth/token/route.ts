import { auth } from "@/auth";
import { SignJWT } from "jose";

const AUTH_SECRET = process.env.AUTH_SECRET;
const secret = AUTH_SECRET ? new TextEncoder().encode(AUTH_SECRET) : null;

export async function GET() {
  const session = await auth();
  const user = session?.user as { id?: string; organizationId?: string } | undefined;
  if (!secret) {
    return Response.json({ error: "AUTH_SECRET yapilandirilmamis" }, { status: 500 });
  }
  if (!user?.id || !user?.organizationId) {
    return Response.json(
      { error: "Unauthorized", reason: !user?.id ? "no-user-id" : "no-organization" },
      { status: 401 }
    );
  }
  const token = await new SignJWT({ organizationId: user.organizationId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setExpirationTime("5m")
    .sign(secret);
  return Response.json({ token });
}
