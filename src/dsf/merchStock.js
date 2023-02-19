const slotMap = {
	A: ['Uncharted island map'],
	B: [
		'Gift for the Reaper',
		'Broken fishing rod',
		'Barrel of bait',
		'Anima crystal',
		'Small goebie burial charm',
		'Medium goebie burial charm',
		'Menaphite gift offering (small)',
		'Menaphite gift offering (medium)',
		'Shattered anima',
		'D&D token (daily)',
		'Sacred clay',
		'Livid plant',
		'Slayer VIP Coupon',
		'Silverhawk Down',
		'Unstable air rune',
		'Advanced pulse core',
		'Tangled fishbowl',
		'Unfocused damage enhancer',
		'Horn of honour'
	],
	D: [
		'Taijitu',
		'Large goebie burial charm',
		'Menaphite gift offering (large)',
		'D&D token (weekly)',
		'D&D token (monthly)',
		'Dungeoneering Wildcard',
		'Message in a bottle',
		'Crystal triskelion',
		'Starved ancient effigy',
		'Deathtouched dart',
		'Dragonkin lamp',
		'Harmonic dust',
		'Unfocused reward enhancer'
	]
}

slotMap.C = slotMap.B

export const stockEmojis = {
	'Uncharted island map': '<:dailymerchs:444206875429306369>',
	'Unstable air rune': '<:Unstable_air_rune:444161936595222548>',
	'Tangled fishbowl': '<:Tangled_fishbowl:444662258921111552>',
	'Message in a bottle': '<:Message_in_a_bottle:444162209849802752>',
	'Broken fishing rod': '<:Broken_fishing_rod:444662190386184202>',
	'Anima crystal': '<:Anima_crystal:444162318922940417>',
	'Barrel of bait': '<:Barrel_of_bait:444662199856791554>',
	'Deathtouched dart': '<:Deathtouched_dart:443980015244410880>',
	'Gift for the Reaper': '<:Gift_for_the_reaper:444161883834941461>',
	'Sacred clay': '<:Sacred_clay:444162001644683294>',
	'D&D token (monthly)': '<:DD_token_monthly:444162152434106378>',
	'Small goebie burial charm': '<:Small_goebie_burial_charm:444661089809203200>',
	'Advanced pulse core': '<:Advanced_pulse_core:444162016622411790>',
	'Menaphite gift offering (large)': '<:Menaphosrep:444162301822500874>',
	'Dungeoneering Wildcard': '<:Dungeoneering_wildcard:444161954630598656>',
	'Harmonic dust': '<:Harmonic_dust:444161981398908931>',
	'Shattered anima': '<:Shattered_anima:444161921457979402>',
	'Unfocused reward enhancer': '<:Unfocused_reward_enhancer:444162238501093377>',
	'Livid plant': '<:Livid_plant:444161738276077578>',
	'Large goebie burial charm': '<:Goebie_burial_charm:473504276522598400>',
	'Dragonkin lamp': '<:Dragonkin_lamp:444162084767399936>',
	'Silverhawk Down': '<:Silverhawk_down:444162032720281621>',
	'Crystal triskelion': '<:Crystal_triskelion:444161853560586240>',
	'Unfocused damage enhancer': '<:Unfocused_damage_enhancer:444162226824151051>',
	'Slayer VIP Coupon': '<:Slayer_VIP_coupon:444161908942176266>',
	'Starved ancient effigy': '<:Starved_ancient_effigy:444162105357369355>',
	'Menaphite gift offering (small)': '<:Menaphite_gift_offering_small:444661157371052052>',
	'D&D token (weekly)': '<:DD_token_weekly:444162142698995732>',
	'D&D token (daily)': '<:DD_token_daily:444162129944248320>',
	'Menaphite gift offering (medium)': '<:Menaphite_gift_offering_medium:444661239780737034>',
	Taijitu: '<:Taijitu:444161968442703872>',
	'Horn of honour': '<:BAHorn:1047635641556545608>',
	'Medium goebie burial charm': '<:Goebie_burial_charm:473504276522598400>'
}

const slotConstants = { B: [3, 19], C: [8, 19], D: [5, 13] }

const getSlot = (slot, runedate) => {
	const [constant, numUnique] = slotConstants[slot]
	runedate = BigInt(runedate)

	let seed = (runedate << BigInt(32)) + (runedate % BigInt(constant))
	const multiplier = BigInt('0x5DEECE66D', 16)

	const mask = BigInt(2 ** 48 - 1)
	const addend = 11n

	seed = (seed ^ multiplier) & mask
	seed = seed * multiplier + addend
	seed = seed & mask

	const slotIndex = parseInt((seed >> BigInt(17)) % BigInt(numUnique))

	return slotMap[slot][slotIndex]
}

export const getAllSlots = (runedate, { includeMap = false } = {}) => {
	const stock = {}
	if (includeMap) stock.A = slotMap.A
	const stockRest = {
		B: getSlot('B', runedate),
		C: getSlot('C', runedate),
		D: getSlot('D', runedate)
	}
	return Object.assign(stock, stockRest)
}

export const getRuneDate = () => {
	const initialRuneDate = Date.parse('27 Feb 2002') // 0
	const now = new Date()

	return parseInt((now - initialRuneDate) / (1000 * 3600 * 24))
}
