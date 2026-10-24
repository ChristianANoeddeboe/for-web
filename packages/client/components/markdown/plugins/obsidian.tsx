import { Handler } from "mdast-util-to-hast";
import { Plugin } from "unified";
import { visit } from "unist-util-visit";

/**
 * Obsidian-style markdown extensions for the web client.
 *
 * These transforms run on the mdast between remark-parse and remark-rehype,
 * mirroring how the existing mention/emoji plugins work. They add the parts of
 * Obsidian's flavour that plain GFM does not cover:
 *
 *  - Callouts: a `blockquote` whose first line is `> [!type]` (optionally with
 *    a title on the same line) becomes a rendered callout box.
 *  - Highlight: `==text==` renders as a highlighted inline span (`<mark>`).
 *
 * Math, strikethrough, tables and task-lists are already handled by remark-gfm
 * + remark-math, so the default renderer keeps its existing look.
 */

const RE_CALLOUT_HEADER =
  /^\[!(note|abstract|summary|tldr|info|todo|tip|hint|important|success|check|done|question|help|faq|warning|caution|attention|failure|fail|missing|danger|error|bug|example|quote)\](\s*(.*))?$/i;

const RE_HIGHLIGHT = /(==[^=\n]+==)/;

/** Turn `==text==` into custom `highlight` inline nodes. */
export const remarkObsidianHighlight: Plugin = () => (tree) => {
  visit(
    tree,
    "text",
    (
      node: { type: "text"; value: string },
      idx,
      parent: { children: unknown[] },
    ) => {
      const elements = node.value.split(RE_HIGHLIGHT);
      if (elements.length === 1) return; // no matches

      const newNodes = elements.map((value) =>
        value.startsWith("==")
          ? {
              type: "highlight",
              children: [{ type: "text", value: value.slice(2, -2) }],
            }
          : { type: "text", value },
      );

      parent.children.splice(idx, 1, ...newNodes);
      return idx + newNodes.length;
    },
  );
};

export const highlightHandler: Handler = (state, node) => ({
  type: "element" as const,
  tagName: "mark",
  properties: {
    className: ["md-highlight"],
  },
  children: state.all(node),
});

/**
 * Turn a `> [!type]` blockquote into an Obsidian callout.
 *
 * The first line of the blockquote carries the marker (`> [!warning]`) and an
 * optional title (`> [!warning] Disk almost full`). When it is present the
 * blockquote is rewritten into a custom `callout` node; otherwise the
 * blockquote renders exactly as before.
 */
export const remarkObsidianCallouts: Plugin = () => (tree) => {
  visit(tree, "blockquote", (node: { children: unknown[] }) => {
    if (!node.children.length) return;
    const first = node.children[0] as
      | { type: string; children?: unknown[] }
      | undefined;
    if (!first || first.type !== "paragraph") return;

    const textNode = (first.children?.[0] as { value?: string } | undefined)
      ?.value;
    if (!textNode) return;
    const match = textNode.match(RE_CALLOUT_HEADER);
    if (!match) return;

    // `match[1]` is the callout type; `match[3]` (trimmed) is the optional title.
    const calloutType = match[1]!.toLowerCase();
    const title = (match[3] ?? "").trim() || calloutType;

    // Drop the marker paragraph; if another paragraph follows on the first line
    // it stays, otherwise remove the whole first child.
    const rest = node.children as {
      type: string;
      children: { type: string; value?: string }[];
    }[];
    const trailing = first.children?.slice(1);
    const newChildren = [...(trailing?.filter(Boolean) ?? []), ...rest.slice(1)];

    const callout = {
      type: "callout" as const,
      calloutType,
      title,
      children: newChildren,
    };
    // Replace the blockquote node in place.
    (node as Record<string, unknown>).type = callout.type;
    (node as Record<string, unknown>).calloutType = callout.calloutType;
    (node as Record<string, unknown>).title = callout.title;
    (node as Record<string, unknown>).children = callout.children;
  });
};

export const calloutHandler: Handler = (state, node) => ({
  type: "element" as const,
  tagName: "div",
  properties: {
    className: ["md-callout", `md-callout-${node.calloutType ?? "note"}`],
    "data-callout": node.calloutType ?? "note",
  },
  children: [
    {
      type: "element" as const,
      tagName: "div",
      properties: { className: ["md-callout-title"] },
      children: state.one({ type: "text" as const, value: node.title }),
    },
    ...state.all(node),
  ],
});