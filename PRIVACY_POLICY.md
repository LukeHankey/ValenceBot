# Privacy Policy

Last updated: November 21, 2026

By using our Bot, you agree that you have read and agree to this policy.

This is our "Privacy Policy" which sets out the policy which governs our use of information you provide in connection with the Valence Bot. The terms "you" and "your" refer to all individuals or entities accessing the Valence Bot. The terms "we," "us," "our," refer to Valence Team and "bot" refers to our Discord bot itself.

We may update this Privacy Policy from time to time. Changes in our Privacy Policy will be effective immediately. If you are a regular user of the bot, we recommend that you check this Privacy Policy on a regular basis. By using the bot, you consent to the collection, use and transfer of your information in accordance with this Privacy Policy. If you do not agree to this Privacy Policy, please do not use this bot.

## PRIVACY STATEMENT

We respect the privacy of your information. This policy describes what the bot reads, what it stores, how long it keeps it, and how to have it removed.

This policy applies to the Valence Bot, to its companion bot **DSFMessaging**, and to the Alt1 Toolkit application, the DSF Event Tracker (<https://dsfeventtracker.com>). All three share the same database. In this policy, "the bots" means Valence Bot and DSFMessaging together.

## WHAT THE BOTS READ

The bots read the content of messages in two situations only:

1. **DSFMessaging, in the Deep Sea Fishing event-call channel.** DSFMessaging is a separate bot that exists only in the Deep Sea Fishing server, and it reads every message in that server's event-call channel, because the messages *are* the feature. Players report events by typing a short call such as `wp 84` or `sm 172 1:30`, and the bot has to read that text to work out which event is on which world and how long is left. This includes event reports posted there by the Alt1 Toolkit.
2. **Valence Bot, in direct messages sent to it.** If you DM Valence Bot, the message is forwarded to a channel read by the bot's maintainers so they can reply.

Valence Bot does not read messages in servers. Its commands are Discord slash commands: the bot receives only what you choose to enter into a command's options, not your messages. If you do not post in the Deep Sea Fishing event-call channel and do not DM Valence Bot, neither bot reads any message content of yours.

Neither bot uses the Server Members intent or the Presence intent. They cannot see your presence, your status, or your activity.

## WHAT WE STORE, AND FOR HOW LONG

**Event call text — kept in the database only while the event is running.** When you report an event, DSFMessaging stores the text of that message, its message ID, its timestamp, and your user ID and display name. It needs these to recognise a second call for a world already reported, and to find your message again to mark it with a skull when the event ends. **This database entry is deleted when the event's timer completes**, which is between roughly two and ten minutes after the call depending on the event type.

**Call text in staff log channels.** If a call is deleted, or is flagged as a problem (for example a duplicate call, a call for the wrong world, or spam), the bot posts a record of it, including its text, your user ID and the time, to the Deep Sea Fishing staff's log channels on Discord. Those are ordinary Discord messages, kept until the staff delete them.

**Scout profiles — kept until removal is requested.** For players who report events we keep a profile containing: your Discord user ID, your display name at the time of your last report, how many events you have reported through Discord and through the Alt1 app, when you first and last reported an event, whether you are currently active, and which scouter roles you hold. These counts are what the community's scouter ranks are based on, which is why they are kept rather than expired.

**Warnings on a scout profile.** If a Deep Sea Fishing moderator flags one of your calls (for example by timing you out or marking a call as being for a foreign world), the text of that call, when it was posted, and which action was taken are added to your profile as a warning. **This is the only case in which a profile contains something you wrote.** Warnings are kept with the profile until removal is requested.

**Sign-in tokens.** If you sign in to the Alt1 Toolkit app with Discord, we store the resulting session token so the app can stay signed in, and your Discord role IDs so the app knows which features to show you. Signing out removes the token.

**Server settings.** Per-server configuration set by administrators: which channels the bot uses, which roles count as admin and mod, which roles members may not give themselves, and similar.

**Command usage counts.** How many times each command has been used across all servers, and when each was last used. These are totals only and are not linked to individual users.

## WHAT WE DO WITH IT

We use this information to run the features described above and for nothing else. Specifically:

- We do **not** sell, rent or trade your information.
- We do **not** use message content, or any other data we hold, to train machine learning or AI models.
- We do **not** use your information for advertising.
- We do not share your information with third parties, except where we are required to by law.

The data is held in a MongoDB database controlled by us. Access is limited to the bot's maintainers.

## THIRD-PARTY SERVICES

The bot runs on Discord, and your use of Discord is governed by [Discord's own Privacy Policy](https://discord.com/privacy). Some messages the bot sends contain links to third-party websites, which we do not control and whose privacy practices are their own.

## YOUR CHOICES

- **You can opt out entirely, at any time.** Run `/privacy optout`. From then on DSFMessaging ignores your messages in the event-call channel completely: nothing you post there is read, stored or counted, no reactions are added, and no event timer is started. The trade-off is that calls you make will not be tracked and will not credit your scout profile, because storing the call text is what makes duplicate detection and the expiry marker work. `/privacy optin` reverses it, and `/privacy status` shows your current choice.
- **You control what the bots read about you.** Posting a call in the Deep Sea Fishing event-call channel, or sending Valence Bot a DM, is what causes a bot to read a message of yours. Doing neither means they read nothing.
- **You can ask for your data to be deleted.** Contact a server administrator or the bot's maintainers via Discord and we will remove your scout profile, including any warnings on it, and any associated data. Note that this also removes your reported-event counts and any scouter rank based on them. Records already posted to staff log channels are Discord messages, which the server's staff can delete.
- **You can sign out of the Alt1 app** at any time from its settings, which removes the stored session token.

## CHANGES TO OUR PRIVACY POLICY

It is our policy to post any changes we make to our privacy policy on this page. The date the privacy policy was last revised is identified at the top of the page. Your continued use of the bot after we make changes is deemed to be acceptance of those changes, so please check the policy periodically for updates.

## CONTACT INFORMATION

To ask questions or comment about this Privacy Policy and our privacy practices, or to request deletion of your data, please contact us via Discord.
