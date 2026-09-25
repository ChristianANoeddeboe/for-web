import { For, Show } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { Channel, ThreadNotify } from "stoat.js";

import { useClient } from "@revolt/client";
import { useModals } from "@revolt/modal";
import { useState } from "@revolt/state";

import MdArchive from "@material-design-icons/svg/outlined/archive.svg?component-solid";
import MdBadge from "@material-design-icons/svg/outlined/badge.svg?component-solid";
import MdDelete from "@material-design-icons/svg/outlined/delete.svg?component-solid";
import MdLock from "@material-design-icons/svg/outlined/lock.svg?component-solid";
import MdLockOpen from "@material-design-icons/svg/outlined/lock_open.svg?component-solid";
import MdLogin from "@material-design-icons/svg/outlined/login.svg?component-solid";
import MdLogout from "@material-design-icons/svg/outlined/logout.svg?component-solid";
import MdMarkChatRead from "@material-design-icons/svg/outlined/mark_chat_read.svg?component-solid";
import MdPushPin from "@material-design-icons/svg/outlined/push_pin.svg?component-solid";
import MdSettings from "@material-design-icons/svg/outlined/settings.svg?component-solid";
import MdShare from "@material-design-icons/svg/outlined/share.svg?component-solid";
import MdUnarchive from "@material-design-icons/svg/outlined/unarchive.svg?component-solid";

import MdNotificationSettings from "@material-symbols/svg-400/outlined/notification_settings.svg?component-solid";
import MdRadioButtonChecked from "@material-symbols/svg-400/outlined/radio_button_checked-fill.svg?component-solid";
import MdRadioButtonUnchecked from "@material-symbols/svg-400/outlined/radio_button_unchecked.svg?component-solid";

import {
  ContextMenu,
  ContextMenuButton,
  ContextMenuDivider,
  ContextMenuSubMenu,
} from "./ContextMenu";

/**
 * Whether the current user may edit the basic properties of a thread
 * @param thread Thread
 * @param userId Current user id
 */
export function canEditThread(thread: Channel, userId?: string) {
  return (
    thread.havePermission("ManageChannel") ||
    (thread.ownerId === userId && !thread.locked)
  );
}

/**
 * Context menu for threads and forum posts
 */
export function ThreadContextMenu(props: { channel: Channel }) {
  const state = useState();
  const client = useClient();
  const { openModal, showError } = useModals();

  const manage = () => props.channel.havePermission("ManageChannel");
  const canEdit = () => canEditThread(props.channel, client().user?.id);

  /**
   * Current notification setting, with the default resolved
   */
  const notify = () => {
    const value = props.channel.threadNotify;
    return !value || value === "Default" ? "All" : value;
  };

  function copyLink() {
    navigator.clipboard.writeText(location.origin + props.channel.path);
  }

  return (
    <ContextMenu>
      <Show when={props.channel.unread}>
        <ContextMenuButton
          icon={MdMarkChatRead}
          onClick={() => props.channel.ack()}
        >
          <Trans>Mark as read</Trans>
        </ContextMenuButton>
        <ContextMenuDivider />
      </Show>

      <Show
        when={props.channel.joined}
        fallback={
          <ContextMenuButton
            icon={MdLogin}
            onClick={() => props.channel.joinThread().catch(showError)}
          >
            <Show
              when={props.channel.isForumPost}
              fallback={<Trans>Join thread</Trans>}
            >
              <Trans>Follow post</Trans>
            </Show>
          </ContextMenuButton>
        }
      >
        <ContextMenuSubMenu
          symbol={MdNotificationSettings}
          buttonContent={<Trans>Notifications</Trans>}
        >
          <For
            each={
              [
                ["All", <Trans>All messages</Trans>],
                ["Mentions", <Trans>Only @mentions</Trans>],
                ["None", <Trans>Nothing</Trans>],
              ] as [ThreadNotify, unknown][]
            }
          >
            {([value, label]) => (
              <ContextMenuButton
                onClick={() =>
                  props.channel.setThreadNotify(value).catch(showError)
                }
                actionSymbol={
                  notify() === value
                    ? MdRadioButtonChecked
                    : MdRadioButtonUnchecked
                }
              >
                {label as string}
              </ContextMenuButton>
            )}
          </For>
        </ContextMenuSubMenu>
        <ContextMenuButton
          icon={MdLogout}
          onClick={() => props.channel.leaveThread().catch(showError)}
        >
          <Show
            when={props.channel.isForumPost}
            fallback={<Trans>Leave thread</Trans>}
          >
            <Trans>Unfollow post</Trans>
          </Show>
        </ContextMenuButton>
      </Show>

      <Show when={canEdit()}>
        <ContextMenuDivider />
        <ContextMenuButton
          icon={MdSettings}
          onClick={() =>
            openModal({
              type: "settings",
              config: "channel",
              context: props.channel,
            })
          }
        >
          <Show
            when={props.channel.isForumPost}
            fallback={<Trans>Edit thread</Trans>}
          >
            <Trans>Edit post</Trans>
          </Show>
        </ContextMenuButton>
        <ContextMenuButton
          icon={props.channel.archived ? MdUnarchive : MdArchive}
          onClick={() =>
            props.channel
              .edit({ archived: !props.channel.archived })
              .catch(showError)
          }
        >
          <Show
            when={props.channel.archived}
            fallback={
              <Show
                when={props.channel.isForumPost}
                fallback={<Trans>Close thread</Trans>}
              >
                <Trans>Close post</Trans>
              </Show>
            }
          >
            <Show
              when={props.channel.isForumPost}
              fallback={<Trans>Open thread</Trans>}
            >
              <Trans>Open post</Trans>
            </Show>
          </Show>
        </ContextMenuButton>
      </Show>

      <Show when={manage()}>
        <ContextMenuButton
          icon={props.channel.locked ? MdLockOpen : MdLock}
          onClick={() =>
            props.channel
              .edit({ locked: !props.channel.locked })
              .catch(showError)
          }
        >
          <Show when={props.channel.locked} fallback={<Trans>Lock</Trans>}>
            <Trans>Unlock</Trans>
          </Show>
        </ContextMenuButton>
        <Show when={props.channel.isForumPost}>
          <ContextMenuButton
            icon={MdPushPin}
            onClick={() =>
              props.channel
                .edit({ pinned: !props.channel.pinned })
                .catch(showError)
            }
          >
            <Show
              when={props.channel.pinned}
              fallback={<Trans>Pin post</Trans>}
            >
              <Trans>Unpin post</Trans>
            </Show>
          </ContextMenuButton>
        </Show>
        <ContextMenuButton
          icon={MdDelete}
          destructive
          onClick={() =>
            openModal({
              type: "delete_channel",
              channel: props.channel,
            })
          }
        >
          <Show
            when={props.channel.isForumPost}
            fallback={<Trans>Delete thread</Trans>}
          >
            <Trans>Delete post</Trans>
          </Show>
        </ContextMenuButton>
      </Show>

      <ContextMenuDivider />
      <ContextMenuButton icon={MdShare} onClick={copyLink}>
        <Trans>Copy link</Trans>
      </ContextMenuButton>
      <Show when={state.settings.getValue("advanced:copy_id")}>
        <ContextMenuButton
          icon={MdBadge}
          onClick={() => navigator.clipboard.writeText(props.channel.id)}
        >
          <Trans>Copy channel ID</Trans>
        </ContextMenuButton>
      </Show>
    </ContextMenu>
  );
}
