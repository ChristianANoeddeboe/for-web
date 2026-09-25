import { Match, Show, Switch, onMount } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { Channel } from "stoat.js";
import { styled } from "styled-system/jsx";

import { UserMention } from "@revolt/markdown/plugins/mentions";

import { Text } from "../../../design";

import { MessageReply } from "./MessageReply";

interface Props {
  /**
   * Channel information
   */
  channel: Channel;
}

/**
 * Mark the beginning of a conversation
 */
export function ConversationStart(props: Props) {
  /**
   * Message a text channel thread was started from (it lives in the parent)
   */
  const starterMessage = () =>
    props.channel.isThread && !props.channel.isForumPost
      ? props.channel.starterMessage
      : undefined;

  onMount(() => {
    if (
      props.channel.isThread &&
      !props.channel.isForumPost &&
      !props.channel.starterMessage
    ) {
      props.channel.parent?.fetchMessage(props.channel.id).catch(() => {});
    }
  });

  return (
    <Base>
      <Show when={props.channel.type !== "SavedMessages"}>
        <Text class="headline" size="large">
          {props.channel.name ?? props.channel.recipient?.username}
        </Text>
      </Show>
      <Text class="title">
        <Switch
          fallback={<Trans>This is the start of your conversation.</Trans>}
        >
          <Match when={props.channel.type === "SavedMessages"}>
            <Trans>This is the start of your notes.</Trans>
          </Match>
          <Match when={props.channel.isThread}>
            <Trans>
              Started by <UserMention userId={props.channel.ownerId!} />
            </Trans>
          </Match>
        </Switch>
      </Text>
      <Show when={starterMessage() && !starterMessage()!.systemMessage}>
        <MessageReply message={starterMessage()} noDecorations />
      </Show>
    </Base>
  );
}

/**
 * Base styles
 */
const Base = styled("div", {
  base: {
    display: "flex",
    userSelect: "none",
    flexDirection: "column",
    gap: "var(--gap-sm)",
    margin: "18px 16px 10px 16px",

    color: "var(--md-sys-color-on-surface)",
  },
});
