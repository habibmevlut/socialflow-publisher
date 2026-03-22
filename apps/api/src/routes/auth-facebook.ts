import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";

// Pages API: pages_show_list (base), pages_read_engagement, pages_manage_posts, pages_manage_metadata
const SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "pages_manage_metadata"];
const API_VERSION = "v21.0";

export async function authFacebookRoutes(app: FastifyInstance) {
  const appId = process.env.FACEBOOK_APP_ID ?? process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET ?? process.env.INSTAGRAM_APP_SECRET;
  const webBase = process.env.WEB_BASE_URL ?? "http://localhost:3001";

  if (!appId || !appSecret) {
    app.log.warn("FACEBOOK_APP_ID / FACEBOOK_APP_SECRET eksik; Facebook OAuth devre disi");
    return;
  }

  const fbBase =
    process.env.FACEBOOK_REDIRECT_BASE ?? process.env.INSTAGRAM_REDIRECT_BASE ?? "http://localhost:4000";
  const redirectUri = `${fbBase.replace(/\/$/, "")}/auth/facebook/callback`;

  app.get("/auth/facebook/connect", async (request, reply) => {
    const orgId = (request.query as { organizationId?: string }).organizationId;
    if (!orgId) {
      return reply.status(400).send({ message: "organizationId gerekli" });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.status(404).send({ message: "Organizasyon bulunamadi" });

    const authUrl = new URL(`https://www.facebook.com/${API_VERSION}/dialog/oauth`);
    authUrl.searchParams.set("client_id", appId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", SCOPES.join(","));
    authUrl.searchParams.set("state", orgId);
    authUrl.searchParams.set("response_type", "code");

    return reply.redirect(authUrl.toString());
  });

  app.get("/auth/facebook/callback", async (request, reply) => {
    const { code, state: orgId, error } = request.query as { code?: string; state?: string; error?: string };

    if (error) {
      return reply.redirect(`${webBase}/?error=oauth_denied`);
    }
    if (!code || !orgId) {
      return reply.redirect(`${webBase}/?error=missing_params`);
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.redirect(`${webBase}/?error=org_not_found`);

    const tokenUrl = new URL(`https://graph.facebook.com/${API_VERSION}/oauth/access_token`);
    tokenUrl.searchParams.set("client_id", appId);
    tokenUrl.searchParams.set("client_secret", appSecret);
    tokenUrl.searchParams.set("redirect_uri", redirectUri);
    tokenUrl.searchParams.set("code", code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
      error?: { message: string };
    };

    if (tokenJson.error || !tokenJson.access_token) {
      app.log.error({ tokenJson }, "Facebook token exchange failed");
      return reply.redirect(`${webBase}/?error=facebook_token_failed`);
    }

    const userToken = tokenJson.access_token;

    const longLivedRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userToken}`
    );
    const longLived = (await longLivedRes.json()) as {
      access_token?: string;
      expires_in?: number;
    };
    const longLivedToken = longLived.access_token ?? userToken;

    const accountsRes = await fetch(
      `https://graph.facebook.com/${API_VERSION}/me/accounts?access_token=${encodeURIComponent(longLivedToken)}`
    );
    const accountsData = (await accountsRes.json()) as {
      data?: { id: string; name: string; access_token: string }[];
      error?: { message: string };
    };

    if (accountsData.error || !accountsData.data?.length) {
      app.log.error({ accountsData }, "Facebook pages fetch failed");
      return reply.redirect(`${webBase}/?error=facebook_no_pages`);
    }

    const page = accountsData.data[0];
    if (!page) {
      return reply.redirect(`${webBase}/?error=facebook_no_pages`);
    }
    const pageAccessToken = page.access_token;
    const pageId = page.id;
    const pageName = page.name;

    const expiresIn = 60 * 24 * 60; // ~60 gün
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const existing = await prisma.socialAccount.findFirst({
      where: { organizationId: orgId, platform: "facebook", externalAccountId: pageId }
    });

    let account: { id: string };

    if (existing) {
      await prisma.socialToken.upsert({
        where: { socialAccountId: existing.id },
        create: {
          socialAccountId: existing.id,
          accessToken: pageAccessToken,
          refreshToken: null,
          expiresAt,
          scopes: SCOPES.join(" ")
        },
        update: {
          accessToken: pageAccessToken,
          expiresAt
        }
      });
      account = existing;
    } else {
      const created = await prisma.socialAccount.create({
        data: {
          organizationId: orgId,
          platform: "facebook",
          externalAccountId: pageId,
          displayName: pageName,
          status: "active",
          token: {
            create: {
              accessToken: pageAccessToken,
              refreshToken: null,
              expiresAt,
              scopes: SCOPES.join(" ")
            }
          }
        }
      });
      account = created;
    }

    return reply.redirect(`${webBase}/?facebook_connected=1&accountId=${account.id}`);
  });
}
