import { appendFileSync, mkdirSync } from "node:fs";
import { loadEnv } from "./env";

export const sendAlert = async (lang: string, message: string): Promise<void> => {
  loadEnv();
  mkdirSync(`state/${lang}`, { recursive: true });
  appendFileSync(`state/${lang}/alerts.log`, `${new Date().toISOString()} ${message.replace(/\n/g, " | ")}\n`);
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: `reels-factory (${lang}): ${message}`.slice(0, 4000) }),
    });
    if (!response.ok) console.error(`telegram alert failed: HTTP ${response.status}`);
  } catch {
    console.error("telegram alert failed: network error");
  }
};

const isMain = process.argv[1]?.endsWith("alert.ts") ?? false;

if (isMain) {
  const args = process.argv.slice(2);
  const langAt = args.indexOf("--lang");
  const alertLang = langAt >= 0 ? (args[langAt + 1] ?? "ru") : "ru";
  const message = (langAt >= 0 ? args.filter((_, index) => index !== langAt && index !== langAt + 1) : args).join(" ");
  if (!message) {
    console.error('Usage: alert "text"');
    process.exit(1);
  }
  await sendAlert(alertLang, message);
  console.log(`alert sent (see state/${alertLang}/alerts.log)`);
}
