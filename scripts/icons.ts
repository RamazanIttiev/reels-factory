import { searchIcons } from "../src/icons";

const query = process.argv[2];
if (!query) {
  console.error("Usage: npm run icons -- <word>   (brand:<slug> = technology logo, otherwise a generic icon name)");
  process.exit(1);
}
const found = searchIcons(query);
console.log(found.length > 0 ? found.join("\n") : `no icons for "${query}"`);
