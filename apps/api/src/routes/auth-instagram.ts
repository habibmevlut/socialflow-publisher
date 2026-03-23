import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

const SCOPES = ["instagram_business_basic", "instagram_business_content_publish"];

export async function authInstagramRoutes(app: FastifyInstance) {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const apiBase = process.env.API_BASE_URL ?? "http://localhost:4000";
  const webBase = process.env.WEB_BASE_URL ?? "http://localhost:3001";

  if (!appId || !appSecret) {
    app.log.warn("INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET eksik; Instagram OAuth devre disi");
    return;
  }

  const instagramBase = process.env.INSTAGRAM_REDIRECT_BASE ?? apiBase;
  const redirectUri = `${instagramBase.replace(/\/$/, "")}/auth/instagram/callback`;

  app.get("/auth/instagram/connect", async (request, reply) => {
    const orgId = (request.query as { organizationId?: string }).organizationId;
    if (!orgId) {
      return reply.status(400).send({ message: "organizationId gerekli" });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.status(404).send({ message: "Organizasyon bulunamadi" });

    const authUrl = new URL("https://api.instagram.com/oauth/authorize");
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", SCOPES.join(","));
    authUrl.searchParams.set("state", orgId);

    return reply.redirect(authUrl.toString());
  });

  app.get("/auth/instagram/callback", async (request, reply) => {
    const { code, state: orgId, error } = request.query as { code?: string; state?: string; error?: string };

    if (error) {
      return reply.redirect(`${webBase}/?error=oauth_denied`);
    }
    if (!code || !orgId) {
      return reply.redirect(`${webBase}/?error=missing_params`);
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.redirect(`${webBase}/?error=org_not_found`);

    const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code
      })
    });

    const tokenJson = (await tokenRes.json()) as
      | { access_token?: string; user_id?: string; error?: { message: string } }
      | { data?: { access_token?: string; user_id?: string }[] };
    const tokenData =
      "data" in tokenJson && Array.isArray(tokenJson.data)
        ? tokenJson.data[0]
        : (tokenJson as { access_token?: string; user_id?: string });

    if (!tokenData?.access_token) {
      app.log.error({ tokenJson }, "Instagram token exchange failed");
      return reply.redirect(`${webBase}/?error=instagram_token_failed`);
    }

    const longLivedRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${tokenData.access_token}`
    );
    const longLived = (await longLivedRes.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    const accessToken = longLived.access_token ?? tokenData.access_token;
    const expiresIn = longLived.expires_in ?? 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const userInfo = await fetchInstagramUserInfo(accessToken);
    const externalId = userInfo?.id ?? tokenData.user_id ?? null;
    const displayName = userInfo?.username ?? (externalId ? `Instagram: ${externalId}` : "Instagram");

    const existing = await prisma.socialAccount.findFirst({
      where: { organizationId: orgId, platform: "instagram", externalAccountId: externalId ?? undefined }
    });

    let account: { id: string };

    if (existing) {
      await prisma.socialToken.upsert({
        where: { socialAccountId: existing.id },
        create: {
          socialAccountId: existing.id,
          accessToken,
          refreshToken: null,
          expiresAt,
          scopes: SCOPES.join(" ")
        },
        update: {
          accessToken,
          expiresAt
        }
      });
      account = existing;
    } else {
      const created = await prisma.socialAccount.create({
        data: {
          organizationId: orgId,
          platform: "instagram",
          externalAccountId: externalId,
          displayName,
          status: "active",
          token: {
            create: {
              accessToken,
              refreshToken: null,
              expiresAt,
              scopes: SCOPES.join(" ")
            }
          }
        }
      });
      account = created;
    }

    return reply.redirect(`${webBase}/?instagram_connected=1&accountId=${account.id}`);
  });
}

async function fetchInstagramUserInfo(accessToken: string): Promise<{ id?: string; username?: string } | null> {
  try {
    const res = await fetch(
      `https://graph.instagram.com/v25.0/me?fields=user_id,username&access_token=${accessToken}`
    );
    const data = (await res.json()) as { user_id?: string; username?: string; id?: string };
    return { id: data.user_id ?? data.id, username: data.username };
  } catch {
    return null;
  }
}
