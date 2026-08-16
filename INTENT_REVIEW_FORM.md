# Privileged Intent Request — final copy

Valence Bot, ID 668330399033851924. Deadline **9 September 2026**.
Paste each block into the matching field. Notes to you are in _italics_ and are not part of the answer.

---

## Application Details

> Valence Bot supports the Deep Sea Fishing community for RuneScape 3, centred on the Deep Sea Fishing Discord server and used in around 100 servers.
>
> Deep Sea Fishing is an in-game activity where random events — whirlpools, jellyfish, sea monsters, treasure turtles, whales and Arkaneo — appear on individual game worlds and last only a few minutes each. Players called scouts hop between worlds looking for these events and report what they find, so that everyone else can travel there in time. The bot exists to make that reporting fast and to keep track of it.
>
> **Reading event calls.** Scouts report an event by typing a short call into a channel the server has set aside for it: `wp 84` means a whirlpool on world 84, and `sm 172 1:30` means a sea monster on world 172 with one minute thirty seconds left. This shorthand is what the community already used before the bot existed. The bot reads that message and:
>
> - checks it is a genuine call for a world the community tracks, rejecting spam and repeats of a world someone has already called;
> - adds emoji reactions describing that world, so readers can see at a glance whether it is a members world, a legacy world, a quick chat world, has a total level requirement, or is part of the current league season;
> - starts a timer for however long the event has left and marks the message with a skull when it expires, so nobody travels to an event that has already finished;
> - credits the scout who reported it. Scouts have profiles tracking how many events they have reported, which is what the community's scouter ranks are based on. There are currently around 3,400 such profiles.
>
> **Relaying to our companion app.** Reported events are passed to our Alt1 Toolkit app, an overlay players run alongside the game: https://dsfeventtracker.com. Players who never open Discord still see the events scouts report.
>
> **Commands.** The bot also provides commands for scout profiles, the tracked world list, event calendars, support tickets and moderation. Fourteen of these are prefix commands and the rest are slash commands.

---

## Do you have a public Privacy Policy telling your users about their data usage?

**Yes**

URL: `https://github.com/LukeHankey/ValenceBot/blob/main/PRIVACY_POLICY.md`

_Update this before submitting — see "Before you submit" at the bottom._

---

## Privileged Gateway Intents

- [ ] Server Members Intent — _leave unticked; not requested and not used_
- [ ] Presence Intent — _leave unticked; not requested and not used_
- [x] **Message Content Intent**

---

## Can users opt out of having their message content data tracked?

**No**

> Message content is only read in two places: a channel the server administrator has specifically configured as the event-call channel, and messages that begin with the server's command prefix. A member who does not post a call and does not use a command has no message content read or stored by the bot. Posting a call in the call channel is itself the opt-in, and members who want no data held can ask a server administrator to have their scout profile removed.

_If you would rather answer "Yes", say so and I will add a per-user opt-out flag that skips counting and storage. That is a small change._

---

## Are you storing message content data off-platform (outside of Discord)?

**Yes**

> Yes, and only for as long as an event is running. While an event is live, the text of the call reporting it is held in our MongoDB database so the bot can recognise a duplicate call for the same world and can find the message again to mark it finished. The entry is deleted as soon as the event's timer completes, which is between two and ten minutes depending on the event type. At the time of writing the database holds no stored message content at all, because no event is currently running.
>
> Nothing else keeps message content. Scout profiles store counts and timestamps only — how many events someone has reported and when they were last active — never the text of what they wrote.

---

## Will the message content data be used to train machine learning or AI Models?

**No**

---

## Why do you need the Message Content intent?

> The bot's primary purpose is reading free-text event reports that players type into a dedicated channel, in a shorthand the community has used for years: `wp 84`, `sm 172 1:30`. From that raw text the bot works out which event has appeared, which game world it is on, and how long is left before it disappears.
>
> Everything the bot does follows from reading that text:
>
> - adding emoji reactions that describe the world the event is on;
> - timing the event and marking the call with a skull when it expires, so nobody travels to an event that has already ended;
> - rejecting spam and duplicate calls for a world someone has already reported;
> - crediting the scout who reported it, which is what the community's scouter ranks are based on;
> - relaying the event to our Alt1 Toolkit overlay app, so players who are in game rather than in Discord still see it.
>
> This cannot be done with slash commands. The entire value of the tool is that a scout reports an event in about a second while playing the game — two words typed into a channel, without breaking away from what they are doing. These events last only a few minutes, so any added friction means the event is over before anyone else can reach it. The shorthand also predates the bot: the bot reads what the community already types, rather than asking thousands of players to change a long-standing habit.
>
> Separately, fourteen of the bot's commands are prefix commands, which require message content to recognise.
>
> Message content is read only in the channel a server administrator has configured for event calls and in messages starting with the server's command prefix. It is stored only for the few minutes an event is live and then deleted.

---

## Please provide links to screenshots and/or videos that demonstrate your use case

_You need to supply this. A short screen recording of the call channel showing, in order:_

1. _a scout typing `wp 84`;_
2. _the bot adding its emoji reactions to that message;_
3. _the skull appearing when the event expires;_
4. _optionally, the Alt1 overlay showing the same event._

_Host it unlisted on YouTube or on Imgur and paste the link. A single video covering all four is stronger than separate screenshots, because it shows the sequence the intent is actually used for._

---

## Before you submit

1. **Update the privacy policy.** It is dated January 2024 and is generic boilerplate — it never mentions message content, what is stored, or for how long, which is exactly what a reviewer checks after you answer "Yes" to off-platform storage. It should say: which channels are read, that call text is held in MongoDB only while an event runs and is then deleted, that profiles hold counts and timestamps only, that data is neither sold nor used for training, and how to ask for deletion. I can draft it.
2. **Check the two answers marked with notes** — the opt-out answer, and the privacy policy URL once updated.
3. **Do not tick Server Members or Presence.** Requesting an intent you cannot demonstrate a use for risks the whole request.
