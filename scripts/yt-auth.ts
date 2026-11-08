import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { createServer } from "node:http";
import { parseArgs } from "node:util";
import { requireEnv } from "./env";
import { YOUTUBE_SCOPE, exchangeCode, refreshTokenEnvName } from "./youtube";

const PORT = 8765;
const { values } = parseArgs({ options: { channel: { type: "string" } } });
const channel = values.channel;
if (!channel) {
  console.error("Usage: yt-auth --channel ru|en|<name>  (writes YT_REFRESH_TOKEN_<NAME> to .env)");
  process.exit(1);
}

const redirectUri = `http://127.0.0.1:${PORT}`;
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
  client_id: requireEnv("YT_CLIENT_ID"),
  redirect_uri: redirectUri,
  response_type: "code",
  scope: YOUTUBE_SCOPE,
  access_type: "offline",
  prompt: "consent select_account",
})}`;

const server = createServer(async (request, response) => {
  const code = new URL(request.url ?? "/", redirectUri).searchParams.get("code");
  if (!code) {
    response.end("no code");
    return;
  }
  try {
    const refreshToken = await exchangeCode(code, redirectUri);
    appendFileSync(".env", `\n${refreshTokenEnvName(channel)}=${refreshToken}\n`);
    response.end("Done. You can close this tab.");
    console.log(`saved ${refreshTokenEnvName(channel)} to .env`);
  } catch (error) {
    response.end("failed, see terminal");
    console.error(error instanceof Error ? error.message : String(error));
  }
  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Sign in and pick the channel for "${channel}". Opening browser...`);
  spawnSync("open", [authUrl]);
});
