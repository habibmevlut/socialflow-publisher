import { FastifyInstance } from "fastify";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.email"
];

export async function authYouTubeRoutes(app: FastifyInstance) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const apiBase = process.env.API_BASE_URL ?? "http://localhost:4000";
  const webBase = process.env.WEB_BASE_URL ?? "http://localhost:3001";

  if (!clientId || !clientSecret) {
    app.log.warn("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET eksik; YouTube OAuth devre disi");
    return;
  }

  const oauth2Client = new OAuth2Client(clientId, clientSecret, `${apiBase}/auth/youtube/callback`);

  app.get("/auth/youtube/connect", async (request, reply) => {
    const orgId = (request.query as { organizationId?: string }).organizationId;
    if (!orgId) {
      return reply.status(400).send({ message: "organizationId gerekli" });
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.status(404).send({ message: "Organizasyon bulunamadi" });

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
      state: orgId,
      prompt: "consent"
    });

    return reply.redirect(authUrl);
  });

  app.get("/auth/youtube/callback", async (request, reply) => {
    const { code, state: orgId, error } = request.query as { code?: string; state?: string; error?: string };

    if (error) {
      return reply.redirect(`${webBase}/?error=oauth_denied`);
    }
    if (!code || !orgId) {
      return reply.redirect(`${webBase}/?error=missing_params`);
    }

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) return reply.redirect(`${webBase}/?error=org_not_found`);

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    if (!tokens.access_token) {
      return reply.redirect(`${webBase}/?error=no_token`);
    }

    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
    const { channelId, channelTitle } = await fetchYouTubeChannelInfo(oauth2Client);
    const displayName = channelTitle ?? (channelId ? `YouTube: ${channelId}` : "YouTube");

    // Mevcut hesap: channelId ile veya eski (null) kayit ile
    let existing = channelId
      ? await prisma.socialAccount.findFirst({
          where: { organizationId: orgId, platform: "youtube", externalAccountId: channelId }
        })
      : null;
    if (!existing) {
      existing = await prisma.socialAccount.findFirst({
        where: { organizationId: orgId, platform: "youtube", externalAccountId: null }
      });
    }

    let account: { id: string };

    if (existing) {
      await prisma.socialAccount.update({
        where: { id: existing.id },
        data: { externalAccountId: channelId ?? undefined, displayName, status: "active" }
      });
      await prisma.socialToken.upsert({
        where: { socialAccountId: existing.id },
        create: {
          socialAccountId: existing.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          expiresAt: expiryDate,
          scopes: SCOPES.join(" ")
        },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? undefined,
          expiresAt: expiryDate ?? undefined
        }
      });
      account = { ...existing, id: existing.id };
    } else {
      const created = await prisma.socialAccount.create({
        data: {
          organizationId: orgId,
          platform: "youtube",
          externalAccountId: channelId,
          displayName,
          status: "active",
          token: {
            create: {
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token ?? null,
              expiresAt: expiryDate,
              scopes: SCOPES.join(" ")
            }
          }
        }
      });
      account = created;
    }

    return reply.redirect(`${webBase}/?youtube_connected=1&accountId=${account.id}`);
  });
}

async function fetchYouTubeChannelInfo(
  oauth2Client: OAuth2Client
): Promise<{ channelId: string | null; channelTitle: string | null }> {
  try {
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=id,snippet&mine=true",
      { headers: { Authorization: `Bearer ${oauth2Client.credentials.access_token}` } }
    );
    const data = (await res.json()) as { items?: { id: string; snippet?: { title?: string } }[] };
    const item = data.items?.[0];
    return {
      channelId: item?.id ?? null,
      channelTitle: item?.snippet?.title ?? null
    };
  } catch {
    return { channelId: null, channelTitle: null };
  }
}
