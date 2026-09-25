import { For, Show, createMemo, createSignal, onMount } from "solid-js";

import { Plural, Trans } from "@lingui-solid/solid/macro";
import { Channel } from "stoat.js";
import { cva } from "styled-system/css";
import { styled } from "styled-system/jsx";
import { decodeTime } from "ulid";

import { ThreadContextMenu } from "@revolt/app/menus/ThreadContextMenu";
import { useClient } from "@revolt/client";
import { TextWithEmoji } from "@revolt/markdown";
import { useModals } from "@revolt/modal";
import { useSmartParams } from "@revolt/routing";
import { Button, Row, Text, Time, typography } from "@revolt/ui";
import { Symbol } from "@revolt/ui/components/utils/Symbol";

const PAGE_SIZE = 25;

/**
 * Browse the threads of a text channel
 */
export function TextThreadsSidebar(props: { channel: Channel }) {
  const client = useClient();
  const params = useSmartParams();
  const { openModal, showError } = useModals();

  const [tab, setTab] = createSignal<"active" | "archived">("active");
  const [archivedPrivate, setArchivedPrivate] = createSignal(false);
  const [archivedIds, setArchivedIds] = createSignal<string[]>([]);
  const [hasMore, setHasMore] = createSignal(false);
  const [loading, setLoading] = createSignal(false);

  onMount(() => props.channel.fetchActiveThreads().catch(showError));

  const active = createMemo(() =>
    props.channel.threads
      .filter((thread) => !thread.archived)
      .sort((a, b) =>
        (a.lastMessageId ?? a.id) < (b.lastMessageId ?? b.id) ? 1 : -1,
      ),
  );

  const joined = () => active().filter((thread) => thread.joined);
  const others = () => active().filter((thread) => !thread.joined);

  const archived = createMemo(() =>
    archivedIds()
      .map((id) => client().channels.get(id)!)
      .filter((thread) => thread?.archived),
  );

  /**
   * Fetch a page of archived threads
   * @param reset Start from the beginning
   */
  async function fetchArchived(reset: boolean) {
    setLoading(true);
    try {
      const last = reset ? undefined : archived()[archived().length - 1];
      const { threads, hasMore } = await props.channel.fetchArchivedThreads({
        private: archivedPrivate() || undefined,
        before: last?.archivedAt?.toISOString(),
        limit: PAGE_SIZE,
      });

      const ids = threads.map((thread) => thread.id);
      setArchivedIds((prev) => (reset ? ids : [...prev, ...ids]));
      setHasMore(hasMore);
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }

  function switchTab(value: "active" | "archived") {
    setTab(value);
    if (value === "archived") fetchArchived(true);
  }

  const canCreate = () =>
    props.channel.havePermission("CreatePublicThreads") ||
    props.channel.havePermission("CreatePrivateThreads");

  return (
    <Base>
      <Row justify="stretch">
        <Button
          group="connected-start"
          groupActive={tab() === "active"}
          onPress={() => switchTab("active")}
        >
          <Trans>Active</Trans>
        </Button>
        <Button
          group="connected-end"
          groupActive={tab() === "archived"}
          onPress={() => switchTab("archived")}
        >
          <Trans>Archived</Trans>
        </Button>
      </Row>

      <Show when={canCreate()}>
        <Button
          variant="tonal"
          onPress={() =>
            openModal({ type: "create_thread", channel: props.channel })
          }
        >
          <Symbol>add_comment</Symbol>
          <Trans>Create thread</Trans>
        </Button>
      </Show>

      <Show
        when={tab() === "active"}
        fallback={
          <>
            <Row justify="stretch">
              <Button
                size="sm"
                variant={archivedPrivate() ? "text" : "tonal"}
                onPress={() => {
                  setArchivedPrivate(false);
                  fetchArchived(true);
                }}
              >
                <Trans>Public</Trans>
              </Button>
              <Button
                size="sm"
                variant={archivedPrivate() ? "tonal" : "text"}
                onPress={() => {
                  setArchivedPrivate(true);
                  fetchArchived(true);
                }}
              >
                <Trans>Private</Trans>
              </Button>
            </Row>
            <List threads={archived()} activeId={params().threadId} />
            <Show when={!loading() && !archived().length}>
              <Empty>
                <Trans>No archived threads</Trans>
              </Empty>
            </Show>
            <Show when={hasMore()}>
              <Button
                variant="text"
                isDisabled={loading()}
                onPress={() => fetchArchived(false)}
              >
                <Trans>Load more</Trans>
              </Button>
            </Show>
          </>
        }
      >
        <Show when={joined().length}>
          <Text class="label">
            <Trans>Joined threads</Trans>
          </Text>
          <List threads={joined()} activeId={params().threadId} />
        </Show>
        <Show when={others().length}>
          <Text class="label">
            <Trans>Other active threads</Trans>
          </Text>
          <List threads={others()} activeId={params().threadId} />
        </Show>
        <Show when={!active().length}>
          <Empty>
            <Symbol size={48}>forum</Symbol>
            <Trans>There are no active threads</Trans>
          </Empty>
        </Show>
      </Show>
    </Base>
  );
}

/**
 * List of threads
 */
function List(props: { threads: Channel[]; activeId?: string }) {
  return (
    <Items>
      <For each={props.threads}>
        {(thread) => (
          <a
            href={thread.path}
            class={item({ active: thread.id === props.activeId })}
            use:floating={{
              contextMenu: () => <ThreadContextMenu channel={thread} />,
            }}
          >
            <Title unread={thread.unread}>
              <Show when={thread.private}>
                <Symbol size={16}>lock</Symbol>
              </Show>
              <TextWithEmoji content={thread.name!} />
            </Title>
            <Meta>
              <Plural
                value={thread.messageCount}
                one="# message"
                other="# messages"
              />
              {" · "}
              <Time
                value={decodeTime(thread.lastMessageId ?? thread.id)}
                format="relative"
              />
            </Meta>
          </a>
        )}
      </For>
    </Items>
  );
}

const Base = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-md)",
    padding: "0 var(--gap-md) var(--gap-md)",
  },
});

const Items = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-xs)",
  },
});

// Native element so that use:floating applies
const item = cva({
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    padding: "var(--gap-sm) var(--gap-md)",
    borderRadius: "var(--borderRadius-md)",
    background: "var(--md-sys-color-surface-container)",
    color: "var(--md-sys-color-on-surface)",
    textDecoration: "none",

    "&:hover": {
      background: "var(--md-sys-color-surface-container-high)",
      textDecoration: "none",
    },
  },
  variants: {
    active: {
      true: {
        background: "var(--md-sys-color-secondary-container)",
      },
    },
  },
});

const Title = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-xs)",
    ...typography.raw({ class: "label", size: "large" }),
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  variants: {
    unread: {
      true: { fontWeight: 700 },
      false: { color: "var(--md-sys-color-on-surface-variant)" },
    },
  },
});

const Meta = styled("div", {
  base: {
    ...typography.raw({ class: "label", size: "small" }),
    color: "var(--md-sys-color-on-surface-variant)",
  },
});

const Empty = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--gap-sm)",
    padding: "32px 0",
    color: "var(--md-sys-color-on-surface-variant)",
  },
});
