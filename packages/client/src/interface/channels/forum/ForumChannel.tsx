import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  on,
} from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import type { Channel, ForumLayout, ForumSortOrder } from "stoat.js";
import { styled } from "styled-system/jsx";

import { ContextMenu, ContextMenuButton } from "@revolt/app/menus/ContextMenu";
import { useClient } from "@revolt/client";
import { useModals } from "@revolt/modal";
import { useSmartParams } from "@revolt/routing";
import { Button, Header, IconButton, Text, main } from "@revolt/ui";
import { Symbol } from "@revolt/ui/components/utils/Symbol";

import MdRadioButtonChecked from "@material-symbols/svg-400/outlined/radio_button_checked-fill.svg?component-solid";
import MdRadioButtonUnchecked from "@material-symbols/svg-400/outlined/radio_button_unchecked.svg?component-solid";

import { ChannelHeader } from "../ChannelHeader";

import { ForumPostCard } from "./ForumPostCard";
import { ForumTagChip } from "./ForumTagChip";

const PAGE_SIZE = 25;

/**
 * Sort key of a post, newest first
 * @param post Post
 * @param sort Sort order
 */
function sortKey(post: Channel, sort: ForumSortOrder) {
  return sort === "LatestActivity" ? (post.lastMessageId ?? post.id) : post.id;
}

/**
 * Forum channel, lists its posts
 */
