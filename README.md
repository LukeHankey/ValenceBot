# ValenceBot

Small Discord bot for the RuneScape Clan: [Valence](http://services.runescape.com/m=clan-home/clan/Valence)

Also currently working on adding more commands/functionality to the [Deep Sea Fishing](https://discord.gg/WhirlpoolDnD) Server

## Development

```bash
npm ci
npm test          # node --test, no framework
npm run format    # prettier, pinned in package.json
npm run dev       # NODE_ENV=DEV, uses DEVELOPMENT_BOT and the test guild
npm start         # production bot, uses BOT_TOKEN
```

`pre-commit` runs prettier and eslint. Prettier comes from `package.json` rather
than a mirrored copy, so a local run and CI agree.

## World registry

The member worlds and the special world groups (leagues, legacy, VIP, DSF…) are
not in code. They live in Mongo, in the `Settings` collection under
`_id: "WorldRegistry"`, shared with DSF-Server and the Alt1 client, and are
edited from Discord:

```
/worlds list                      every group, enabled state, world counts
/worlds show <world>              which lists a world is in, and its icons
/worlds enable|disable <key>      add or remove a group's worlds from play
/worlds set <key> <worlds>        replace a group's worlds — use for a new season
/worlds add|remove <key> <worlds> adjust a group
/worlds base add|remove <worlds>  edit the permanent base worlds
```

Worlds parse as lists and ranges: `13,142,211-219,261-298`.

Everything derived from that document updates with it, including **the call
regexes**. Before, valid league calls like `sm 172` were routed to the spam
channel because the regex had last season's worlds hardcoded. A new league
season is now `/worlds set leagues …` and nothing else.

Each mutation previews its real effect and waits for a confirmation click,
because removing a world from a group is not the same as removing it from the
member worlds — it may survive through another group.

## Misty tab window

The Alt1 Misty tab is Scouter-only by default. To open it to everyone signed in:

```
/misty open 48h Double XP weekend
/misty close
/misty status
```

This writes `_id: "ClientFeatures"`, which DSF-Server pushes to connected
clients. A duration shuts the window by itself.

## Scouter profiles

Profiles in `ScoutTracker` are **never deleted**. A six-hourly job marks them
`active: 0` when the member has left the server, or after a period of silence
(31 days for a plain profile, 90 for someone holding a scouter role). Their
counts are a record of what they did and matter if they come back.

Departed scouters are reported to the owners channel and everyone else to the
log channel, chunked to Discord's message limit, falling back to an attachment
when the batch is large.

## Deployment

Merging to `main` triggers a GitHub webhook to DSF-Server, which queues
`deploy.sh` on the host: it pulls `main` and rebuilds the container. Nothing
about the bot itself deploys it, so a failure shows up in
`journalctl -u valence-deploy-worker` rather than in GitHub.
