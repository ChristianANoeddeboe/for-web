/**
 * Client-side slash commands.
 *
 * Discord-style: typing "/" in the composer opens an autocomplete list of commands; selecting one
 * inserts it. Commands carry an optional client-side `apply` (a text expansion). When a command has
 * no `apply`, selecting it inserts `/name` as plain text so the message is still sent verbatim and
 * a bot (or a future backend interaction layer) can parse it.
 *
 * This is the first-pass, backend-free implementation. To grow it later: add entries here, or swap
 * this list for a server-provided one and add an interaction round-trip.
 */
export interface SlashCommand {
  /** Command name, without the leading slash. */
  name: string;
  /** Short description shown in the autocomplete popup (Discord-style). */
  description: string;
  /** Optional text inserted when the command is selected. Defaults to "/name " (pass-through). */
  apply?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "shrug",
    description: "Insert a shrug",
    apply: "¯\\_(ツ)_/¯",
  },
  {
    name: "tableflip",
    description: "Insert a table flip",
    apply: "(╯°□°）╯︵ ┻━┻",
  },
  {
    name: "unflip",
    description: "Put the table back",
    apply: "┬─┬ノ( º _ ºノ)",
  },
  {
    name: "lenny",
    description: "Insert a lenny face",
    apply: "( ͡° ͜ʖ ͡°)",
  },
  {
    name: "me",
    description: "Send an action message (kept as /me for bots to parse)",
  },
];

/**
 * Look up a command by the text after the leading slash.
 */
export function findSlashCommand(token: string): SlashCommand | undefined {
  return SLASH_COMMANDS.find((cmd) => cmd.name === token.trim());
}
