import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

// video.publish: videoyu dogrudan yayinlamak icin gerekli
const SCOPES = ["user.info.basic", "video.publish"];

export async function authTikTokRoutes(app: FastifyInstance) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const webBase = process.env.WEB_BASE_URL ?? "http://localhost:3001";

  if (!clientKey || !clientSecret) {
    app.log.warn("TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET eksik; TikTok OAuth devre disi");
    return;
  }

  const tiktokBase = process.env.TIKTOK_REDIRECT_BASE ?? process.env.INSTAGRAM_REDIRECT_BASE ?? "http://localhost:4000";
  const redirectUri = `${tiktokBase.replace(/\/$/, "")}/auth/tiktok/callback`;

  app.get("/auth/tiktok/connect", async (request, reply) => {
    const orgId = (request.query as { organizationId?: string }).organizationId;
    if (!orgId) {
      return reply.status(400).send({ message: "organizationId gerekli" });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.status(404).send({ message: "Organizasyon bulunamadi" });

    const authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
    authUrl.searchParams.set("client_key", clientKey);
    authUrl.searchParams.set("scope", SCOPES.join(","));
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", orgId);

    return reply.redirect(authUrl.toString());
  });

  app.get("/auth/tiktok/callback", async (request, reply) => {
    const { code, state: orgId, error } = request.query as { code?: string; state?: string; error?: string };

    if (error) {
      return reply.redirect(`${webBase}/?error=oauth_denied`);
    }
    if (!code || !orgId) {
      return reply.redirect(`${webBase}/?error=missing_params`);
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.redirect(`${webBase}/?error=org_not_found`);

    const tokenRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri
      })
    });

    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      refresh_expires_in?: number;
      open_id?: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenJson.error || !tokenJson.access_token) {
      app.log.error({ tokenJson }, "TikTok token exchange failed");
      return reply.redirect(`${webBase}/?error=tiktok_token_failed`);
    }

    const expiresIn = tokenJson.expires_in ?? 86400;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const userInfo = await fetchTikTokUserInfo(tokenJson.access_token);
    const externalId = tokenJson.open_id ?? null;
    const displayName =
      userInfo?.display_name ?? userInfo?.username ?? (externalId ? `TikTok: ${externalId}` : "TikTok");

    const existing = await prisma.socialAccount.findFirst({
      where: { organizationId: orgId, platform: "tiktok", externalAccountId: externalId ?? undefined }
    });

    let account: { id: string };

    if (existing) {
      await prisma.socialToken.upsert({
        where: { socialAccountId: existing.id },
        create: {
          socialAccountId: existing.id,
          accessToken: tokenJson.access_token,
          refreshToken: tokenJson.refresh_token ?? null,
          expiresAt,
          scopes: SCOPES.join(" ")
        },
        update: {
          accessToken: tokenJson.access_token,
          refreshToken: tokenJson.refresh_token ?? undefined,
          expiresAt
        }
      });
      account = existing;
    } else {
      const created = await prisma.socialAccount.create({
        data: {
          organizationId: orgId,
          platform: "tiktok",
          externalAccountId: externalId,
          displayName,
          status: "active",
          token: {
            create: {
              accessToken: tokenJson.access_token,
              refreshToken: tokenJson.refresh_token ?? null,
              expiresAt,
              scopes: SCOPES.join(" ")
            }
          }
        }
      });
      account = created;
    }

    return reply.redirect(`${webBase}/?tiktok_connected=1&accountId=${account.id}`);
  });
}

async function fetchTikTokUserInfo(accessToken: string): Promise<{ username?: string; display_name?: string } | null> {
  try {
    const res = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=display_name", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });
    const data = (await res.json()) as {
      data?: { user?: { display_name?: string } };
    };
    return data.data?.user ?? null;
  } catch {
    return null;
  }
}
