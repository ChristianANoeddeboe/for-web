import { createFormControl, createFormGroup } from "solid-forms";
import { createMemo, createSignal, onMount } from "solid-js";

import { Trans, useLingui } from "@lingui-solid/solid/macro";

import { useClient } from "@revolt/client";
import {
  Avatar,
  Column,
  Dialog,
  DialogProps,
  Form2,
  Row,
  TextField,
} from "@revolt/ui";

import { useModals } from "..";
import { Modals } from "../types";

/**
 * Add server members to a private thread
 */
export function AddThreadMemberModal(
  props: DialogProps & Modals & { type: "add_thread_member" },
) {
  const { t } = useLingui();
  const client = useClient();
  const { showError } = useModals();

  const group = createFormGroup({
    users: createFormControl([] as string[], { required: true }),
  });

  onMount(() => props.thread.server?.syncMembers(true).catch(() => {}));

  async function onSubmit() {
    try {
      for (const user of group.controls.users.value) {
        await props.thread.addThreadMember(user);
      }

      props.onClose();
    } catch (err) {
      showError(err);
    }
  }

  const [filter, setFilter] = createSignal("");

  const filterLowercase = createMemo(() => filter().toLowerCase());

  const members = createMemo(() =>
    client()
      .serverMembers.filter(
        (member) =>
          member.id.server === props.thread.serverId &&
          member.id.user !== client().user?.id &&
          !member.user?.bot,
      )
      .map((member) => ({
        member,
        name: member.nickname ?? member.user?.displayName ?? member.id.user,
      }))
      .filter(({ name }) => name.toLowerCase().includes(filterLowercase()))
      .toSorted((a, b) => a.name.localeCompare(b.name))
      .map(({ member, name }) => ({
        item: { name, avatar: member.animatedAvatarURL },
        value: member.id.user,
      })),
  );

  const submit = Form2.useSubmitHandler(group, onSubmit);

  return (
    <Dialog
      minWidth={420}
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Add members to thread</Trans>}
      actions={[
        { text: <Trans>Close</Trans> },
        {
          text: <Trans>Add</Trans>,
          onClick: () => {
            onSubmit();
            return false;
          },
          isDisabled: !Form2.canSubmit(group),
        },
      ]}
      isDisabled={group.isPending}
    >
      <form onSubmit={submit}>
        <Column>
          <TextField
            value={filter()}
            variant="filled"
            placeholder={t`Search for members...`}
            onKeyUp={(e) => setFilter(e.currentTarget.value)}
          />

          <Form2.VirtualSelect
            items={members()}
            control={group.controls.users}
            multiple
          >
            {(item) => (
              <Row align>
                <Avatar src={item.avatar} fallback={item.name} size={24} />{" "}
                <span>{item.name}</span>
              </Row>
            )}
          </Form2.VirtualSelect>
        </Column>
      </form>
    </Dialog>
  );
}
