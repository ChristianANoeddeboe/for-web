import { Accessor, For, Setter, Show } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";
import { Channel } from "stoat.js";
import { css } from "styled-system/css";
import { styled } from "styled-system/jsx";

import { ThreadContextMenu } from "@revolt/app/menus/ThreadContextMenu";
import { useDevice } from "@revolt/common";
import { TextWithEmoji } from "@revolt/markdown";
import { useModals } from "@revolt/modal";
import { useNavigate } from "@revolt/routing";
import {
  Button,
  IconButton,
  NonBreakingText,
  Spacer,
  typography,
} from "@revolt/ui";
import { Symbol } from "@revolt/ui/components/utils/Symbol";

import { HeaderIcon } from "../common/CommonHeader";

import { ForumTagChip } from "./forum/ForumTagChip";

interface Props {
  /**
   * Thread to render header for
   */
  channel: Channel;

  /**
   * Whether the thread takes up the whole view
   */
  expanded: Accessor<boolean>;

  /**
   * Set whether the thread takes up the whole view
   */
  setExpanded: Setter<boolean>;
}

/**
 * Header of a thread or forum post
 */
export function ThreadHeader(props: Props) {
  const { t } = useLingui();
  const navigate = useNavigate();
  const { layout } = useDevice();
  const { openModal, showError } = useModals();

  const canAddMembers = () =>
    props.channel.private &&
    !props.channel.archived &&
    (props.channel.invitable || props.channel.havePermission("ManageChannel"));

  return (
    <>
      <HeaderIcon>
        <Symbol>{props.channel.isForumPost ? "forum" : "chat"}</Symbol>
      </HeaderIcon>
      <NonBreakingText
        class={typography({ class: "title", size: "medium" }) + " " + title}
      >
        <TextWithEmoji content={props.channel.name!} />
      </NonBreakingText>
      <Show when={props.channel.locked}>
        <Symbol size={16}>lock</Symbol>
      </Show>
      <Show when={props.channel.archived}>
        <Status>
          <Trans>Closed</Trans>
        </Status>
      </Show>
      <Show when={layout() !== "phone"}>
        <For each={props.channel.appliedTags}>
          {(tag) => <ForumTagChip tag={tag} />}
        </For>
      </Show>

      <Spacer />

      <Show when={!props.channel.joined && !props.channel.archived}>
        <Button
          size="sm"
          variant="tonal"
          onPress={() => props.channel.joinThread().catch(showError)}
        >
          <Show
            when={props.channel.isForumPost}
            fallback={<Trans>Join Thread</Trans>}
          >
            <Trans>Follow</Trans>
          </Show>
        </Button>
      </Show>

      <IconButton
        onPress={() =>
          openModal({ type: "thread_members", thread: props.channel })
        }
        use:floating={{
          tooltip: {
            placement: "bottom",
            content: t`Members`,
          },
        }}
      >
        <Symbol>group</Symbol>
      </IconButton>

      <Show when={canAddMembers()}>
        <IconButton
          onPress={() =>
            openModal({ type: "add_thread_member", thread: props.channel })
          }
          use:floating={{
            tooltip: {
              placement: "bottom",
              content: t`Add members`,
            },
          }}
        >
          <Symbol>person_add</Symbol>
        </IconButton>
      </Show>

      <IconButton
        use:floating={{
          tooltip: {
            placement: "bottom",
            content: t`More options`,
          },
          contextMenu: () => <ThreadContextMenu channel={props.channel} />,
          contextMenuHandler: "click",
        }}
      >
        <Symbol>more_horiz</Symbol>
      </IconButton>

      <Show when={layout() !== "phone"}>
        <IconButton
          onPress={() => props.setExpanded((value) => !value)}
          use:floating={{
            tooltip: {
              placement: "bottom",
              content: props.expanded() ? t`Show in side panel` : t`Expand`,
            },
          }}
        >
          <Symbol>
            {props.expanded() ? "close_fullscreen" : "open_in_full"}
          </Symbol>
        </IconButton>
      </Show>

      <IconButton
        onPress={() => navigate(props.channel.parent?.path ?? "..")}
        use:floating={{
          tooltip: {
            placement: "bottom",
            content: t`Close`,
          },
        }}
      >
        <Symbol>close</Symbol>
      </IconButton>
    </>
  );
}

const title = css({
  overflow: "hidden",
  textOverflow: "ellipsis",
});

/**
 * Closed (archived) indicator
 */
const Status = styled("span", {
  base: {
    flexShrink: 0,
    paddingInline: "var(--gap-sm)",
    borderRadius: "var(--borderRadius-full)",
    background: "var(--md-sys-color-surface-container-highest)",
    color: "var(--md-sys-color-on-surface-variant)",
    ...typography.raw({ class: "label", size: "small" }),
  },
});
