/** Shared CMS block types + HTML render (editor preview & public pages). */

export type Block =
  | { id: string; type: "heading"; text: string; level: 1 | 2 | 3 }
  | { id: string; type: "paragraph"; html: string }
  | { id: string; type: "image"; url: string; alt: string }
  | { id: string; type: "button"; label: string; href: string }
  | { id: string; type: "divider" }
  | { id: string; type: "quote"; text: string; cite?: string }
  | { id: string; type: "list"; ordered: boolean; items: string[] }
  | { id: string; type: "video"; url: string }
  | { id: string; type: "columns"; left: string; right: string }
  | { id: string; type: "callout"; text: string; tone: "info" | "warn" | "success" };

/** Loose shape for JSON that may include older paragraph { text } form. */
type RawBlock = {
  id?: string;
  type?: string;
  text?: string;
  html?: string;
  level?: number;
  url?: string;
  alt?: string;
  label?: string;
  href?: string;
  cite?: string;
  ordered?: boolean;
  items?: string[];
  left?: string;
  right?: string;
  tone?: string;
};

export function newId() {
  return Math.random().toString(36).slice(2, 11);
}

export function parseBlocks(body: string): Block[] {
  try {
    const j: unknown = JSON.parse(body);
    if (Array.isArray(j)) {
      return (j as RawBlock[]).map((raw): Block => {
        const id = typeof raw.id === "string" ? raw.id : newId();

        // migrate legacy paragraph { text } → { html }
        if (raw.type === "paragraph") {
          if (typeof raw.html === "string") {
            return { id, type: "paragraph", html: raw.html };
          }
          if (typeof raw.text === "string") {
            return { id, type: "paragraph", html: escapeHtml(raw.text).replace(/\n/g, "<br/>") };
          }
          return { id, type: "paragraph", html: "" };
        }

        if (raw.type === "heading") {
          const level = (raw.level === 1 || raw.level === 3 ? raw.level : 2) as 1 | 2 | 3;
          return { id, type: "heading", text: String(raw.text ?? ""), level };
        }
        if (raw.type === "image") {
          return { id, type: "image", url: String(raw.url ?? ""), alt: String(raw.alt ?? "") };
        }
        if (raw.type === "button") {
          return {
            id,
            type: "button",
            label: String(raw.label ?? "Button"),
            href: String(raw.href ?? "#"),
          };
        }
        if (raw.type === "divider") {
          return { id, type: "divider" };
        }
        if (raw.type === "quote") {
          return { id, type: "quote", text: String(raw.text ?? ""), cite: raw.cite };
        }
        if (raw.type === "list") {
          return {
            id,
            type: "list",
            ordered: Boolean(raw.ordered),
            items: Array.isArray(raw.items) ? raw.items.map(String) : [],
          };
        }
        if (raw.type === "video") {
          return { id, type: "video", url: String(raw.url ?? "") };
        }
        if (raw.type === "columns") {
          return {
            id,
            type: "columns",
            left: String(raw.left ?? ""),
            right: String(raw.right ?? ""),
          };
        }
        if (raw.type === "callout") {
          const tone =
            raw.tone === "warn" || raw.tone === "success" ? raw.tone : "info";
          return { id, type: "callout", text: String(raw.text ?? ""), tone };
        }

        // unknown → empty paragraph
        return { id, type: "paragraph", html: "" };
      });
    }
  } catch {
    /* plain text legacy */
  }
  if (!body?.trim()) return [];
  return [{ id: newId(), type: "paragraph", html: escapeHtml(body).replace(/\n/g, "<br/>") }];
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else if (u.hostname.includes("youtube.com")) id = u.searchParams.get("v") || "";
    if (!id) return null;
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return null;
  }
}

export function blocksToHtml(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading": {
          const t = `h${b.level}`;
          return `<${t}>${escapeHtml(b.text)}</${t}>`;
        }
        case "paragraph":
          return `<div class="cms-p">${b.html}</div>`;
        case "image":
          return `<img src="${escapeHtml(b.url)}" alt="${escapeHtml(b.alt)}" style="max-width:100%;height:auto;margin:1rem 0"/>`;
        case "button":
          return `<p><a href="${escapeHtml(b.href)}" style="display:inline-block;padding:10px 18px;background:var(--cms-primary,#1a2744);color:#fff;text-decoration:none">${escapeHtml(b.label)}</a></p>`;
        case "divider":
          return `<hr/>`;
        case "quote":
          return `<blockquote style="border-left:3px solid var(--cms-accent,#c9a227);padding-left:1rem;margin:1rem 0;font-style:italic">${escapeHtml(b.text)}${b.cite ? `<footer style="font-style:normal;opacity:.7;margin-top:.5rem">— ${escapeHtml(b.cite)}</footer>` : ""}</blockquote>`;
        case "list": {
          const tag = b.ordered ? "ol" : "ul";
          const items = b.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("");
          return `<${tag}>${items}</${tag}>`;
        }
        case "video": {
          const embed = youtubeEmbed(b.url);
          if (embed)
            return `<div style="position:relative;padding-bottom:56.25%;height:0;margin:1rem 0"><iframe src="${embed}" style="position:absolute;inset:0;width:100%;height:100%" frameborder="0" allowfullscreen></iframe></div>`;
          return `<p><a href="${escapeHtml(b.url)}">${escapeHtml(b.url)}</a></p>`;
        }
        case "columns":
          return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin:1rem 0"><div>${escapeHtml(b.left).replace(/\n/g, "<br/>")}</div><div>${escapeHtml(b.right).replace(/\n/g, "<br/>")}</div></div>`;
        case "callout": {
          const bg =
            b.tone === "warn" ? "#fff3cd" : b.tone === "success" ? "#d1e7dd" : "#e7f1ff";
          return `<div style="background:${bg};padding:1rem;border-radius:4px;margin:1rem 0">${escapeHtml(b.text)}</div>`;
        }
        default:
          return "";
      }
    })
    .join("\n");
}

/** Sanitize simple rich-text from contentEditable (bold/italic/links only). */
export function sanitizeBasicHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}
