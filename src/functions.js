import { EmbedBuilder, Collection } from 'discord.js'
import Color from './colors.js'

const nEmbed = (title, description, color = Color.cyan, thumbnail = null, guildIcon) => {
	const embed = new EmbedBuilder()
		.setTitle(title)
		.setDescription(description)
		.setColor(color)
		.setThumbnail(thumbnail)
		.setTimestamp()
		.setFooter({ text: 'Valence Bot created by Luke_#1838', iconURL: guildIcon })
	return embed
}
const checkNum = (id = 0, greaterOrEqualTo = 1, lowerOrEqualTo = Infinity) => {
	if (+id !== parseInt(id) || !(id >= greaterOrEqualTo) || !(id <= lowerOrEqualTo)) {
		return false
	} else {
		return true
	}
}
const checkDate = (id = 0, greaterOrEqualTo = 0, lowerOrEqualTo = Infinity) => {
	if (+id !== parseInt(id) || !(id >= greaterOrEqualTo) || !(id <= lowerOrEqualTo)) {
		return false
	} else {
		return true
	}
}
const msCalc = (d, h, m) => {
	return d * 24 * 60 * 60 * 1000 + h * 60 * 60 * 1000 + m * 60 * 1000
}
const doubleDigits = (digit) => {
	if (digit.length === 2) {
		return digit
	} else {
		const zero = '0'
		return zero.concat(digit)
	}
}
const nextDay = (d) => {
	const now = new Date()
	now.setDate(now.getUTCDate() + ((d + (7 - now.getUTCDay())) % 7))
	return now
}
const newDates = (days, hours, minutes, timer) => {
	const time = this.msCalc(days, this.doubleDigits(hours), this.doubleDigits(minutes)) + timer
	return new Date(time).toUTCString()
}
const capitalise = (str) => {
	return str.charAt(0).toUpperCase() + str.slice(1)
}
const compressArray = (original) => {
	const compressed = []
	// make a copy of the input array
	const copy = original.slice(0)

	// first loop goes over every element
	for (let i = 0; i < original.length; i++) {
		let myCount = 0
		// loop over every element in the copy and see if it's the same
		for (let w = 0; w < copy.length; w++) {
			if (original[i] === copy[w]) {
				// increase amount of times duplicate is found
				myCount++
				// sets item to undefined
				delete copy[w].id
			}
		}

		if (myCount > 0) {
			const a = {}
			a.value = original[i]
			a.count = myCount
			compressed.push(a)
		}
	}

	return compressed
}
const randomNum = () => {
	return Math.round(Math.random() * 10000) + 1
}
const removeEvents = async (client, message, module, database, eventTag) => {
	const db = client.database.settings
	const channels = await client.database.channels
	try {
		const eventsChannel = message.guild.channels.cache.get(database.channels.events)
		const [eventMessageCheck] = database.events.filter((event) => {
			if (event.eventTag === eventTag) {
				return event
			} else return undefined
		})

		// Remove from events
		await db.updateOne({ _id: message.guild.id }, { $pull: { events: { eventTag } } })

		// Remove from calendar
		await db.findOneAndUpdate(
			{ _id: message.guild.id, 'calendarID.messageID': eventMessageCheck.calendarID },
			{ $pull: { 'calendarID.$.events': { eventTag } } }
		)

		const calChannel = message.guild.channels.cache.get(database.channels.calendar)

		if (eventMessageCheck.messageID) {
			// Fetch the event message and remove reactions from event post
			const eventMessage = await eventsChannel.messages.fetch(eventMessageCheck.messageID)
			await eventMessage.reactions.removeAll()
		}

		if (module === 'calendar') return

		// Remove the post from the calendar
		const currentYear = new Date().getFullYear()
		const [calendarMessage] = database.calendarID.filter((month) => {
			if (month.month === eventMessageCheck.month && month.year === currentYear) {
				return month
			} else return undefined
		})
		let calMessage = await calChannel.messages.fetch(calendarMessage.messageID)
		calMessage = calMessage instanceof Collection ? calMessage.first() : calMessage
		const fields = calMessage.embeds[0].data.fields

		const foundIndex = fields.findIndex((field) => {
			const eventItems = field.value.split('\n')
			const title = eventItems[0].slice(7)
			const messageId = eventItems[2].split('/')[6].slice(0, -1)
			const date = field.name

			return (
				title === eventMessageCheck.title &&
				messageId === eventMessageCheck.messageID &&
				date === eventMessageCheck.dateEnd.slice(6)
			)
		})

		const removedItem = [fields[foundIndex]].map((obj) => `${obj.name}\n${obj.value}`)
		const updateEmbed = new EmbedBuilder(calMessage.embeds[0].data)
		updateEmbed.spliceFields(foundIndex, 1)
		calMessage.edit({ embeds: [updateEmbed] })
		return channels.logs.send(
			`Calendar updated - ${message.member.displayName} removed event: \`\`\`diff\n- Removed\n${removedItem.join()}\`\`\``
		)
	} catch (err) {
		return channels.errors.send(err)
	}
}
const csvJSON = (csv) => {
	const lines = csv.split('\n')
	const result = []
	const headers = lines[0].split(',')

	for (let i = 1; i < lines.length; i++) {
		const obj = {}
		const currentline = lines[i].split(',')

		for (let j = 0; j < headers.length; j++) {
			obj[headers[j]] = currentline[j]
		}

		result.push(obj)
	}

	// return result; // JavaScript object
	return JSON.parse(JSON.stringify(result))
}
const renameKeys = (keysMap, object) =>
	Object.keys(object).reduce(
		(acc, key) => ({
			...acc,
			...{ [keysMap[key] || key]: object[key] }
		}),
		{}
	)
