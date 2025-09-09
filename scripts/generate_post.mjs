// scripts/generate_post.mjs

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function prompt(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(res => rl.question(q, res));
  rl.close();
  return answer.trim();
}

function slugify(s) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY env var.");
    process.exit(1);
  }

  const title = await prompt("Title: ");
  if (!title) {
    console.error("Title is required.");
    process.exit(1);
  }
  const outline = await prompt("Outline/notes (optional): ");
  const tagsInput = await prompt("Tags (comma-separated, optional): ");
  const tags = tagsInput ? tagsInput.split(",").map(s => s.trim()).filter(Boolean) : [];

  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(title);

  // ✅ Fixed path: put directly in src/content/blog/
  const outDir = path.join(process.cwd(), "src", "content", "blog");
  const outFile = path.join(outDir, `${slug}.md`);

  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  const system = `
You write Slovak Markdown blog posts for an Astro content collection.
Output MUST be valid Markdown with YAML frontmatter at the top.
Frontmatter fields: title, description (<=155 chars), date (YYYY-MM-DD), tags (array).
Target: critical thinking in practice for Slovakia.
Use H2/H3, short paragraphs, bullet points where useful.
No images, no emojis, no external commentary.
Language: Slovak.
Ensure the description length limit is respected.
`;

  const user = `
Title: ${title}

Outline/Notes:
${outline || "(none)"}

Tags: ${tags.join(", ")}
Date: ${date}
Slug: ${slug}
`;

  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  let md = resp.choices?.[0]?.message?.content?.trim() || "";
  if (!md.startsWith("---")) {
    const desc = "Článok o kritickom myslení v praxi.";
    const fm = [
      "---",
      `title: "${title.replace(/"/g, '\\"')}"`,
      `description: "${desc}"`,
      `date: "${date}"`,
      `tags: [${tags.map(t => `"${t.replace(/"/g, '\\"')}"`).join(", ")}]`,
      "---",
      ""
    ].join("\n");
    md = fm + md;
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, md, "utf8");
  console.log(`Created: ${path.relative(process.cwd(), outFile)}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
