import { advanceStatusBySlug } from "./curriculum";

// TODO: Instagram Graph API upload. Requires a professional account, a Meta app and a public video URL.
// TODO: label the reel as AI-generated in Meta before publishing.
// TODO: only run after an explicit "publish" from the owner. This stub makes no network calls.
const uploadReel = async (_slug: string): Promise<boolean> => false;

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: publish <slug>");
  process.exit(1);
}

if (await uploadReel(slug)) {
  advanceStatusBySlug(slug, "published");
  console.log(`${slug} published`);
} else {
  console.log(`publish is not implemented yet (episode: ${slug}). No request was sent, status unchanged.`);
}
