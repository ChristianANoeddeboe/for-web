import { Trans } from "@lingui-solid/solid/macro";
import { useMutation } from "@tanstack/solid-query";

import { useClient } from "@revolt/client";
import { Dialog, DialogProps } from "@revolt/ui";

import { useModals } from "..";
import { Modals } from "../types";

/**
 * Modal to delete a bot
 */
export function DeleteBotModal(
  props: DialogProps & Modals & { type: "delete_bot" },
) {
  const client = useClient();
  const { showError, mfaFlow } = useModals();

  const deleteBot = useMutation(() => ({
    mutationFn: async () => {
      const mfa = await client().account.mfa();
      // only prompt when the account actually has a method to confirm with;
      // cancelling the prompt must not fall through to deleting the bot
      if (mfa.availableMethods.length) {
        const ticket = await mfaFlow(mfa as never);
        if (!ticket) return;
      }
      await props.bot.delete(); // TODO: should use ticket in API
    },
    onSuccess: () => props.onClose(),
    onError: showError,
  }));

  return (
    <Dialog
      show={props.show}
      onClose={props.onClose}
      title={<Trans>Delete {props.bot.user!.displayName}?</Trans>}
      actions={[
        { text: <Trans>Cancel</Trans> },
        {
          text: <Trans>Delete</Trans>,
          onClick: () => deleteBot.mutateAsync(),
        },
      ]}
      isDisabled={deleteBot.isPending}
    >
      <Trans>Once it's deleted, there's no going back.</Trans>
    </Dialog>
  );
}
