import { EmbedBuilder } from 'discord.js'
import Color from './colors.js'

const nEmbed = (title, description, color = Color.cyan, thumbnail = null, guildIcon) => {
	const embed = new EmbedBuilder()
		.setTitle(title)
		.setDescription(description)
		.setColor(color)
		.setThumbnail(thumbnail)
		.setTimestamp()
		.setFooter({ text: 'Valence Bot created by luke.h', iconURL: guildIcon })
	return embed
}
const capitalise = (str) => {
	return str.charAt(0).toUpperCase() + str.slice(1)
}
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

export { nEmbed, capitalise, paginate, paginateFollowUP, splitMessage, getRuneDate }
