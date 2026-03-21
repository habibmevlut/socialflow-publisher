import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { Readable } from "node:stream";

export type YouTubeUploadParams = {
  accessToken: string;
  refreshToken: string | null;
  title: string;
  description?: string | null;
  videoUrl: string;
  privacyStatus?: "public" | "private" | "unlisted";
};

export async function uploadVideoToYouTube(params: YouTubeUploadParams): Promise<string> {
  const { accessToken, refreshToken, title, description, videoUrl, privacyStatus = "private" } = params;

  if (!refreshToken) {
    throw new Error(
      "YouTube token suresi dolmus. Lutfen uygulamada 'YouTube Bagla' ile tekrar baglanin."
    );
  }

  const redirectUri = process.env.API_BASE_URL
    ? `${process.env.API_BASE_URL.replace(/\/$/, "")}/auth/youtube/callback`
    : undefined;

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  await oauth2Client.getAccessToken();

  const res = await fetch(videoUrl, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Video indirilemedi: ${res.status} ${res.statusText}`);
  }

  const contentType = res.headers.get("content-type") ?? "video/mp4";
  const buffer = Buffer.from(await res.arrayBuffer());
  const stream = Readable.from(buffer);

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const response = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: title.slice(0, 100),
        description: (description ?? "").slice(0, 5000)
      },
      status: {
        privacyStatus,
        selfDeclaredMadeForKids: false
      }
    },
    media: {
      body: stream,
      mimeType: contentType.startsWith("video/") ? contentType : "video/mp4"
    }
  });

  const videoId = response.data.id;
  if (!videoId) {
    throw new Error("YouTube video ID alinamadi");
  }

  return `https://www.youtube.com/watch?v=${videoId}`;
}
