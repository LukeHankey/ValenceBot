# Discord Privileged Intent Review — draft answers

Deadline: **9 September 2026**. App: Valence Bot, ID 668330399033851924.

## Finding: you need exactly one intent, and you already only request one

`src/index.js` declares:

```js
intents: ['Guilds', 'GuildMessages', 'MessageContent', 'GuildMessageReactions', 'DirectMessages']
```

- **Server Members Intent** — not requested, not needed. `partitionByMembership`
  fetches members by explicit user id, which does not require the privileged
  intent (that is only needed to request the *whole* member list). Leave unticked.
- **Presence Intent** — not requested, not used anywhere. Leave unticked.
- **Message Content Intent** — requested, and genuinely required. Tick it.

This matches the form screenshot: only Message Content is ticked.

## Why Message Content is genuinely required

The bot's core feature is not a command — it is reading ordinary chat messages.

1. **Event calls.** In the DSF server's call channel, scouts type short free-text
   calls: `wp 84`, `sm 172`, `jf 99 1:30`. `messageCreate` → `dsf()` parses the
   raw text to extract the event type, the world number, and the time remaining.
   Without message content the bot cannot see any of this. Roughly 38 reads of
   `message.content` across 8 modules exist for this.
2. **World reactions.** The world number parsed from the text decides which emoji
   the bot reacts with (leagues, VIP, legacy, quick chat, 2600 total, etc.).
3. **Event timers.** The time in the message (`1:30`) sets how long the event has
   left before the bot marks it finished.
4. **Spam and duplicate filtering.** Content is checked against the guild's
   disallowed-words list, and against worlds already called, so duplicate and
   junk calls are not counted.
5. **Prefix commands.** 14 of 24 commands are prefix commands (`;dsf`, `;profile`,
   `;help`, `;raven`, `;lotto`…), which require reading message content.

A slash command cannot replace 1–4: the whole point is that scouts type a
two-word call at speed, mid-game, without the interaction UI. Requiring
`/call wp 84` would make the tool slower than the thing it replaces.

## Form answers

**Application Details**

> Valence Bot supports the Deep Sea Fishing (DSF) community for the game
> RuneScape 3, principally the "DSF" Discord server. Deep Sea Fishing is an
> in-game activity where random events (whirlpools, jellyfish, sea monsters,
> treasure turtles, whales, Arkaneo) spawn on individual game worlds and last
> only a few minutes. Players called scouts hop between worlds and report what
> they find so that everyone else can join in time.
>
> Scouts report events by typing a short call into a dedicated channel — for
> example `wp 84` (whirlpool on world 84) or `sm 172 1:30` (sea monster on world
> 172 with 1 minute 30 seconds left). The bot reads that message and:
>
> - validates it is a real call for a tracked world, rejecting spam and
>   duplicates of a world already called;
> - reacts with emoji describing that world (members-only, legacy, quick chat,
>   total-level requirement, current league worlds);
> - starts a timer for the event's remaining duration and marks the message with
>   a skull when it expires, so nobody travels to an event that has finished;
> - credits the scout in a profile system that tracks how many events they have
>   reported, which drives community scouter ranks;
> - relays the event to our companion Alt1 toolkit app, an overlay used by
>   players in game (https://dsfeventtracker.com).
>
> The bot also provides prefix and slash commands for profiles, world lists,
> tickets and moderation.

**Do you have a public Privacy Policy?** — Yes.
URL: https://github.com/LukeHankey/ValenceBot/blob/main/PRIVACY_POLICY.md
(See "Before you submit" below — this needs updating first.)

**Can users opt out of having their message content data tracked?**

Answer honestly. Today the accurate answer is **No** — there is no opt-out flag.
The mitigating facts, worth stating in the free-text box:

> Message content is only read in channels a server administrator has explicitly
> configured as the event-call channel, plus messages beginning with the server's
> command prefix. A user who does not post a call and does not use a prefix
> command has no message content read or stored. There is no separate opt-out
> flag; posting in the call channel is itself the opt-in.

If you would rather answer "Yes", say so and I will add a per-user opt-out that
skips counting and storage for anyone who sets it.

**Are you storing message content data off-platform?** — **Yes.**

> Yes, transiently. While an event is live, the call message's text is held in
> MongoDB (`eventChannel.otherMessages`) so the bot can detect duplicate calls
> for the same world and can find the message again to mark it finished. The
> entry is deleted as soon as the event's timer completes — typically within
> 2–10 minutes. As of this writing the collection holds 0 stored messages across
> both servers, because no event is currently running.
>
> Nothing else retains message content. Scout profiles store only counts and
> timestamps, never text.

**Will the message content data be used to train ML/AI models?** — **No.**

**Why do you need the Message Content intent?**

> Valence Bot's primary function is reading free-text event reports that players
> type into a dedicated channel, in a format the community has used for years:
> `wp 84`, `sm 172 1:30`. From that raw text the bot extracts the event type, the
> world number and the time remaining. That drives everything else it does:
> reacting with the emoji that describe that world, timing the event and marking
> it as finished when it expires, rejecting spam and duplicate calls, crediting
> the scout who reported it, and relaying the event to our companion Alt1 overlay
> app used in game.
>
> This cannot be done with slash commands. The value of the tool is that a scout
> reports an event in under a second while playing — the call is two words typed
> into a channel. Events last only a few minutes, so any added friction means the
> event is over before others can join. The `wp 84` format also predates the bot;
> the bot reads what the community already types.
>
> Additionally, 14 of the bot's 24 commands are prefix commands (`;dsf`,
> `;profile`, `;help`), which require message content to dispatch.
>
> Content is read only in the configured call channel and in messages starting
> with the server prefix. It is stored only for the few minutes an event is live,
> then deleted.

**Screenshots / video** — see below, you need to supply these.

## Before you submit

1. **Update the privacy policy.** It is dated January 2024 and is generic
   boilerplate — it never mentions message content, what is stored, or for how
   long. Discord reviewers look for exactly that. It should state: which channels
   are read, that call text is stored transiently in MongoDB and deleted when the
   event ends, that profiles hold counts only, that data is not sold or used for
   training, and how to request deletion. I can draft this.
2. **Capture the evidence.** Discord requires a link to screenshots or a video
   showing the use case working. Suggested — a short screen recording of the DSF
   call channel showing:
   - a scout typing `wp 84`;
   - the bot reacting with the world emoji;
   - the message being marked with a skull when the event expires;
   - optionally the Alt1 overlay receiving the same event.
   Host on Imgur/YouTube unlisted and paste the link.
3. **Do not tick Server Members or Presence.** You do not use them, and asking
   for intents you cannot justify invites rejection of the whole request.

## Deadline

Notified 11 June 2026, second warning 11 August 2026 ("29 days remaining").
Hard deadline **9 September 2026**; after that privileged intents are removed,
which would stop the bot seeing call text at all — the core feature.
