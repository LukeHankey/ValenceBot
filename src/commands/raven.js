import { SlashCommandBuilder } from '@discordjs/builders'
import { getRuneDate } from '../functions.js'

/** A raven appears every 13 days of the RuneScape calendar. */
export const ravenMessage = (runeDate) =>
	runeDate % 13 === 0 ? 'There is a raven today!' : `The next raven will appear in ${13 - (runeDate % 13)} days.`

export default {
	name: 'raven',
	description: ['Lets you know if there is a raven today or when the next raven is.'],
	usage: [''],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	data: new SlashCommandBuilder().setName('raven').setDescription('Is there a raven today, or when is the next one?'),
	slash: async (client, interaction) => interaction.reply({ content: ravenMessage(getRuneDate()) })
}
