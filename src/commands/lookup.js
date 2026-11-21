import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageFlags } from 'discord.js'
import { nEmbed } from '../functions.js'
import Color from '../colors.js'
import ms from 'pretty-ms'

const readable = (when) => new Date(when).toString().split(' ').slice(0, 5).join(' ')

/** The lookup embed's one field, for a ScoutTracker profile. */
export const lookupText = (user) => {
	const old = user.oldScout
	const bonus = (n) => (old ? ` (+${n})` : '')
	const sum = (s, key) => (s?.alt1?.[key] ?? 0) + (s?.alt1First?.[key] ?? 0)
	return [
		`**firstTimestamp:** ${user.firstTimestamp}`,
		`**firstTimestampReadable:** ${readable(user.firstTimestampReadable)}`,
		`**lastTimestamp:** ${user.lastTimestamp}`,
		`**lastTimestampReadable:** ${readable(user.lastTimestampReadable)}`,
		`**Merch count:** ${user.count}${bonus(old?.count)}`,
		`**Other count:** ${user.otherCount}${bonus(old?.otherCount)}`,
		`**Alt1 Merch count:** ${sum(user, 'merchantCount')}${bonus(sum(old, 'merchantCount'))}`,
		`**Alt1 Other count:** ${sum(user, 'otherCount')}${bonus(sum(old, 'otherCount'))}`,
		`**Active for:** ${ms(user.lastTimestamp - user.firstTimestamp)}`,
		`**Active:** ${user.active ? 'True' : 'False'}`,
		`**Warnings:** ${user.warnings?.length ?? 0}`
	].join('\n')
}

export default {
	name: 'lookup',
	description: ['Shows a member’s record in the Scouter database.'],
	usage: ['<user>'],
	guildSpecific: ['420803245758480405', '668330890790699079'],
	permissionLevel: 'Admin',
	data: new SlashCommandBuilder()
		.setName('lookup')
		.setDescription('Show a member’s record in the Scouter database.')
		.addUserOption((o) => o.setName('user').setDescription('Member to look up (mention or ID)').setRequired(true)),
	slash: async (client, interaction, perms) => {
		if (!perms.admin) return interaction.reply({ ...perms.errorA, flags: MessageFlags.Ephemeral })

		const db = client.database.scoutTracker
		const target = interaction.options.getUser('user')
		const user = await db.findOne({ userID: target.id }, { projection: { _id: 0 } })
		if (!user) {
			return interaction.reply({
				content: `<@${target.id}> is not in the database.`,
				allowedMentions: { parse: [] },
				flags: MessageFlags.Ephemeral
			})
		}

		const total = await db.countDocuments({})
		const embed = nEmbed(
			`DB Lookup - ${user.author} [${total}]`,
			'Lookup user info for DSF in the Scouter DataBase.',
			Color.gold
		).addFields({ name: '​', value: lookupText(user), inline: true })
		return interaction.reply({ embeds: [embed] })
	}
}
