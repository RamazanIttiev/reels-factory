import { readFileSync } from "node:fs";
import { requireEnv } from "./env";

export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.upload";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos";

export const refreshTokenEnvName = (channel: string): string => `YT_REFRESH_TOKEN_${channel.toUpperCase()}`;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

const readJson = async (response: Response): Promise<Record<string, unknown>> => {
  const body: unknown = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${response.status} ${JSON.stringify(body)}`);
  return isRecord(body) ? body : {};
};

export const exchangeCode = async (code: string, redirectUri: string): Promise<string> => {
  const body = await readJson(
    await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: requireEnv("YT_CLIENT_ID"),
        client_secret: requireEnv("YT_CLIENT_SECRET"),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    }),
  );
  if (typeof body.refresh_token !== "string") throw new Error("Google returned no refresh_token; revoke access and retry");
  return body.refresh_token;
};

const accessToken = async (channel: string): Promise<string> => {
  const body = await readJson(
    await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: requireEnv("YT_CLIENT_ID"),
        client_secret: requireEnv("YT_CLIENT_SECRET"),
        refresh_token: requireEnv(refreshTokenEnvName(channel)),
        grant_type: "refresh_token",
      }),
    }),
  );
  if (typeof body.access_token !== "string") throw new Error("no access_token in refresh response");
  return body.access_token;
};

export type YoutubeUpload = {
  channel: string;
  file: string;
  title: string;
  description: string;
  language: string;
  privacy: "public" | "private" | "unlisted";
};

export const uploadShort = async ({ channel, file, title, description, language, privacy }: YoutubeUpload): Promise<string> => {
  const token = await accessToken(channel);
  const video = readFileSync(file);
  const start = await fetch(`${UPLOAD_URL}?uploadType=resumable&part=snippet,status`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-type": "video/mp4",
      "x-upload-content-length": String(video.length),
    },
    body: JSON.stringify({
      snippet: { title, description, categoryId: "27", defaultLanguage: language, defaultAudioLanguage: language },
      status: { privacyStatus: privacy, selfDeclaredMadeForKids: false, containsSyntheticMedia: true },
    }),
  });
  if (!start.ok) throw new Error(`upload init failed: ${start.status} ${await start.text()}`);
  const location = start.headers.get("location");
  if (!location) throw new Error("upload init returned no location");
  const body = await readJson(
    await fetch(location, { method: "PUT", headers: { "content-type": "video/mp4" }, body: video }),
  );
  if (typeof body.id !== "string") throw new Error("upload finished without a video id");
  return body.id;
};

export const setThumbnail = async ({ channel, videoId, file }: { channel: string; videoId: string; file: string }): Promise<void> => {
  const token = await accessToken(channel);
  const response = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "image/jpeg" },
    body: readFileSync(file),
  });
  if (!response.ok) throw new Error(`thumbnail failed: ${response.status} ${await response.text()}`);
};