const paginate = (data, { author }, text, desc = '') => {
	const embeds = []
	let k = 24
	for (let i = 0; i < data.length; i += 24) {
		const current = data.slice(i, k)
		k += 24
		const info = current
		const embed = new EmbedBuilder()
			.setTitle(`${text} Member Profiles - Top Scouters`)
			.setDescription(`Current tracked stats in this server for the top 24 ${desc} scouters per page.`)
			.setColor(Color.aqua)
			.setThumbnail(author.displayAvatarURL())
			.setTimestamp()
			.addFields(info)
		embeds.push(embed)
	}
	return embeds
}
const paginateFollowUP = async (msg, { author }, page, embeds, client) => {
	await msg.react('◀️')
	await msg.react('▶️')

	const react = (reaction, user) => ['◀️', '▶️'].includes(reaction.emoji.name) && user.id === author.id
	const collect = msg.createReactionCollector({ filter: react })

	collect.on('collect', (r, u) => {
		if (r.emoji.name === '▶️') {
			if (page < embeds.length) {
				msg.reactions.resolve('▶️').users.remove(u.id)
				page++
				if (page === embeds.length) --page
				msg.edit({
					embeds: [
						embeds[page].setFooter({
							text: `Page ${page + 1} of ${embeds.length} - Something wrong or missing? Let a Moderator+ know!`,
							iconURL: client.user.displayAvatarURL()
						})
					]
				})
			}
		} else if (r.emoji.name === '◀️') {
			if (page !== 0) {
				msg.reactions.resolve('◀️').users.remove(u.id)
				--page
				msg.edit({
					embeds: [
						embeds[page].setFooter({
							text: `Page ${page + 1} of ${embeds.length} - Something wrong or missing? Let a Moderator+ know!`,
							iconURL: client.user.displayAvatarURL()
						})
					]
				})
			} else {
				msg.reactions.resolve('◀️').users.remove(u.id)
			}
		}
	})
}
const splitMessage = (text, { maxLength = 2_000, char = '\n', prepend = '', append = '' } = {}) => {
	if (text.length <= maxLength) return [text]
	let splitText = [text]
	if (Array.isArray(char)) {
		while (char.length > 0 && splitText.some((elem) => elem.length > maxLength)) {
			const currentChar = char.shift()
			if (currentChar instanceof RegExp) {
				splitText = splitText.flatMap((chunk) => chunk.match(currentChar))
			} else {
				splitText = splitText.flatMap((chunk) => chunk.split(currentChar))
			}
		}
	} else {
		splitText = text.split(char)
	}
	if (splitText.some((elem) => elem.length > maxLength)) throw new RangeError('SPLIT_MAX_LEN')
	const messages = []
	let msg = ''
	for (const chunk of splitText) {
		if (msg && (msg + char + chunk + append).length > maxLength) {
			messages.push(msg + append)
			msg = prepend
		}
		msg += (msg && msg !== prepend ? char : '') + chunk
	}
	return messages.concat(msg).filter((m) => m)
}

const getRuneDate = () => {
	const initialRuneDate = Date.parse('27 Feb 2002') // 0
	const now = new Date()

	return parseInt((now - initialRuneDate) / (1000 * 3600 * 24))
}

export {
	nEmbed,
	checkNum,
	checkDate,
	msCalc,
	doubleDigits,
	nextDay,
	newDates,
	capitalise,
	compressArray,
	randomNum,
	removeEvents,
	csvJSON,
	renameKeys,
	paginate,
	paginateFollowUP,
	splitMessage,
	getRuneDate
}

export default newDates
