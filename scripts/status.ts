import { isStatus, isTopicLang, setStatus, STATUSES } from "./topics";

const [slug, lang, status] = process.argv.slice(2);

if (!slug || !lang || !status || !isTopicLang(lang) || !isStatus(status)) {
  console.error(`Usage: status <slug> <ru|en> <${STATUSES.join("|")}>`);
  process.exit(1);
}

if (!setStatus(slug, lang, status)) {
  console.error(`No topic with slug ${slug}`);
  process.exit(1);
}
console.log(`${slug} ${lang} -> ${status}`);
