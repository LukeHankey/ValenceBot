const WorldReactions = {
	legacy: '<:legacy:1023039209461788794>',
	vip: '<:VIP_badge:1023040160927055932>',
	quick_chat: '<:quick_chat:1023042542465450004>',
	eoc: '<:Revolution:1023042741262880808>',
	fifteen_plus: '<:1500_total:1023251995211071499>',
	twenty_plus: '<:2000_total:1023252045093933087>',
	twenty_six_plus: '<:2600_total:1023252076324724776>',
	laggy: '<:lag:1023264912853700719>',
	dsf: '🎣',
	fsw: '<:FSW:1023001019526946967>'
}

export const worlds = [
	{
		world: 18,
		reason: 'legacy',
		reaction: WorldReactions.legacy
	},
	{
		world: 30,
		reason: '2000+',
		reaction: WorldReactions.twenty_plus
	},
	{
		world: 48,
		reason: '2600+',
		reaction: WorldReactions.twenty_six_plus
	},
	{
		world: 52,
		reason: 'vip',
		reaction: WorldReactions.vip
	},
	{
		world: 66,
		reason: 'eoc',
		reaction: WorldReactions.eoc
	},
	{
		world: 84,
		reason: 'laggy',
		reaction: WorldReactions.laggy
	},
	{
		world: 86,
		reason: '1500',
		reaction: WorldReactions.fifteen_plus
	},
	{
		world: 96,
		reason: 'quick chat',
		reaction: WorldReactions.quick_chat
	},
	{
		world: 114,
		reason: '1500',
		reaction: WorldReactions.fifteen_plus
	},
	{
		world: 115,
		reason: 'legacy',
		reaction: WorldReactions.legacy
	},
	{
		world: 116,
		reason: 'dsf world',
		reaction: WorldReactions.dsf
	},
	{
		world: 137,
		reason: 'legacy',
		reaction: WorldReactions.legacy
	},
	{
		world: 600,
		reason: 'fsw',
		reaction: WorldReactions.fsw
	},
	{
		world: 601,
		reason: 'fsw',
		reaction: WorldReactions.fsw
	}
]

export const worldReaction = async (worldNumber, message) => {
	const worldFound = worlds.filter((item) => item.world === worldNumber)
	if (worldFound.length) {
		await message.react(worldFound[0].reaction)
	}
}
