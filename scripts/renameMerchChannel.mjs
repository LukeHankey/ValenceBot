/**
 * Rename Settings.merchChannel -> Settings.eventChannel.
 *
 * The travelling merchant was removed from the game, so the "merch channel"
 * name no longer describes anything. DSF-Server #85 reads `eventChannel.*` in
 * its change stream and its global-delete path, so this migration has to land
 * before that server change deploys — otherwise Discord calls stop reaching the
 * server and global deletes raise KeyError.
 *
 * Only the Settings collection is affected: two guild documents. Scouter
 * profiles (ScoutTracker) are untouched — their merchant counts are history and
 * are deliberately kept.
 *
 * Usage:
 *   node scripts/renameMerchChannel.mjs                      # dry run, all guilds
 *   node scripts/renameMerchChannel.mjs --guild 6683...      # dry run, one guild
 *   node scripts/renameMerchChannel.mjs --guild 6683... --apply
 *   node scripts/renameMerchChannel.mjs --rollback --apply   # eventChannel -> merchChannel
 */
import pkg from 'mongodb'
import dotenv from 'dotenv'

dotenv.config()
const { MongoClient } = pkg

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const rollback = args.includes('--rollback')
const guildIndex = args.indexOf('--guild')
const guild = guildIndex === -1 ? null : args[guildIndex + 1]

const from = rollback ? 'eventChannel' : 'merchChannel'
const to = rollback ? 'merchChannel' : 'eventChannel'

const client = new MongoClient(process.env.DB_URI, { compressors: ['snappy'] })

try {
	await client.connect()
	const settings = client.db('Members').collection('Settings')

	const filter = { [from]: { $exists: true }, ...(guild ? { _id: guild } : {}) }
	const matches = await settings.find(filter, { projection: { _id: 1, [from]: 1 } }).toArray()

	console.log(`${apply ? 'APPLYING' : 'DRY RUN'}: ${from} -> ${to}${guild ? ` for guild ${guild}` : ' (all guilds)'}`)
	if (!matches.length) {
		console.log('No documents to migrate. Nothing to do.')
		process.exit(0)
	}

	for (const doc of matches) {
		const keys = Object.keys(doc[from] ?? {})
		console.log(`  ${doc._id}: ${from} -> ${to}  (subkeys: ${keys.join(', ')})`)

		// Refuse to clobber: if the target already exists the two would merge
		// unpredictably, so that document needs looking at by hand.
		const existing = await settings.findOne({ _id: doc._id, [to]: { $exists: true } }, { projection: { _id: 1 } })
		if (existing) {
			console.log(`  ✗ ${doc._id} already has ${to}; skipping so nothing is overwritten.`)
			continue
		}

		if (!apply) continue

		const result = await settings.updateOne({ _id: doc._id }, { $rename: { [from]: to } })
		console.log(`  ✔ ${doc._id}: matched ${result.matchedCount}, modified ${result.modifiedCount}`)
	}

	if (!apply) console.log('\nDry run only. Re-run with --apply to write.')
} finally {
	await client.close()
}
