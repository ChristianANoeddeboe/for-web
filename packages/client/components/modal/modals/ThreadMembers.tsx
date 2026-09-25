import { For, Show, createResource } from "solid-js";

import { Trans } from "@lingui-solid/solid/macro";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import { Avatar, Dialog, DialogProps, IconButton, Row, Text } from "@revolt/ui";
import { Symbol } from "@revolt/ui/components/utils/Symbol";

import { useModals } from "..";
import { Modals } from "../types";

/**
 * List the members of a thread
 */
export function ThreadMembersModal(
  props: DialogProps & Modals & { type: "thread_members" },
) {
  const client = useClient();
  const { showError } = useModals();

  const [members, { mutate }] = createResource(() =>
    props.thread.fetchThreadMembers().catch((error) => {
      showError(error);
      return [];
    }),
  );

  const canRemove = () =>
    props.thread.havePermission("ManageChannel") ||
    (props.thread.ownerId === client().user?.id && !props.thread.locked);

  async function remove(userId: string) {
    try {
      await props.thread.removeThreadMember(userId);
      mutate((prev) => prev?.filter((member) => member._id.user !== userId));
    } catch (error) {
      showError(error);
    }
  }

  return (
    <Dialog
      minWidth={380}
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Thread members</Trans>}
      actions={[{ text: <Trans>Close</Trans> }]}
    >
      <List>
        <For
          each={members()}
          fallback={
            <Show when={!members.loading}>
              <Text class="label">
                <Trans>Nobody has joined yet</Trans>
              </Text>
            </Show>
          }
        >
          {(member) => {
            const user = () => client().users.get(member._id.user);
            const serverMember = () =>
              client().serverMembers.getByKey({
                server: props.thread.serverId!,
                user: member._id.user,
              });

            const name = () =>
              serverMember()?.nickname ??
              user()?.displayName ??
              member._id.user;

            return (
              <Row align>
                <Avatar
                  src={serverMember()?.avatarURL ?? user()?.animatedAvatarURL}
                  fallback={name()}
                  size={32}
                />
                <Name>{name()}</Name>
                <Show
                  when={
                    canRemove() &&
                    member._id.user !== client().user?.id &&
                    member._id.user !== props.thread.ownerId
                  }
                >
                  <IconButton onPress={() => remove(member._id.user)}>
                    <Symbol>person_remove</Symbol>
                  </IconButton>
                </Show>
              </Row>
            );
          }}
        </For>
      </List>
    </Dialog>
  );
}

const List = styled("div", {
  base: {
    display: "flex",
    flexDirection: "column",
    gap: "var(--gap-sm)",
    maxHeight: "60vh",
    overflowY: "auto",
  },
});

const Name = styled("span", {
  base: {
    flexGrow: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});
