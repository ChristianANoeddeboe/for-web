# DJ Channel — Web client + SDK implementation notes

Working branch: `feat/dj-channel` (web repo + `packages/stoat.js` submodule).

Backend contract (read from `/home/ollama/stoat/backend`, `dj-channel.md` v3):

| Route | Body / response |
| --- | --- |
| `POST /channels/{id}/dj/enable` | → `DjChannelState`, `ManageChannel` |
| `POST /channels/{id}/dj/disable` | → `DjChannelState`, `ManageChannel`, clears queue |
| `POST /channels/{id}/dj/join` | → `DjChannelState`, needs `Connect`; idempotent |
| `POST /channels/{id}/dj/leave` | → `204`, idempotent |
| `POST /channels/{id}/dj/queue?title=` | multipart `file`, needs membership + `UploadFiles` |
| `POST /channels/{id}/dj/skip` | → `DjChannelState`, idempotent per (track, user) |
| `GET  /channels/{id}/dj` | → `DjChannelState` (`ViewChannel`) |
| `PATCH /channels/{id}/dj/settings` | `DataEditDjSettings` → state, `ManageChannel` |
| `GET  /dj/{channel}/stream?token=` | `audio/mpeg`, single-byte `Range` → `206` |

`DjChannelState` = `{_id, current?, position_ms, server_time, queue[], votes, voters[], members[], settings}`.
`DjTrack` = `{id, file, title, duration_ms, uploader}`. `DjNowPlaying` = `{track, started_at}`.

Events (published to joined members' private topic only): `DjMemberJoined`,
`DjMemberLeft`, `DjTrackQueued`, `DjTrackStarted`, `DjNowPlaying`, `DjVote`,
`DjSkipped`, `DjTrackEnded`, `DjQueueCleared`, `DjUploadFailed`,
`DjSettingsUpdate`. `Ready.dj_states` = `[{_id, members[]}]`.

Only `DjTrackStarted` / `DjNowPlaying` carry `signed_url` (short TTL, re-signed
on the 15 s heartbeat) — neither `GET /channels/{id}/dj` nor `Ready` does. The
client therefore has to re-`join` (idempotent) when it mounts on a channel it is
already a member of, to obtain a playable URL without waiting up to 15 s.

## Plan

1. SDK: `lib/dj.ts` types + hydration, `client.djStates` (ReactiveMap, from
   `Ready.dj_states`), DJ event handling → `client.emit`, `Channel` helpers
   (`dj`, `isDj`, `djMemberCount`, enable/disable/join/leave/fetch/queue/skip/edit).
2. Web: sidebar headphones badge + member count for joinable DJ channels.
3. Web: DJ panel in the channel view — Join/Leave, now playing + progress,
   queue, skip vote; composer replaced by the upload control.
4. Web: `<audio>` unlocked synchronously in the Join click, seek to
   `position_ms` on state/TrackStarted/NowPlaying, 15 s heartbeat resync,
   stop on Leave/unmount.
5. Web: DJ settings panel, gated on `ManageChannel`.
