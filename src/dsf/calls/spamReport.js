/**
 * The report posted to the admin log when a message in a call channel does not
 * look like a call.
 *
 * This was built inline in addCount, where it read `callChannel.name` directly.
 * `callChannel` comes from `client.channels.cache.get(otherChannelID)` and is
 * undefined whenever the channel is uncached, has been deleted, or the guild
 * has no event channel configured — addCount already guards for exactly that
 * further down. The template literal was evaluated before either guard, so an
 * uncached channel threw, no report was sent, and the caller's message was
 * never processed.
 */
export const buildSpamReport = ({ messageId, userId, username, content, timestamp, channelName, hasPostedBefore }) => {
	const posted = hasPostedBefore ? 'has posted before' : 'has not posted before'

	return [
		'```diff',
		`+ Spam Message ${messageId} - (User ${posted})`,
		'',
		`- User ID: <@!${userId}>`,
		`- User: ${username}`,
		`- Content: ${content}`,
		`- Timestamp: ${timestamp}`,
		`- Channel: ${channelName ?? 'unknown'}`,
		'```'
	].join('\n')
}
