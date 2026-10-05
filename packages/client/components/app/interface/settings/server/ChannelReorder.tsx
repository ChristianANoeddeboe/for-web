import { For, Match, Switch } from "solid-js";
import { styled } from "styled-system/jsx";

import { Trans } from "@lingui-solid/solid/macro";
import type { API, Server } from "stoat.js";

import { Column, Text } from "@revolt/ui";
import {
  Draggable,
  createDragHandle,
} from "@revolt/ui/components/utils/Draggable";
import { Symbol } from "@revolt/ui/components/utils/Symbol";

/**
 * Ordered category data returned from the server (channels already materialised)
 */
type CategoryData = Omit<API.Category, "channels"> & { channels: ServerChannel[] };

type ServerChannel = import("stoat.js").Channel;

/**
 * Drag-and-drop channel / category reorder screen for Server Settings.
 *
 * Categories reorder via the outer drag list; channels reorder within their
 * category via the nested list. Every row has a drag-handle icon on the left.
 * Save mirrors the sidebar: server.edit({ categories }) with channel ids.
 */
export default function ChannelReorder(props: { server: Server }) {
  const orderedChannels = () => props.server.orderedChannels;

  /**
   * Normalise a category into the wire shape the API expects (channel ids).
   */
  const normalised = () =>
    orderedChannels().map((category) => ({
      ...category,
      channels: (category as CategoryData).channels.map((c) => c.id),
    }));

  /**
   * Reorder the categories themselves.
   */
  function reorderCategories(ids: string[]) {
    const byId = new Map(normalised().map((cat) => [cat.id, cat]));
    props.server.edit({
      categories: ids.map((id) => byId.get(id)!).filter((cat) => cat),
    });
  }

  /**
   * Reorder the channels inside a single category.
   */
  function reorderChannels(categoryId: string, channelIds: string[]) {
    props.server.edit({
      categories: normalised().map((category) =>
        category.id === categoryId
          ? { ...category, channels: channelIds }
          : category,
      ),
    });
  }

  return (
    <Column gap="lg">
      <Text class="body" size="small">
        <Trans>
          Drag the handles to reorder channels and categories. Order is saved as you go.
        </Trans>
      </Text>

      <Draggable
        type="settings-category"
        dragHandles
        items={orderedChannels()}
        onChange={reorderCategories}
      >
        {(entry) => (
          <CategoryRow
            category={entry.item}
            dragHandle={createDragHandle(
              entry.dragDisabled,
              entry.setDragDisabled,
            )}
            onReorder={(channelIds) =>
              reorderChannels(entry.item.id, channelIds)
            }
          />
        )}
      </Draggable>
    </Column>
  );
}

/**
 * A single category section: draggable header + draggable channel list.
 */
function CategoryRow(props: {
  category: CategoryData;
  dragHandle: ReturnType<typeof createDragHandle>;
  onReorder: (channelIds: string[]) => void;
}) {
  const isUncategorised = () => props.category.id === "default";

  return (
    <CategorySection>
      <CategoryHeader {...props.dragHandle}>
        <Symbol size={18}>drag_indicator</Symbol>
        {isUncategorised() ? (
          <Trans>Uncategorised</Trans>
        ) : (
          <span>{props.category.title}</span>
        )}
      </CategoryHeader>

      <Draggable
        type="settings-channels"
        dragHandles
        items={(props.category as CategoryData).channels}
        onChange={props.onReorder}
      >
        {(entry) => (
          <ChannelRow
            channel={entry.item}
            dragHandle={createDragHandle(
              entry.dragDisabled,
              entry.setDragDisabled,
            )}
          />
        )}
      </Draggable>
    </CategorySection>
  );
}

/**
 * Single channel row with a drag handle on the leftmost side.
 */
function ChannelRow(props: {
  channel: ServerChannel;
  dragHandle: ReturnType<typeof createDragHandle>;
}) {
  return (
    <ChannelBase {...props.dragHandle}>
      <Symbol size={18}>drag_indicator</Symbol>
      <ChannelTypeIcon channel={props.channel} />
      <span class="channel_name">{props.channel.name}</span>
    </ChannelBase>
  );
}

/**
 * Icon for a channel's type.
 */
function ChannelTypeIcon(props: { channel: ServerChannel }) {
  return (
    <Switch fallback={<Symbol size={18}>grid_3x3</Symbol>}>
      <Match when={props.channel.type === "ForumChannel"}>
        <Symbol size={18}>forum</Symbol>
      </Match>
      <Match when={props.channel.isVoice}>
        <Symbol size={18}>headset_mic</Symbol>
      </Match>
    </Switch>
  );
}

const CategorySection = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-sm)",
    padding: "var(--gap-sm)",
    borderRadius: "var(--borderRadius-sm)",
    background: "var(--md-sys-color-surface-container-low)",
  },
});

const CategoryHeader = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-sm)",
    padding: "0 var(--gap-sm)",
    cursor: "grab",
    userSelect: "none",
    fontWeight: 600,
    fontSize: "13px",
    textTransform: "uppercase",
    "&:hover": { opacity: 0.85 },
    "&:active": { cursor: "grabbing" },
  },
});

const ChannelBase = styled("div", {
  base: {
    display: "flex",
    alignItems: "center",
    gap: "var(--gap-sm)",
    padding: "var(--gap-sm) 0",
    cursor: "grab",
    userSelect: "none",
    borderRadius: "var(--borderRadius-sm)",
    "&:hover": {
      background: "var(--md-sys-color-surface-container-high)",
    },
    "&:active": { cursor: "grabbing" },

    "& .channel_name": {
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      minWidth: 0,
    },
  },
});