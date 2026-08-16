import { ScouterCheck } from '../../classes.js'
const scout = new ScouterCheck('Scouter')
const vScout = new ScouterCheck('Verified Scouter')

const classVars = async (name, serverName, database, client, scouters) => {
	name._client = client
	name._guildName = serverName
	name._db = await database
		// eslint-disable-next-line array-callback-return
		.map((doc) => {
			if (doc.serverName === name._guildName) return doc
		})
		.filter((x) => x)[0]
	name._scouters = scouters
}

// Promise.all, not map: the callbacks were started and never awaited, so this
// resolved while the writes were still in flight. Anything reading the profiles
// back saw the old state, and a failure inside became an unhandled rejection
// rather than something the caller could catch.
const addedRoles = async (name, scoutTracker) => {
	const members = await name.checkRolesAdded()
	await Promise.all(
		members.map(async (x) => {
			const role = await name.role
			await scoutTracker.updateOne(
				{ userID: x.id },
				{
					$addToSet: {
						assigned: role.id
					}
				}
			)
			// Add a check to see if they have the oldScout. If they do, re-add count once verified scouter
			if (name.roleName === 'Verified Scouter') {
				const trackerProfile = await scoutTracker.findOne({ userID: x.id })
				// No profile for someone who has never reported an event.
				if (trackerProfile?.oldScout) {
					const oldAlt1MerchantCount = trackerProfile.oldScout.alt1?.merchantCount ?? 0
					const oldAlt1OtherCount = trackerProfile.oldScout.alt1?.otherCount ?? 0
					const oldAlt1FirstMerchantCount = trackerProfile.oldScout.alt1First?.merchantCount ?? 0
					const oldAlt1FirstOtherCount = trackerProfile.oldScout.alt1First?.otherCount ?? 0
					await scoutTracker.updateOne(
						{ userID: trackerProfile.userID },
						{
							$set: {
								// Every addend is defaulted: oldScout documents predate some
								// of these fields, `undefined + number` is NaN, and Mongo
								// stores NaN happily — poisoning every later total and the
								// thresholds that read them.
								count: (trackerProfile.count ?? 0) + (trackerProfile.oldScout.count ?? 0),
								otherCount: (trackerProfile.otherCount ?? 0) + (trackerProfile.oldScout.otherCount ?? 0),
								'alt1.merchantCount': (trackerProfile.alt1?.merchantCount ?? 0) + oldAlt1MerchantCount,
								'alt1.otherCount': (trackerProfile.alt1?.otherCount ?? 0) + oldAlt1OtherCount,
								'alt1First.merchantCount':
									(trackerProfile.alt1First?.merchantCount ?? 0) + oldAlt1FirstMerchantCount,
								'alt1First.otherCount': (trackerProfile.alt1First?.otherCount ?? 0) + oldAlt1FirstOtherCount,
								firstTimestamp: trackerProfile.oldScout.firstTimestamp ?? trackerProfile.firstTimestamp
							},
							$unset: {
								oldScout: 1
							}
						}
					)
				}
			}
		})
	)
}

const removedRoles = async (name, scoutTracker) => {
	const checkRoles = await name.checkRolesRemoved()
	await Promise.all(
		checkRoles.map(async (x) => {
			const role = await name.role
			await scoutTracker.updateOne(
				{ userID: x.id },
				{
					$pull: {
						assigned: role.id
					}
				}
			)
		})
	)
}

export { scout, vScout, classVars, addedRoles, removedRoles }
