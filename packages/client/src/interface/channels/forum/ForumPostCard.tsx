import { For, Show, onMount } from "solid-js";

import { Channel } from "stoat.js";
import { cva } from "styled-system/css";
import { styled } from "styled-system/jsx";
import { decodeTime } from "ulid";

import { ThreadContextMenu } from "@revolt/app/menus/ThreadContextMenu";
import { useClient } from "@revolt/client";
import { TextWithEmoji } from "@revolt/markdown";
import { Avatar, Time, typography } from "@revolt/ui";
import { Symbol } from "@revolt/ui/components/utils/Symbol";

import { ForumTagChip } from "./ForumTagChip";

interface Props {
  /**
   * Forum post
   */
  post: Channel;

  /**
   * Whether this post is open in the side panel
   */
  active: boolean;

  /**
   * Render as a gallery tile
   */
  gallery: boolean;
}

/**
 * Card of a single forum post
 */
export function ForumPostCard(props: Props) {
  const client = useClient();

  /**
   * First message of the post (it has the post's id)
   */
  const message = () => client().messages.get(props.post.id);

  /**
   * First image attached to the first message
   */
  const image = () =>
    message()?.attachments?.find((file) => file.metadata.type === "Image")
      ?.previewUrl;

  /**
   * Time of the latest activity
   */
  const lastActivity = () =>
    decodeTime(props.post.lastMessageId ?? props.post.id);

  onMount(() => {
    if (!message()) {
      props.post.fetchMessage(props.post.id).catch(() => {});
    }
  });

  return (
    <a
      href={props.post.path}
      class={card({
        active: props.active,
        gallery: props.gallery,
        unread: props.post.unread,
      })}
      use:floating={{
        contextMenu: () => <ThreadContextMenu channel={props.post} />,
      }}
    >
      <Show when={props.gallery && image()}>
        <Thumbnail src={image()} loading="lazy" />
      </Show>
      <Body>
        <Tags>
          <Show when={props.post.pinned}>
            <Symbol size={16}>push_pin</Symbol>
          </Show>
          <Show when={props.post.locked}>
            <Symbol size={16}>lock</Symbol>
          </Show>
          <For each={props.post.appliedTags}>
            {(tag) => <ForumTagChip tag={tag} />}
          </For>
        </Tags>
        <Title>
          <TextWithEmoji content={props.post.name!} />
        </Title>
        <Show when={message()}>
          <Excerpt>
            <Author>
              {message()!.member?.nickname ??
                message()!.author?.displayName ??
                message()!.author?.username}
              :
            </Author>{" "}
            {message()!.contentPlain ||
              (message()!.attachments?.length ? "📎" : "")}
          </Excerpt>
        </Show>
        <Footer>
          <Symbol size={16}>chat_bubble</Symbol>
          {props.post.messageCount}
          <Dot />
          <Time value={lastActivity()} format="relative" />
          <Show when={props.post.joined}>
            <Dot />
            <Symbol size={16}>notifications</Symbol>
          </Show>
        </Footer>
      </Body>
      <Show when={!props.gallery && image()}>
        <SideImage src={image()} loading="lazy" />
      </Show>
      <Show when={!props.gallery && !image() && message()?.avatarURL}>
        <Avatar size={32} src={message()!.avatarURL} />
      </Show>
    </a>
  );
}

// Native element so that use:floating applies
const card = cva({
  base: {
    display: "flex",
    gap: "var(--gap-md)",
    padding: "var(--gap-md) var(--gap-lg)",
    borderRadius: "var(--borderRadius-lg)",
    background: "var(--md-sys-color-surface-container)",
    color: "var(--md-sys-color-on-surface)",
    textDecoration: "none",
    overflow: "hidden",
    transition: "var(--transitions-fast) background",

    "&:hover": {
      background: "var(--md-sys-color-surface-container-high)",
      textDecoration: "none",
    },
  },
  variants: {
    active: {
      true: {
        background: "var(--md-sys-color-secondary-container)",
        "&:hover": {
          background: "var(--md-sys-color-secondary-container)",
        },
      },
    },
    gallery: {
      true: {
        flexDirection: "column",
        padding: 0,
        "& > div": {
          padding: "var(--gap-md) var(--gap-lg)",
        },
      },
    },
    unread: {
      true: {
        "& h3": {
          fontWeight: 700,
        },
      },
      false: {
        "& h3": {
          color: "var(--md-sys-color-on-surface-variant)",
        },
      },
    },
  },
});

const Body = styled("div", {
  base: {
    minWidth: 0,
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-xs)",
  },
});

const Tags = styled("div", {
  base: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "var(--gap-xs)",
    "&:empty": {
      display: "none",
    },
  },
});

const Title = styled("h3", {
  base: {
    ...typography.raw({ class: "title", size: "medium" }),
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

const Excerpt = styled("div", {
  base: {
    ...typography.raw({ class: "body", size: "medium" }),
    color: "var(--md-sys-color-on-surface-variant)",
    lineClamp: 2,
    wordBreak: "break-word",
  },
});

const Author = styled("span", {
  base: {
    fontWeight: 600,
    color: "var(--md-sys-color-on-surface)",
  },
});

const Footer = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-sm)",
    ...typography.raw({ class: "label", size: "small" }),
    color: "var(--md-sys-color-on-surface-variant)",
  },
});

const Dot = styled("span", {
  base: {
    width: "3px",
    height: "3px",
    borderRadius: "50%",
    background: "currentColor",
  },
});

const Thumbnail = styled("img", {
  base: {
    width: "100%",
    aspectRatio: "16 / 9",
    objectFit: "cover",
  },
});

const SideImage = styled("img", {
  base: {
    flexShrink: 0,
    width: "72px",
    height: "72px",
    objectFit: "cover",
    borderRadius: "var(--borderRadius-md)",
  },
});
