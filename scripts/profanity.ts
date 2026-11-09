const PREFIX = "(?:на|по|до|за|от|вы|при|раз|рас|объ|съ|у|о|с|вз|пере|под|про|не|ни)?";
const ROOTS = "(?:ху[йеяи]|пизд|еб[ауеиоыл]|ебн|бля|сук[аи]|муда[кч]|залуп|пидо?р)";
const PROFANITY = new RegExp(`^${PREFIX}${ROOTS}`);

export const MIN_PER_MINUTE = 8;
export const MAX_PER_MINUTE = 12;

export const profanityCount = (text: string): number =>
  text
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^а-я]+/)
    .filter((word) => PROFANITY.test(word)).length;

export const profanityWarning = (count: number, seconds: number): string | undefined => {
  const perMinute = (count * 60) / seconds;
  return perMinute < MIN_PER_MINUTE || perMinute > MAX_PER_MINUTE
    ? `WARN ru: ${count} profane words in ~${seconds}s (${perMinute.toFixed(1)}/min), target is ${MIN_PER_MINUTE}-${MAX_PER_MINUTE}/min`
    : undefined;
};
