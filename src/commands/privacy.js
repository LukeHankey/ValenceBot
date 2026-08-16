import { SlashCommandBuilder } from '@discordjs/builders'
import { EmbedBuilder, MessageFlags } from 'discord.js'

import Color from '../colors.js'
import { isOptedOut, setOptOut } from '../dsf/privacy.js'

const POLICY_URL = 'https://github.com/LukeHankey/ValenceBot/blob/main/PRIVACY_POLICY.md'

const OPTED_OUT_DESCRIPTION = [
	'Your messages in the event-call channel are now **ignored completely**.',
	'',
	'Nothing you post there is read, stored or counted, no reactions are added, and no event timer is started — so calls you make will not be tracked and will not credit your scout profile.',
	'',
	'Use `/privacy optin` to undo this.'
].join('\n')

const OPTED_IN_DESCRIPTION = [
	'Your calls in the event-call channel are tracked again.',
	'',
	'The bot reads them to work out which event is on which world, stores the text only while the event is running, and credits your scout profile.',
	'',
	'Use `/privacy optout` to stop this.'
].join('\n')

const reply = (interaction, title, description, colour) =>
	interaction.reply({
		embeds: [new EmbedBuilder().setTitle(title).setDescription(description).setColor(colour).setTimestamp()],
		flags: MessageFlags.Ephemeral
	})

export default {
	name: 'privacy',
	// One description per usage entry: help.js pairs them by index.
	description: [
		'Stops the bot reading or storing anything you post in the event-call channel.',
		'Lets the bot track your event calls again.',
		'Shows your current choice and what the bot stores.'
	],
	usage: ['optout', 'optin', 'status'],
	// The registration script filters on guildSpecific.includes(guildId), so the
	// string 'all' would match nothing and the command would never publish.
	guildSpecific: ['668330890790699079', '420803245758480405'],
	permissionLevel: 'Everyone',
	data: new SlashCommandBuilder()
		.setName('privacy')
		.setDescription('Control whether the bot reads and stores your event calls.')
		.addSubcommand((sub) =>
			sub.setName('optout').setDescription('Stop the bot reading or storing anything you post in the call channel.')
		)
		.addSubcommand((sub) => sub.setName('optin').setDescription('Let the bot track your event calls again.'))
		.addSubcommand((sub) => sub.setName('status').setDescription('Show your current choice.')),
	slash: async (client, interaction) => {
		const scoutTracker = client.database.scoutTracker
		const subcommand = interaction.options.getSubcommand()
		const userID = interaction.user.id

		if (subcommand === 'status') {
			const optedOut = await isOptedOut(scoutTracker, userID)

			return reply(
				interaction,
				optedOut ? 'You have opted out' : 'You are opted in',
				`${optedOut ? OPTED_OUT_DESCRIPTION : OPTED_IN_DESCRIPTION}\n\n[Privacy Policy](${POLICY_URL})`,
				optedOut ? Color.orange : Color.cyan
			)
		}

		const optOut = subcommand === 'optout'
		await setOptOut(scoutTracker, userID, optOut)

		return reply(
			interaction,
			optOut ? 'Opted out' : 'Opted back in',
			`${optOut ? OPTED_OUT_DESCRIPTION : OPTED_IN_DESCRIPTION}\n\n[Privacy Policy](${POLICY_URL})`,
			optOut ? Color.orange : Color.greenLight
		)
	}
}
