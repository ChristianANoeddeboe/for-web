import {
  Component,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  on,
} from "solid-js";

import { Channel } from "stoat.js";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import { useDevice } from "@revolt/common";
import {
  Navigate,
  useNavigate,
  useParams,
  useSmartParams,
} from "@revolt/routing";

import { AgeGate } from "./AgeGate";
import { ForumChannel } from "./forum/ForumChannel";
import { TextChannel } from "./text/TextChannel";

/**
 * Channel layout
 */
const Base = styled("div", {
  base: {
    minWidth: 0,
    flexGrow: 1,
    display: "flex",
    position: "relative",
    flexDirection: "row",
  },
});

/**
 * Single channel view (the parent, or the thread panel)
 */
const Pane = styled("div", {
  base: {
    minWidth: 0,
    flexGrow: 1,
    display: "flex",
    position: "relative",
    flexDirection: "column",
  },
  variants: {
    panel: {
      true: {
        flexGrow: 0,
        flexShrink: 0,
        width: "480px",
        paddingLeft: "var(--gap-md)",
      },
    },
    full: {
      true: {
        flexGrow: 1,
        flexShrink: 1,
        width: "auto",
        paddingLeft: 0,
      },
    },
    hidden: {
      true: {
        display: "none",
      },
    },
  },
});

export interface ChannelPageProps {
  channel: Channel;
}

const TEXT_CHANNEL_TYPES: Channel["type"][] = [
  "TextChannel",
  "DirectMessage",
  "Group",
  "SavedMessages",
];

/**
 * Channel component
 */
export const ChannelPage: Component = () => {
  const params = useParams();
  const smartParams = useSmartParams();
  const navigate = useNavigate();
  const client = useClient();
  const { layout } = useDevice();
  const channel = createMemo(() => client()!.channels.get(params.channel)!);

  // Thread open in the side panel
  const threadId = () => smartParams().threadId;
  const thread = createMemo(() => {
    const id = threadId();
    const thread = id ? client().channels.get(id) : undefined;
    return thread?.parentId === params.channel ? thread : undefined;
  });

  const [expanded, setExpanded] = createSignal(false);

  // Archived threads are not part of the initial state, fetch them on demand
  createEffect(
    on(threadId, (id) => {
      if (id && !client().channels.has(id)) {
        client()
          .channels.fetch(id)
          .catch(() => navigate(channel()?.path ?? "/"));
      }
    }),
  );

  const fullThread = () => expanded() || layout() === "phone";

  return (
    <Base>
      <Switch fallback="Unknown channel type!">
        <Match when={!channel()}>
          <Navigate href={"../.."} />
        </Match>
        <Match when={channel()!.isThread}>
          <Navigate href={channel().path} />
        </Match>
        <Match
          when={
            TEXT_CHANNEL_TYPES.includes(channel()!.type) ||
            channel()!.type === "ForumChannel"
          }
        >
          <AgeGate
            enabled={channel().mature}
            contentId={channel().id}
            contentName={"#" + channel().name}
            contentType="channel"
          >
            <Pane hidden={!!thread() && fullThread()}>
              <Show
                when={channel().type === "ForumChannel"}
                fallback={<TextChannel channel={channel()} />}
              >
                <ForumChannel channel={channel()} />
              </Show>
            </Pane>
            <Show when={thread()} keyed>
              {(thread) => (
                <Pane panel full={fullThread()}>
                  <TextChannel
                    channel={thread}
                    threadPanel={{ expanded, setExpanded }}
                  />
                </Pane>
              )}
            </Show>
          </AgeGate>
        </Match>
      </Switch>
    </Base>
  );
};
