import Color from '../colors.js'
import { nEmbed } from '../functions.js'
import { getAllSlots, getRuneDate, stockEmojis } from '../dsf/index.js'
import { EmbedBuilder } from 'discord.js'

export default {
	name: 'stock',
	description: [
		'Gets the current days stock.',
		'Gets the <num> days stock from the past/future.',
		'Gets the last <num> days stock from the past/future.'
	],
	aliases: [],
	usage: ['', 'past/future <num>', 'past/future range <num>'],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	run: async (client, message, args, perms, db) => {
		const channels = await db.channels
		if ((perms.bot || perms.owner) && args[0] === 'update') {
			const merchDB = await db.collection.findOne(
				{ _id: '420803245758480405' },
				{ projection: { merchantWishes: 1, futureStock: 1 } }
			)
			for (const [document, type] of [
				[merchDB.merchantWishes, 'past'],
				[merchDB.futureStock, 'future']
			]) {
				args = [type, null, 31]

				updateTables(client, message, channels, args, document)
			}
			return
		}

		switch (args[0]) {
			case 'past':
			case 'future':
				{
					if (!args[1]) {
						return message.channel.send({ content: `Specify how many days in the ${args[0]} you want to see.` })
					}

					if (args[1] !== 'range') {
						const stockItems =
							args[0] === 'future'
								? Object.values(getAllSlots(getRuneDate() + parseInt(args[1]), { includeMap: true }))
								: Object.values(getAllSlots(getRuneDate() - parseInt(args[1]), { includeMap: true }))
						const currentStock = stockItems.map((item) => `${stockEmojis[item]} ${item}`).join('\n\n')
						return message.channel.send({
							embeds: [stockEmbed(client, { currentStock, days: parseInt(args[1]), type: args[0] })]
						})
					}

					const embeds = stockRange(client, message, channels, args)
					for (const embed of embeds) {
						message.channel.send({ embeds: [embed] })
					}
				}
				break
			default: {
				const stockItems = Object.values(getAllSlots(getRuneDate(), { includeMap: true }))
				const currentStock = stockItems.map((item) => `${stockEmojis[item]} ${item}`).join('\n\n')

				message.channel.send({ embeds: [stockEmbed(client, { currentStock })] })
			}
		}
	}
}

const getDate = (days, type) => {
	let now = days ? new Date(new Date().setDate(new Date().getDate() + days)) : new Date()
	if (type === 'past') {
		now = days ? new Date(new Date().setDate(new Date().getDate() - days)) : new Date()
	}
	const year = now.getFullYear()
	const currentDate = now.toUTCString()
	const shortDate = `${currentDate.split(` ${year}`)[0]}`

	return shortDate
}

const splitIntoX = (arr, x) => {
	arr = arr.flat()
	return new Array(Math.ceil(arr.length / x)).fill().map(() => arr.splice(0, x))
}

function ValueError(message) {
	this.message = message
	this.name = 'ValueError'
}
ValueError.prototype = Error.prototype

const stockEmbed = (client, { currentStock = null, days = null, fields = null, type = 'future' } = {}) => {
	if (!fields && !currentStock) throw new ValueError('One of fields or currentStock must be defined.')

	const embed = nEmbed(
		`Stock for ${getDate(days, type)} (${
			days ? (type === 'future' ? getRuneDate() + days : getRuneDate() - days) : getRuneDate()
		})`,
		currentStock,
		Color.blueLight,
		null,
		client.user.displayAvatarURL()
	)
	if (fields) {
		const [start, end] = days
		embed.addFields(fields)
		embed.setDescription(
			`The ${type === 'future' ? 'next' : 'last'} ${fields.length / 3} days of stock for the Travelling Merchant.`
		)
		embed.setTitle(
			`Stock for ${getDate(start, type)} (${type === 'future' ? getRuneDate() + start : getRuneDate() - start}) - ${getDate(
				end,
				type
			)} (${type === 'future' ? getRuneDate() + end : getRuneDate() - end})`
		)
	}

	return embed
}

const stockRange = (client, message, channels, args) => {
	const type = args[0]
	try {
		const range =
			type === 'future'
				? Array.from(new Array(parseInt(args[2])), (_, i) => i + getRuneDate() + 1)
				: Array.from(new Array(parseInt(args[2])), (_, i) => getRuneDate() - i - 1)

		const stockFields = []
		for (const dateRange in range) {
			const stockItems = Object.values(getAllSlots(parseInt(range[dateRange])))
			stockItems.forEach((item, idx) => {
				stockFields.push({
					name: idx === 0 ? `${getDate(parseInt(dateRange) + 1, type)} (${parseInt(range[dateRange])})` : '\u200b',
					value: `${stockEmojis[item]} ${item}`,
					inline: true
				})
			})
		}

		const embeds = []
		const chunks = splitIntoX(stockFields, 24)
		let end = 0
		for (const chunk in chunks) {
			embeds.push(stockEmbed(client, { days: [1 + end, chunks[chunk].length / 3 + end], fields: chunks[chunk], type }))
			end += chunks[chunk].length / 3
		}

		return embeds
	} catch (err) {
		channels.errors.send(err)
	}
}

const updateTables = async (client, message, channels, args, document) => {
	const embedIds = Object.values(document.messages).slice(0, -1) // remove links
	const linkIds = Object.values(document.messages.links)

	const channel = client.channels.cache.get(document.channelID)
	const baseURL = `https://discord.com/channels/${channel.guild.id}/${channel.id}`

	const embeds = stockRange(client, message, channels, args)

	try {
		const embedTitles = []
		for (const [embed, msgId] of embeds.map((e, i) => [e, embedIds[i]])) {
			const msg = await channel.messages.fetch(msgId)
			await msg.edit({ embeds: [new EmbedBuilder(embed.data)] })
			embedTitles.push(embed.data.title)
		}

		for (const link of linkIds) {
			const linkEmbed = new EmbedBuilder()
				.setDescription(
					embedTitles
						.map((e, i) => {
							return `- [${e.slice(10)}](${baseURL}/${embedIds[i]})`
						})
						.join('\n')
				)
				.setColor(Color.aqua)

			const msg = await channel.messages.fetch(link)
			await msg.edit({ embeds: [linkEmbed] })
		}
	} catch (err) {
		console.log(err)
	}
}
