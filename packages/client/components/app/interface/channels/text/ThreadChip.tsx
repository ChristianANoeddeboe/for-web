import { Show, createSignal, onMount } from "solid-js";

import { Plural } from "@lingui-solid/solid/macro";
import { Message } from "stoat.js";
import { styled } from "styled-system/jsx";
import { decodeTime } from "ulid";

import { useClient } from "@revolt/client";
import { TextWithEmoji } from "@revolt/markdown";
import { Time } from "@revolt/ui";
// Imported directly: this module is evaluated before @revolt/ui initialises
import { typography } from "@revolt/ui/components/design/Text";
import { Symbol } from "@revolt/ui/components/utils/Symbol";

/**
 * Link to the thread started from a message
 */
export function ThreadChip(props: { message: Message }) {
  const client = useClient();
  const [hidden, setHidden] = createSignal(false);

  const thread = () => client().channels.get(props.message.id);

  onMount(() => {
    if (!thread()) {
      // private threads we can't see return 403
      client()
        .channels.fetch(props.message.id)
        .catch(() => setHidden(true));
    }
  });

  return (
    <Show when={!hidden() && thread()}>
      <Chip href={thread()!.path}>
        <Symbol size={18}>forum</Symbol>
        <Name>
          <TextWithEmoji content={thread()!.name!} />
        </Name>
        <Meta>
          <Plural
            value={thread()!.messageCount}
            one="# message"
            other="# messages"
          />
        </Meta>
        <Show when={thread()!.lastMessageId}>
          <Meta>
            <Time
              value={decodeTime(thread()!.lastMessageId!)}
              format="relative"
            />
          </Meta>
        </Show>
        <Symbol size={18}>chevron_right</Symbol>
      </Chip>
    </Show>
  );
}

const Chip = styled("a", {
  base: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-start",
    maxWidth: "100%",
    gap: "var(--gap-sm)",
    marginBlock: "var(--gap-xs)",
    padding: "var(--gap-sm) var(--gap-md)",
    borderRadius: "var(--borderRadius-md)",
    background: "var(--md-sys-color-surface-container-high)",
    color: "var(--md-sys-color-on-surface)",
    textDecoration: "none",

    "&:hover": {
      background: "var(--md-sys-color-surface-container-highest)",
      textDecoration: "none",
    },
  },
});

const Name = styled("span", {
  base: {
    ...typography.raw({ class: "label", size: "large" }),
    fontWeight: 600,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

const Meta = styled("span", {
  base: {
    ...typography.raw({ class: "label", size: "medium" }),
    color: "var(--md-sys-color-on-surface-variant)",
    whiteSpace: "nowrap",
  },
});
