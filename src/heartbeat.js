import { Status } from 'discord.js'

const CHECK_MS = 60_000
export const LIMIT_MS = 5 * 60_000

/**
 * True once the gateway has not been Ready for LIMIT_MS. A shard that is
 * stuck reconnecting never emits shardDisconnect, which is how ValenceBot sat
 * disconnected for five days in November 2026 with nothing logged.
 * Before login there are no shards, which counts as not Ready.
 */
export const isStale = (client, state, now) => {
	const shards = client.ws.shards
	if (shards.size > 0 && shards.every((shard) => shard.status === Status.Ready)) {
		state.since = null
		return false
	}
	state.since ??= now
	return now - state.since >= LIMIT_MS
}

/**
 * Alerts through a webhook, which is plain REST and works with the gateway
 * down, then exits so the container's restart policy brings the bot back.
 */
export const startHeartbeat = (client, name) => {
	const state = { since: null }
	setInterval(async () => {
		if (!isStale(client, state, Date.now())) return
		const content = `${name}: Discord gateway not Ready for ${Math.round((Date.now() - state.since) / 60_000)} min. Exiting so the container restarts.`
		client.logger.error(content)
		// ponytail: alerts on every restart while the outage lasts (about 12 an
		// hour). Persist the last alert time if that gets noisy.
		if (process.env.ALERT_WEBHOOK_URL) {
			try {
				await fetch(process.env.ALERT_WEBHOOK_URL, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ content }),
					signal: AbortSignal.timeout(10_000)
				})
			} catch (err) {
				client.logger.error(`Heartbeat alert failed: ${err.message}`)
			}
		} else {
			client.logger.error('ALERT_WEBHOOK_URL is not set; no alert sent.')
		}
		process.exit(1)
	}, CHECK_MS)
}
