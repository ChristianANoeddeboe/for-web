import {
  Accessor,
  Match,
  Setter,
  Show,
  Switch,
  createEffect,
  createSignal,
  on,
  onCleanup,
} from "solid-js";

import { cva } from "styled-system/css";
import { styled } from "styled-system/jsx";
import { decodeTime, ulid } from "ulid";

import { DraftMessages, Messages } from "@revolt/app";
import { useClient } from "@revolt/client";
import { Keybind, KeybindAction, createKeybind } from "@revolt/keybinds";
import { useNavigate, useSmartParams } from "@revolt/routing";
import { useState } from "@revolt/state";
import {
  LAYOUT_SECTIONS,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from "@revolt/state/stores/Layout";
import {
  BelowFloatingHeader,
  Header,
  NewMessages,
  Text,
  TypingIndicator,
  main,
} from "@revolt/ui";
import { VoiceChannelCallCardMount } from "@revolt/ui/components/features/voice/callCard/VoiceCallCard";

import { ChannelHeader } from "../ChannelHeader";
import { ChannelPageProps } from "../ChannelPage";
import { ThreadHeader } from "../ThreadHeader";

import { Channel } from "stoat.js";
import { MessageComposition } from "./Composition";
import { MemberSidebar } from "./MemberSidebar";
import { TextSearchSidebar } from "./TextSearchSidebar";
import { TextThreadsSidebar } from "./TextThreadsSidebar";

/**
 * Minimum width (px) the message list keeps when the sidebar is resized
 */
const MIN_CHANNEL_WIDTH = 360;

/**
 * State of the channel sidebar
 */
export type SidebarState =
  | {
      state: "search";
      query: string;
    }
  | {
      state: "pins";
    }
  | {
      state: "threads";
    }
  | {
      state: "default";
    };

export function canIHasSidebar(ch: Channel) {
  return !["SavedMessages", "DirectMessage", "Thread"].includes(ch.type);
}

/**
 * Servers to not fetch all members for
 */
const LARGE_SERVERS = [
  "01F7ZSBSFHQ8TA81725KQCSDDP",
  "01G3PKD1YJ2H484MDX6KP9WRBN",
  // top servers on discover
  "01K313D0VP0HPNG30DNZ4Q672H",
  "01J31CCMTYKFPGCM13VRP3B289",
  "01H2Y4Y97PW6584PHN1TAVN5WR",
  "01HVKQBBQ3DQVVNK3M8DHXV30D",
  "01GDS83RMZW89AV0BZG24NEXYC",
  "01J5W0XERBBGK77BMDVPZJ20JW",
];

/**
 * Thread panel state, when rendering a thread next to its parent
 */
export interface ThreadPanelProps {
  expanded: Accessor<boolean>;
  setExpanded: Setter<boolean>;
}

/**
 * Channel component
 */
export function TextChannel(
  props: ChannelPageProps & { threadPanel?: ThreadPanelProps },
) {
  const state = useState();
  const client = useClient();

  // Last unread message id
  const [lastId, setLastId] = createSignal<string>();

  // Read highlighted message id from parameters
  const params = useSmartParams();
  const navigate = useNavigate();

  /**
   * Message id to be highlighted
   * @returns Message Id
   */
  const highlightMessageId = () =>
    props.channel.isThread ? params().threadMessageId : params().messageId;

  /**
   * Navigate to a message in this channel, or to the channel itself
   * @param messageId Message Id
   */
  const navigateTo = (messageId?: string) =>
    props.channel.isThread
      ? navigate(props.channel.path + (messageId ? `/${messageId}` : ""))
      : navigate(messageId ?? ".");

  const canConnect = () =>
    props.channel.isVoice && props.channel.havePermission("Connect");

  // Get a reference to the message box's load latest function
  let jumpToBottomRef: ((nearby?: string) => void) | undefined;

  const [atEnd, setEnd] = createSignal(true);

  // Store last unread message id
  createEffect(
    on(
      () => props.channel.id,
      (id) =>
        setLastId(
          props.channel.unread
            ? (client().channelUnreads.get(id)?.lastMessageId as string)
            : undefined,
        ),
    ),
  );

  // Mark channel as read whenever it is marked as unread
  createEffect(
    on(
      // must be at the end of the conversation
      () => props.channel.unread && atEnd(),
      (unread) => {
        if (unread) {
          if (document.hasFocus()) {
            // acknowledge the message
            props.channel.ack();
          } else {
            // otherwise mark this location as the last read location
            if (!lastId()) {
              // (taking away one second from the seed)
              setLastId(ulid(decodeTime(props.channel.lastMessageId!) - 1));
            }
          }
        }
      },
    ),
  );

  // Mark as read on re-focus
  function onFocus() {
    if (props.channel.unread && atEnd()) {
      props.channel.ack();
    }
  }

  document.addEventListener("focus", onFocus);
  onCleanup(() => document.removeEventListener("focus", onFocus));

  // Register ack/jump latest
  createKeybind(KeybindAction.CHAT_JUMP_END, () => {
    // Mark channel as read if not already
    if (props.channel.unread) {
      props.channel.ack();
    }

    // Clear the last unread id
    if (lastId()) {
      setLastId(undefined);
    }

    // Scroll to the bottom
    jumpToBottomRef?.();
  });

  // Sidebar scroll target
  let sidebarScrollTargetElement!: HTMLDivElement;

  // Sidebar state
  const [sidebarState, setSidebarState] = createSignal<SidebarState>({
    state: "default",
  });

  // Live drag width (px) while resizing; null when not dragging
  const [dragWidth, setDragWidth] = createSignal<number | null>(null);

  // Outer (non-scrolling) sidebar element, used to measure its right edge
  let sidebarOuterElement: HTMLDivElement | undefined;

  /**
   * Clamp a sidebar width to the allowed range, leaving room for the
   * message list so the sidebar can never squeeze the channel out of view.
   */
  const clampSidebarWidth = (width: number) => {
    const row = sidebarOuterElement?.parentElement;
    const available = row
      ? row.getBoundingClientRect().width - MIN_CHANNEL_WIDTH
      : SIDEBAR_MAX_WIDTH;
    const max = Math.max(
      SIDEBAR_MIN_WIDTH,
      Math.min(SIDEBAR_MAX_WIDTH, available),
    );
    return Math.round(Math.max(SIDEBAR_MIN_WIDTH, Math.min(max, width)));
  };

  // Effective sidebar width while the active sidebar is open
  const sidebarWidth = () =>
    dragWidth() ?? state.layout.getChannelSidebarWidth();

  // Teardown for an in-progress drag (if any)
  let stopSidebarDrag: (() => void) | undefined;
  onCleanup(() => stopSidebarDrag?.());

  /**
   * Begin resizing the sidebar from the drag handle (mouse, pen or touch)
   */
  const startSidebarDrag = (e: PointerEvent) => {
    if (e.button !== 0 || !sidebarOuterElement) return;
    e.preventDefault();

    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture?.(e.pointerId);

    // Anchor on the sidebar's right edge so gaps/padding don't skew the width
    const rightEdge = sidebarOuterElement.getBoundingClientRect().right;

    const onMove = (ev: PointerEvent) =>
      setDragWidth(clampSidebarWidth(rightEdge - ev.clientX));

    const finish = () => {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", finish);
      document.body.classList.remove("resizing");
      stopSidebarDrag = undefined;

      const w = dragWidth();
      if (w !== null) {
        state.layout.setChannelSidebarWidth(w);
        setDragWidth(null);
      }
    };

    stopSidebarDrag = finish;
    document.body.classList.add("resizing");
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", finish);
  };

  /**
   * Keyboard resizing for the drag handle (accessibility)
   */
  const onSidebarHandleKey = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 64 : 16;
    let next: number | undefined;
    if (e.key === "ArrowLeft") next = sidebarWidth() + step;
    else if (e.key === "ArrowRight") next = sidebarWidth() - step;
    else if (e.key === "Home") next = SIDEBAR_MIN_WIDTH;
    else if (e.key === "End") next = SIDEBAR_MAX_WIDTH;
    if (next === undefined) return;
    e.preventDefault();
    state.layout.setChannelSidebarWidth(clampSidebarWidth(next));
  };

  // todo: in the future maybe persist per ID?
  createEffect(
    on(
      () => props.channel.id,
      () => setSidebarState({ state: "default" }),
    ),
  );

  // If this is a server text channel, sync the members
  // todo: useQuery
  createEffect(
    on(
      () => props.channel.serverId,
      (serverId) =>
        props.channel.type === "TextChannel" &&
        props.channel.server?.syncMembers(
          LARGE_SERVERS.includes(serverId) ? true : false,
          200,
        ),
    ),
  );

  return (
    <>
      <Header placement="primary">
        <Show
          when={props.threadPanel}
          fallback={
            <ChannelHeader
              channel={props.channel}
              sidebarState={sidebarState}
              setSidebarState={setSidebarState}
            />
          }
        >
          <ThreadHeader
            channel={props.channel}
            expanded={props.threadPanel!.expanded}
            setExpanded={props.threadPanel!.setExpanded}
          />
        </Show>
      </Header>
      <Content>
        <main class={main()}>
          <Show
            when={canConnect()}
            fallback={
              <BelowFloatingHeader>
                <div>
                  <NewMessages
                    lastId={lastId}
                    jumpBack={() => navigateTo(lastId()!)}
                    dismiss={() => setLastId()}
                  />
                </div>
              </BelowFloatingHeader>
            }
          >
            <VoiceChannelCallCardMount channel={props.channel} />
          </Show>

          <Messages
            channel={props.channel}
            lastReadId={lastId}
            pendingMessages={(pendingProps) => (
              <DraftMessages
                channel={props.channel}
                tail={pendingProps.tail}
                sentIds={pendingProps.ids}
              />
            )}
            typingIndicator={
              <TypingIndicator
                users={props.channel.typing}
                ownId={client().user!.id}
              />
            }
            highlightedMessageId={highlightMessageId}
            clearHighlightedMessage={() => navigateTo()}
            jumpToBottomRef={(ref) => (jumpToBottomRef = ref)}
            atEnd={[atEnd, setEnd]}
          />

          <MessageComposition
            channel={props.channel}
            onMessageSend={() => jumpToBottomRef?.()}
          />
        </main>
        <Show
          when={
            (state.layout.getSectionState(
              LAYOUT_SECTIONS.MEMBER_SIDEBAR,
              true,
            ) &&
              canIHasSidebar(props.channel)) ||
            sidebarState().state !== "default"
          }
        >
          <div
            ref={sidebarOuterElement}
            class={sidebarOuter()}
            style={{
              width:
                sidebarState().state !== "default" ? `${sidebarWidth()}px` : "",
            }}
          >
            <Show when={sidebarState().state !== "default"}>
              <div
                class="sidebar-drag-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize sidebar"
                aria-valuemin={SIDEBAR_MIN_WIDTH}
                aria-valuemax={SIDEBAR_MAX_WIDTH}
                aria-valuenow={sidebarWidth()}
                tabIndex={0}
                title="Drag to resize, double-click to reset"
                onPointerDown={startSidebarDrag}
                onDblClick={() =>
                  state.layout.setChannelSidebarWidth(SIDEBAR_DEFAULT_WIDTH)
                }
                onKeyDown={onSidebarHandleKey}
              />
            </Show>
            <div
              ref={sidebarScrollTargetElement}
              use:scrollable={{
                direction: "y",
                showOnHover: true,
                class: sidebar(),
              }}
            >
              <Switch
                fallback={
                  <MemberSidebar
                    channel={props.channel}
                    scrollTargetElement={sidebarScrollTargetElement}
                    isLargeServer={LARGE_SERVERS.includes(
                      props.channel.serverId,
                    )}
                  />
                }
              >
                <Match when={sidebarState().state === "search"}>
                  <WideSidebarContainer>
                    <SidebarTitle>
                      <Text class="label" size="large">
                        Search Results
                      </Text>
                    </SidebarTitle>
                    <TextSearchSidebar
                      channel={props.channel}
                      query={{
                        query: (sidebarState() as { query: string }).query,
                      }}
                    />
                  </WideSidebarContainer>
                </Match>
                <Match when={sidebarState().state === "pins"}>
                  <WideSidebarContainer>
                    <SidebarTitle>
                      <Text class="label" size="large">
                        Pinned Messages
                      </Text>
                    </SidebarTitle>
                    <TextSearchSidebar
                      channel={props.channel}
                      query={{ pinned: true, sort: "Latest" }}
                    />
                  </WideSidebarContainer>
                </Match>
                <Match when={sidebarState().state === "threads"}>
                  <WideSidebarContainer>
                    <SidebarTitle>
                      <Text class="label" size="large">
                        Threads
                      </Text>
                    </SidebarTitle>
                    <TextThreadsSidebar channel={props.channel} />
                  </WideSidebarContainer>
                </Match>
              </Switch>

              <Show when={sidebarState().state !== "default"}>
                <Keybind
                  keybind={KeybindAction.CLOSE_SIDEBAR}
                  onPressed={() => setSidebarState({ state: "default" })}
                />
              </Show>
            </div>
          </div>
        </Show>
      </Content>
    </>
  );
}

/**
 * Main content row layout
 */
const Content = styled("div", {
  base: {
    display: "flex",
    flexDirection: "row",
    flexGrow: 1,
    minWidth: 0,
    minHeight: 0,
  },
});

/**
 * Base styles
 */
const sidebar = cva({
  base: {
    flexGrow: 1,
    minHeight: 0,
    width: "100%",
    borderRadius: "var(--borderRadius-lg)",
  },
});

/**
 * Outer (non-scrolling) sidebar wrapper; holds the resize handle so it stays
 * pinned while the sidebar content scrolls
 */
const sidebarOuter = cva({
  base: {
    flexShrink: 0,
    position: "relative",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    width: "var(--layout-width-channel-sidebar)",
  },
});

/**
 * Container styles
 */
const WideSidebarContainer = styled("div", {
  base: {
    paddingRight: "var(--gap-md)",
    width: "100%",
  },
});

/**
 * Sidebar title
 */
const SidebarTitle = styled("div", {
  base: {
    padding: "var(--gap-md)",
    color: "var(--md-sys-color-on-surface)",
  },
});
