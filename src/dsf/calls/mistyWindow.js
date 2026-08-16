/**
 * The Misty tab public window.
 *
 * The Alt1 Misty tab is normally Scouter-only. This is the switch that opens it
 * to any signed-in user for a while — a double XP weekend, an event, a quiet
 * spell where more eyes on world states helps.
 *
 * Stored as a ClientFeatures document in the Settings collection, which
 * DSF-Server watches with its change stream and pushes to connected clients.
 * The server treats an `until` in the past as closed, so a timed window shuts
 * itself and nobody has to remember the closing command.
 */

export const CLIENT_FEATURES_DOCUMENT_ID = 'ClientFeatures'

const UNITS = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 }

/** Windows longer than this are almost certainly a typo, not an intention. */
const MAX_DURATION_MS = 31 * UNITS.d

/** "48h", "3d", "90m" -> milliseconds. */
export const parseDuration = (input) => {
	const match = /^(\d+)\s*([mhd])$/i.exec((input ?? '').trim())
	if (!match) throw new Error(`\`${input}\` is not a duration. Use e.g. 90m, 48h or 3d.`)

	const amount = Number(match[1])
	const ms = amount * UNITS[match[2].toLowerCase()]
	if (ms <= 0) throw new Error('That duration is not long enough to be useful.')
	if (ms > MAX_DURATION_MS) throw new Error('That is longer than a month; open it for a shorter period.')

	return ms
}

/**
 * Build the window to store.
 *
 * Without a duration the window stays open until someone closes it, which is
 * deliberate: some occasions do not have a known end.
 */
export const buildWindow = ({ duration = null, reason = null, userId, close = false, now = new Date() } = {}) => {
	if (close) return { open: false, until: null, reason: null, setBy: userId }

	return {
		open: true,
		until: duration ? new Date(now.getTime() + parseDuration(duration)) : null,
		reason: reason ?? null,
		setBy: userId
	}
}

const isActive = (window) => {
	if (!window?.open) return false
	if (!window.until) return true
	return new Date(window.until).getTime() > Date.now()
}

/** A sentence describing the window, for the confirmation and for /misty status. */
export const describeWindow = (window) => {
	if (!isActive(window)) return 'The Misty tab is **closed** — Scouters only.'

	const reason = window.reason ? ` Reason: ${window.reason}.` : ''
	if (!window.until) return `The Misty tab is **open** to everyone signed in, until it is closed by hand.${reason}`

	const unix = Math.floor(new Date(window.until).getTime() / 1000)
	return `The Misty tab is **open** to everyone signed in until <t:${unix}:f> (<t:${unix}:R>).${reason}`
}