export function ForumChannel(props: { channel: Channel }) {
  const { t } = useLingui();
  const client = useClient();
  const params = useSmartParams();
  const { openModal, showError } = useModals();

  const [query, setQuery] = createSignal("");
  const [tags, setTags] = createSignal<string[]>([]);
  const [sort, setSort] = createSignal<ForumSortOrder>(
    props.channel.defaultSortOrder ?? "LatestActivity",
  );
  const [layout, setLayout] = createSignal<ForumLayout>(
    props.channel.defaultLayout ?? "List",
  );

  // Active posts we fetched (new ones arrive through events)
  const [activeIds, setActiveIds] = createSignal<string[]>([]);
  const [hasMoreActive, setHasMoreActive] = createSignal(false);

  // Closed posts, only fetched on demand
  const [showClosed, setShowClosed] = createSignal(false);
  const [closedIds, setClosedIds] = createSignal<string[]>([]);
  const [hasMoreClosed, setHasMoreClosed] = createSignal(false);

  const [loading, setLoading] = createSignal(false);

  // Reset view options when switching forum
  createEffect(
    on(
      () => props.channel.id,
      () => {
        setQuery("");
        setTags([]);
        setSort(props.channel.defaultSortOrder ?? "LatestActivity");
        setLayout(props.channel.defaultLayout ?? "List");
        setShowClosed(false);
      },
    ),
  );

  /**
   * Fetch a page of posts
   * @param archived Whether to fetch closed posts
   * @param after Last post of the previous page
   */
  async function fetchPage(archived: boolean, after?: Channel) {
    setLoading(true);
    try {
      const { threads, hasMore } = await props.channel.searchPosts({
        tags: tags().length ? tags() : undefined,
        sort: sort(),
        archived,
        before: after ? sortKey(after, sort()) : undefined,
        limit: PAGE_SIZE,
      });

      const ids = threads.map((thread) => thread.id);
      if (archived) {
        setClosedIds((prev) => (after ? [...prev, ...ids] : ids));
        setHasMoreClosed(hasMore);
      } else {
        setActiveIds((prev) => (after ? [...prev, ...ids] : ids));
        setHasMoreActive(hasMore);
      }
    } catch (error) {
      showError(error);
    } finally {
      setLoading(false);
    }
  }

  // Refetch whenever the filters change
  createEffect(
    on([() => props.channel.id, sort, tags], () => {
      fetchPage(false);
      if (showClosed()) fetchPage(true);
    }),
  );

  /**
   * Apply the local filters and ordering to a list of posts
   * @param posts Posts
   */
  function arrange(posts: Channel[]) {
    const search = query().trim().toLowerCase();
    const required = tags();

    return posts
      .filter(
        (post) =>
          (!search || post.name.toLowerCase().includes(search)) &&
          required.every((tag) => post.appliedTagIds.includes(tag)),
      )
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const x = sortKey(a, sort()),
          y = sortKey(b, sort());
        return x < y ? 1 : x > y ? -1 : 0;
      });
  }

  /**
   * Open posts, including ones created since we fetched
   */
  const activePosts = createMemo(() => {
    const posts = new Map<string, Channel>();
    for (const post of props.channel.threads) {
      if (!post.archived) posts.set(post.id, post);
    }

    return arrange([...posts.values()]);
  });

  /**
   * Closed posts
   */
  const closedPosts = createMemo(() =>
    arrange(
      closedIds()
        .map((id) => client().channels.get(id)!)
        .filter((post) => post?.archived),
    ),
  );

  // Posts that became visible through events are included in activePosts,
  // keep activeIds for paging only
  const lastActive = () => {
    const ids = activeIds();
    return client().channels.get(ids[ids.length - 1]);
  };

  function toggleTag(id: string) {
    setTags((prev) =>
      prev.includes(id) ? prev.filter((tag) => tag !== id) : [...prev, id],
    );
  }

  function newPost() {
    openModal({ type: "create_forum_post", channel: props.channel });
  }

  const canPost = () => props.channel.havePermission("CreatePublicThreads");

  return (
    <>
      <Header placement="primary">
        <ChannelHeader channel={props.channel} />
      </Header>
      <main class={main()}>
        <div use:scrollable={{ direction: "y", showOnHover: true }}>
          <Content>
            <Toolbar>
              <Search
                placeholder={t`Search posts by title`}
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
              />
              <Show when={canPost()}>
                <Button onPress={newPost}>
                  <Symbol>add_comment</Symbol>
                  <Trans>New Post</Trans>
                </Button>
              </Show>
            </Toolbar>

            <Toolbar>
              <TagList>
                <For each={props.channel.availableTags}>
                  {(tag) => (
                    <ForumTagChip
                      tag={tag}
                      selected={tags().includes(tag.id)}
                      onClick={() => toggleTag(tag.id)}
                    />
                  )}
                </For>
              </TagList>
              <IconButton
                use:floating={{
                  tooltip: { placement: "bottom", content: t`Sort & view` },
                  contextMenu: () => (
                    <ContextMenu>
                      <ContextMenuButton
                        onClick={() => setSort("LatestActivity")}
                        actionSymbol={
                          sort() === "LatestActivity"
                            ? MdRadioButtonChecked
                            : MdRadioButtonUnchecked
                        }
                      >
                        <Trans>Sort by recent activity</Trans>
                      </ContextMenuButton>
                      <ContextMenuButton
                        onClick={() => setSort("CreationDate")}
                        actionSymbol={
                          sort() === "CreationDate"
                            ? MdRadioButtonChecked
                            : MdRadioButtonUnchecked
                        }
                      >
                        <Trans>Sort by creation date</Trans>
                      </ContextMenuButton>
                      <ContextMenuButton
                        onClick={() => setLayout("List")}
                        actionSymbol={
                          layout() === "List"
                            ? MdRadioButtonChecked
                            : MdRadioButtonUnchecked
                        }
                      >
                        <Trans>List view</Trans>
                      </ContextMenuButton>
                      <ContextMenuButton
                        onClick={() => setLayout("Gallery")}
                        actionSymbol={
                          layout() === "Gallery"
                            ? MdRadioButtonChecked
                            : MdRadioButtonUnchecked
                        }
                      >
                        <Trans>Gallery view</Trans>
                      </ContextMenuButton>
                    </ContextMenu>
                  ),
                  contextMenuHandler: "click",
                }}
              >
                <Symbol>sort</Symbol>
              </IconButton>
            </Toolbar>

            <Show
              when={activePosts().length || loading()}
              fallback={
                <Empty>
                  <Symbol size={48}>forum</Symbol>
                  <Text class="title">
                    <Trans>There are no posts yet</Trans>
                  </Text>
                </Empty>
              }
            >
              <Posts gallery={layout() === "Gallery"}>
                <For each={activePosts()}>
                  {(post) => (
                    <ForumPostCard
                      post={post}
                      active={params().threadId === post.id}
                      gallery={layout() === "Gallery"}
                    />
                  )}
                </For>
              </Posts>
            </Show>

            <Show when={hasMoreActive()}>
              <Button
                variant="text"
                isDisabled={loading()}
                onPress={() => fetchPage(false, lastActive())}
              >
                <Trans>Load more</Trans>
              </Button>
            </Show>

            <Show
              when={showClosed()}
              fallback={
                <Button
                  variant="text"
                  onPress={() => {
                    setShowClosed(true);
                    fetchPage(true);
                  }}
                >
                  <Trans>Show closed posts</Trans>
                </Button>
              }
            >
              <Text class="label">
                <Trans>Closed posts</Trans>
              </Text>
              <Posts gallery={layout() === "Gallery"}>
                <For each={closedPosts()}>
                  {(post) => (
                    <ForumPostCard
                      post={post}
                      active={params().threadId === post.id}
                      gallery={layout() === "Gallery"}
                    />
                  )}
                </For>
              </Posts>
              <Show when={hasMoreClosed()}>
                <Button
                  variant="text"
                  isDisabled={loading()}
                  onPress={() => {
                    const ids = closedIds();
                    fetchPage(true, client().channels.get(ids[ids.length - 1]));
                  }}
                >
                  <Trans>Load more</Trans>
                </Button>
              </Show>
            </Show>
          </Content>
        </div>
      </main>
    </>
  );
}

const Content = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-md)",
    paddingBlock: "var(--gap-md)",
  },
});

const Toolbar = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-md)",
  },
});

const Search = styled("input", {
  base: {
    flexGrow: 1,
    minWidth: 0,
    height: "40px",
    paddingInline: "16px",
    borderRadius: "var(--borderRadius-full)",
    background: "var(--md-sys-color-surface-container-high)",
    color: "var(--md-sys-color-on-surface)",
  },
});

const TagList = styled("div", {
  base: {
    flexGrow: 1,
    display: "flex",
    flexWrap: "wrap",
    gap: "var(--gap-sm)",
  },
});

const Posts = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-sm)",
  },
  variants: {
    gallery: {
      true: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: "var(--gap-md)",
      },
    },
  },
});

const Empty = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "var(--gap-md)",
    padding: "64px 0",
    color: "var(--md-sys-color-on-surface-variant)",
  },
});
