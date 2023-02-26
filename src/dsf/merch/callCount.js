import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { foreignWorldsRegex } from './constants.js'

const foreignWorldFlags = {
	'🇩🇪': [102, 121],
	'🇫🇷': [118],
	'🇧🇷': [47, 75, 101]
}

export const buttonFunctions = (userN, content) => {
	const buttonSelection = new ActionRowBuilder().addComponents([
		new ButtonBuilder()
			.setCustomId(`DM ${userN.user.username}`)
			.setLabel(`DM ${userN.user.username}`)
			.setStyle(ButtonStyle.Primary)
			.setEmoji({ name: '✉️' }),
		new ButtonBuilder()
			.setCustomId('Show How To React')
			.setLabel('Show How To React')
			.setStyle(ButtonStyle.Success)
			.setEmoji({ name: '☠️' }),
		new ButtonBuilder()
			.setCustomId('Eyes on Call Channels')
			.setLabel('Eyes on Call Channels')
			.setStyle(ButtonStyle.Success)
			.setEmoji({ name: '👀' }),
		new ButtonBuilder().setCustomId('Timeout').setLabel('Timeout').setStyle(ButtonStyle.Secondary).setEmoji({ name: '⏲️' }),
		new ButtonBuilder()
			.setCustomId('Clear Buttons')
			.setLabel('Clear Buttons')
			.setStyle(ButtonStyle.Danger)
			.setEmoji({ name: '❌' })
	])

	const buttonSelectionExtra = new ActionRowBuilder().addComponents([
		new ButtonBuilder()
			.setCustomId('Silly Fun')
			.setLabel('Silly Fun')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji({ name: '🪅' }),
		new ButtonBuilder()
			.setCustomId('Read The Pins')
			.setLabel('Read The Pins')
			.setStyle(ButtonStyle.Success)
			.setEmoji({ name: '📌' })
	])

	let foreignWorldNumber = 0
	if (foreignWorldsRegex.test(content)) {
		foreignWorldNumber = parseInt(/\d{2,3}/.exec(foreignWorldsRegex.exec(content)[0]))
	}

	const buttonSelectionForeignWorlds = new ActionRowBuilder().addComponents([
		new ButtonBuilder()
			.setCustomId('Foreign World')
			.setLabel('Foreign World')
			.setStyle(ButtonStyle.Success)
			.setEmoji({
				name: Object.keys(foreignWorldFlags).find((key) => foreignWorldFlags[key].includes(foreignWorldNumber))
			}),
		new ButtonBuilder()
			.setCustomId('Clear Buttons')
			.setLabel('Clear Buttons')
			.setStyle(ButtonStyle.Danger)
			.setEmoji({ name: '❌' })
	])

	const buttonSelectionAlreadyCalled = new ActionRowBuilder().addComponents([
		new ButtonBuilder()
			.setCustomId('Call Already Posted')
			.setLabel('Call Already Posted')
			.setStyle(ButtonStyle.Success)
			.setEmoji({ name: '©️' }),
		new ButtonBuilder()
			.setCustomId('Show How To React')
			.setLabel('Show How To React')
			.setStyle(ButtonStyle.Success)
			.setEmoji({ name: '☠️' }),
		new ButtonBuilder()
			.setCustomId('Clear Buttons')
			.setLabel('Clear Buttons')
			.setStyle(ButtonStyle.Danger)
			.setEmoji({ name: '❌' })
	])

	return [buttonSelection, buttonSelectionExtra, buttonSelectionForeignWorlds, buttonSelectionAlreadyCalled]
}
