import { logger } from '../logging.js'

/**
 * How often each command is used, and when it was last used.
 *
 * The counts live in `Settings._id: 'Globals'` under `commands.<name>`, and are
 * what tells us whether a command is worth keeping — the merchant `stock`
 * command and `vis` were both retired on the strength of them.
 *
 * Two things were missing. Slash commands were never counted: the counter sat
 * in messageCreate behind `if (!command.run) return`, which skips anything
 * without a prefix handler, so a command used only as a slash command looked
 * unused. And nothing recorded *when*, so an all-time total could not tell
 * steady light use from heavy use that stopped years ago. `commandsLastUsed`
 * is a sibling map rather than a reshape of `commands`, so the existing counts
 * keep their shape.
 */

export const GLOBALS_ID = 'Globals'

/** Mongo reads a dot as a path separator, so a name with one could write anywhere. */
const isStorableName = (name) => typeof name === 'string' && name.length > 0 && !name.includes('.') && !name.startsWith('$')

/**
 * The filter and update for one use of a command.
 *
 * `$inc` creates the field when it is missing, so the old two-step — update
 * where the field exists, then `$set` it to 1 when nothing matched — was never
 * needed, and left a window where two uses at once could both write 1.
 */
export const usageUpdate = (name, when) => ({
	filter: { _id: GLOBALS_ID },
	update: {
		$inc: { [`commands.${name}`]: 1 },
		$set: { [`commandsLastUsed.${name}`]: when }
	}
})

/**
 * Record one use of a command.
 *
 * Never throws: the command has already run by this point, and failing to
 * count it is not worth reporting an error to the user for.
 */
export const recordCommandUse = async (settings, name, when = new Date()) => {
	if (!isStorableName(name)) {
		logger.warn(`Refusing to record usage for an unusable command name: ${name}`)
		return
	}

	const { filter, update } = usageUpdate(name, when)

	try {
		await settings.updateOne(filter, update)
	} catch (error) {
		logger.error(`Could not record usage of ${name}: ${error.message}`)
	}
}
