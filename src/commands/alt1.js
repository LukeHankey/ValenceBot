import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageFlags } from 'discord.js'

export default {
	name: 'alt1',
	description: ['Alt1-Discord verification'],
	usage: ['verify'],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	data: new SlashCommandBuilder()
		.setName('alt1')
		.setDescription('Alt1-Discord verification')
		.addSubcommand((subcommand) =>
			subcommand.setName('verify').setDescription('Verify you own the Discord ID in Alt1 DSF Event Tracker.')
		),
	slash: async (client, interaction, _) => {
		const scoutTracker = client.database.scoutTracker
		const memberDiscordId = interaction.member.id

		const memberProfile = await scoutTracker.findOne({ userID: memberDiscordId })
		if (memberProfile && memberProfile.alt1Code) {
			await interaction.reply({
				content: `Your DSF Event Tracker code for alt1 is: \`${memberProfile.alt1Code}\`.`,
				flags: MessageFlags.Ephemeral
			})
			if (!memberProfile.author) {
				await scoutTracker.updateOne(
					{ userID: memberDiscordId },
					{
						$set: {
							author: interaction.member.nickname ?? interaction.member.displayName
						}
					}
				)
			}
		} else {
			await interaction.reply({
				content:
					'You have not requested a verification code with the DSF Event Tracker [alt1 app](https://www.dsfeventtracker.com/).',
				flags: MessageFlags.Ephemeral
			})
		}
	}
}
