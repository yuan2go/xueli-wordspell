import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { SENTENCE_AUDIO } from "../src/content/sentences.ts";
import { IMAGES, AUDIO } from "../src/content/manifest.ts";
import {
  validateResources,
  matchesFormat,
} from "../src/content/resource-contract.ts";
import { validateStory } from "../src/content/validate.ts";
import { PACK } from "../src/content/story.ts";
const policy = process.argv.includes("--release") ? "release" : "development";
validateResources(IMAGES, [...AUDIO, ...SENTENCE_AUDIO], policy);
if (policy === "release" && PACK.review !== "APPROVED")
  throw new Error("内容包尚未通过教研审核");
validateStory();
for (const a of [...IMAGES, ...AUDIO].filter((a) => a.path)) {
  const data = readFileSync(new URL(`../public/${a.path}`, import.meta.url));
  if (
    data.byteLength !== a.bytes ||
    createHash("sha256").update(data).digest("hex") !== a.sha256 ||
    !matchesFormat(data, a.type)
  )
    throw new Error(`资源内容不匹配 ${a.id}`);
}
console.log(
  `${policy}: resource bytes, hashes, formats, references and story path verified. Browser interaction and image recovery are verified separately. This is not teaching approval.`,
);
