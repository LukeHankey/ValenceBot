const WorldReactions = {
	legacy: '<:legacy:1023039209461788794>',
	vip: '<:VIP_badge:1023040160927055932>',
	quick_chat: '<:quick_chat:1023042542465450004>',
	eoc: '<:Revolution:1023042741262880808>',
	fifteen_plus: '<:1500_total:1023251995211071499>',
	twenty_plus: '<:2000_total:1023252045093933087>',
	twenty_six_plus: '<:2600_total:1023252076324724776>',
	laggy: '<:lag:1023271186047717406>',
	dsf: '🎣',
	sixty_nine: '<:nice:1120443938206122116>',
	leagues: '<:leagues:1417397814899642399>'
}

export const worlds = [
	{
		worlds: [18, 115, 137],
		reason: 'legacy',
		reaction: WorldReactions.legacy
	},
	{
		worlds: [30],
		reason: '2000+',
		reaction: WorldReactions.twenty_plus
	},
	{
		worlds: [48],
		reason: '2600+',
		reaction: WorldReactions.twenty_six_plus
	},
	{
		worlds: [52],
		reason: 'vip',
		reaction: WorldReactions.vip
	},
	{
		worlds: [66],
		reason: 'eoc',
		reaction: WorldReactions.eoc
	},
	{
		worlds: [84],
		reason: 'laggy',
		reaction: WorldReactions.laggy
	},
	{
		worlds: [86, 114],
		reason: '1500',
		reaction: WorldReactions.fifteen_plus
	},
	{
		worlds: [96],
		reason: 'quick chat',
		reaction: WorldReactions.quick_chat
	},
	{
		worlds: [116],
		reason: 'dsf world',
		reaction: WorldReactions.dsf
	},
	{
		worlds: [69],
		reason: 'Fun',
		reaction: WorldReactions.sixty_nine
	},
	{
		worlds: [
			13, 211, 212, 213, 214, 215, 216, 217, 219, 226, 227, 228, 229, 238, 253, 254, 261, 262, 263, 264, 265, 266, 267, 268,
			269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281, 282, 283, 284, 285, 286, 287, 288, 289, 290, 291,
			292, 293, 294, 295, 296, 297, 298
		],
		reason: 'leagues',
		reaction: WorldReactions.leagues
	}
]

export const getWorldNumber = (message) => {
	const match = /world\s+(\d{1,3})/i.exec(message) || /\w?\s?(\d{1,3})/.exec(message)

	return match ? parseInt(match[1]) : null
}

export const worldReaction = async (message) => {
	const worldNumber = getWorldNumber(message.content)
	const worldFound = worlds.find((item) => item.worlds.includes(worldNumber))

	if (worldFound) {
		if (Array.isArray(worldFound.reaction.match(/^<:.*:\d.*>$/))) {
			const reactionString = worldFound.reaction

			// Get the emoji Id from the cache
			const reactionId = reactionString.split(':').at(-1).slice(0, -1)
			const emoji = message.client.emojis.cache.get(reactionId)
			return await message.react(emoji)
		}
		await message.react(worldFound.reaction)
	}
}
