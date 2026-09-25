import { JSX, Show, splitProps } from "solid-js";

import type { ForumTag } from "stoat.js";
import { styled } from "styled-system/jsx";

import { CustomEmoji, UnicodeEmoji } from "@revolt/markdown/emoji";
import { typography } from "@revolt/ui";

/**
 * Custom emoji ids are ULIDs
 */
const RE_EMOJI_ID = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/**
 * Emoji of a forum tag or default reaction, custom or unicode
 */
export function TagEmoji(props: { emoji: string }) {
  return (
    <Show
      when={RE_EMOJI_ID.test(props.emoji)}
      fallback={<UnicodeEmoji emoji={props.emoji} />}
    >
      <CustomEmoji id={props.emoji} />
    </Show>
  );
}

/**
 * Forum tag chip
 */
export function ForumTagChip(
  props: {
    tag: ForumTag;
    selected?: boolean;
    onClick?: () => void;
  } & Omit<JSX.HTMLAttributes<HTMLSpanElement>, "onClick">,
) {
  const [local, remote] = splitProps(props, ["tag", "selected", "onClick"]);

  return (
    <Chip
      {...remote}
      selected={local.selected}
      clickable={!!local.onClick}
      onClick={(e) => {
        if (local.onClick) {
          e.stopPropagation();
          e.preventDefault();
          local.onClick();
        }
      }}
    >
      <Show when={local.tag.emoji}>
        <TagEmoji emoji={local.tag.emoji!} />
      </Show>
      {local.tag.name}
    </Chip>
  );
}

const Chip = styled("span", {
  base: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    height: "24px",
    paddingInline: "var(--gap-md)",
    borderRadius: "var(--borderRadius-full)",
    userSelect: "none",
    background: "var(--md-sys-color-surface-container-highest)",
    color: "var(--md-sys-color-on-surface-variant)",
    ...typography.raw({ class: "label", size: "medium" }),

    "& img": {
      width: "14px !important",
      height: "14px !important",
    },
  },
  variants: {
    selected: {
      true: {
        background: "var(--md-sys-color-primary)",
        color: "var(--md-sys-color-on-primary)",
      },
    },
    clickable: {
      true: {
        cursor: "pointer",
      },
    },
  },
});
