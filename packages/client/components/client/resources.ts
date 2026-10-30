import { useQuery } from "@tanstack/solid-query";
import { User } from "stoat.js";

import type { BotUsage } from "@revolt/ui";

import { useClient } from ".";

/**
 * Create a new resource for current account's MFA configuration
 * @returns MFA configuration
 */
export function createMfaResource() {
  const client = useClient();

  return useQuery(() => ({
    queryKey: ["mfa", client().user!.id],
    queryFn: () => client().account.mfa(),
    throwOnError: true,
  }));
}

/**
 * Create a new resource for user profile
 * @param user User
 * @returns User profile resource
 */
export function createProfileResource(user: User) {
  return useQuery(() => ({
    queryKey: ["profile", user.id],
    queryFn: () => user!.fetchProfile(),
    throwOnError: true,
  }));
}

/**
 * Create a new resource for own user profile
 * @returns User profile resource
 */
export function createOwnProfileResource() {
  const client = useClient();
  return createProfileResource(client().user!);
}

/**
 * Create a new resource for own bots
 * @returns List of owned bots
 */
export function createOwnBotsResource() {
  const client = useClient();
  return useQuery(() => ({
    queryKey: ["bots", client().user!.id],
    queryFn: () => client().bots.fetchOwned(),
    throwOnError: true,
  }));
}

/**
 * Create a new resource for a bot's published usage limits
 *
 * Only the bot's owner may read this (`GET /bots/<id>`), so pass `undefined`
 * for anything else and the query stays disabled.
 *
 * @param botId Bot ID, or an accessor returning one
 * @returns Usage limits resource
 */
export function createBotUsageResource(botId: () => string | undefined) {
  const client = useClient();
  return useQuery(() => ({
    queryKey: ["bot", botId() ?? "", "usage"],
    queryFn: async (): Promise<BotUsage | undefined> => {
      const id = botId();
      if (!id) return undefined;
      const data = (await client().api.get(`/bots/${id}`)) as {
        bot?: { usage?: BotUsage };
      };
      return data?.bot?.usage;
    },
    enabled: !!botId(),
    throwOnError: false,
    staleTime: 60_000,
  }));
}
