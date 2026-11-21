import { SlashCommandBuilder } from '@discordjs/builders'
import { MessageFlags } from 'discord.js'
import { nEmbed } from '../functions.js'
import Color from '../colors.js'
import { ScouterCheck } from '../classes.js'
import { classVars } from '../dsf/index.js'

/** An embed holds at most 25 fields. */
const MAX_FIELDS = 25
const DEFAULT_MINIMUM = { scouter: 100, verified: 250 }

/** One embed field per call stored for #dsf-calls. */
export const storedCallFields = (otherMessages, guildId, channelId) =>
	otherMessages.map((call) => ({
		name: `${call.author}`,
		value: `**Time:** ${new Date(call.time).toString().split(' ').slice(0, 5).join(' ')}\n**Content:** [${
			call.content
		}](https://discord.com/channels/${guildId}/${channelId}/${call.messageID})`,
		inline: false
	}))

export default {
	name: 'dsf',
	description: [
		'Shows the calls currently stored for #dsf-calls.',
		'Clears every stored call. Use it if the bot gets stuck on old calls.',
		'Lists members who have reached the count for Scouter or Verified Scouter.',
		'Adds to (or, with a negative amount, takes from) a member’s other count.'
	],
	usage: ['calls', 'calls-clear', 'view <rank> [minimum]', 'adjust <member> <amount>'],
	guildSpecific: ['668330890790699079', '420803245758480405'],
	permissionLevel: 'Admin',
	data: new SlashCommandBuilder()
		.setName('dsf')
		.setDescription('DSF admin tools.')
		.addSubcommand((sub) => sub.setName('calls').setDescription('Show the calls stored for #dsf-calls.'))
		.addSubcommand((sub) => sub.setName('calls-clear').setDescription('Clear every stored call.'))
		.addSubcommand((sub) =>
			sub
				.setName('view')
				.setDescription('Members who have reached the count for a rank.')
				.addStringOption((o) =>
					o
						.setName('rank')
						.setDescription('Which rank')
						.setRequired(true)
						.addChoices({ name: 'Scouter', value: 'scouter' }, { name: 'Verified Scouter', value: 'verified' })
				)
				.addIntegerOption((o) => o.setName('minimum').setDescription('Count needed (default 100 / 250)').setMinValue(1))
		)
		.addSubcommand((sub) =>
			sub
				.setName('adjust')
				.setDescription('Change a member’s other count.')
				.addUserOption((o) => o.setName('member').setDescription('Member (mention or ID)').setRequired(true))
				.addIntegerOption((o) =>
					o.setName('amount').setDescription('How much to add; negative to remove').setRequired(true)
				)
		),
	slash: async (client, interaction, perms) => {
		if (!perms.admin) return interaction.reply({ ...perms.errorA, flags: MessageFlags.Ephemeral })

		const db = client.database.settings
		const scouters = client.database.scoutTracker
		const guildId = interaction.guildId

		switch (interaction.options.getSubcommand()) {
			case 'calls': {
				const stored = await db.findOne(
					{ _id: guildId },
					{ projection: { 'eventChannel.otherMessages': 1, 'eventChannel.otherChannelID': 1 } }
				)
				const { otherMessages = [], otherChannelID = null } = stored?.eventChannel ?? {}
				const fields = storedCallFields(otherMessages, guildId, otherChannelID)
				const more = fields.length > MAX_FIELDS ? ` Showing ${MAX_FIELDS} of ${fields.length}.` : ''
				const embed = nEmbed(
					'Calls stored for #dsf-calls',
					`These are removed automatically when their timer ends. If the bot gets stuck on old calls, use \`/dsf calls-clear\`.${more}`,
					Color.cream,
					interaction.user.displayAvatarURL(),
					client.user.displayAvatarURL()
				).addFields(fields.slice(0, MAX_FIELDS))
				return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
			}

			case 'calls-clear': {
				await db.updateOne({ _id: guildId }, { $set: { 'eventChannel.otherMessages': [] } })
				return interaction.reply({ content: '✅ Cleared every stored call.', flags: MessageFlags.Ephemeral })
			}

			case 'view': {
				const rank = interaction.options.getString('rank')
				const minimum = interaction.options.getInteger('minimum') ?? DEFAULT_MINIMUM[rank]
				await interaction.deferReply({ flags: MessageFlags.Ephemeral })

				const check = new ScouterCheck(rank === 'verified' ? 'Verified Scouter' : 'Scouter', minimum)
				const settings = await db.find({}).toArray()
				const candidates = await scouters
					.find({
						$or: [
							{
								$expr: {
									$gte: [
										{
											$sum: [
												'$count',
												'$otherCount',
												'$alt1.merchantCount',
												'$alt1First.merchantCount',
												'$alt1.otherCount',
												'$alt1First.otherCount'
											]
										},
										minimum
									]
								}
							},
							{ 'assigned.0': { $exists: true } }
						]
					})
					.toArray()
				await classVars(check, interaction.guild.name, settings, client, candidates)
				// ScouterCheck posts the list in the channel, paged for whoever ran it.
				await check.send(interaction.channelId, { author: interaction.user })
				return interaction.editReply({ content: 'Posted below.' })
			}

			case 'adjust': {
				const member = interaction.options.getUser('member')
				const amount = interaction.options.getInteger('amount')
				if (amount === 0) {
					return interaction.reply({ content: 'An amount of 0 changes nothing.', flags: MessageFlags.Ephemeral })
				}

				const result = await scouters.updateOne({ userID: member.id }, { $inc: { otherCount: amount } })
				if (!result.matchedCount) {
					return interaction.reply({
						content: `<@${member.id}> has no profile, so there is no count to change.`,
						allowedMentions: { parse: [] },
						flags: MessageFlags.Ephemeral
					})
				}
				const channels = await client.database.channels
				await channels.logs.send({
					content: `<@${interaction.user.id}> ${amount > 0 ? 'added' : 'removed'} ${Math.abs(amount)} other count ${
						amount > 0 ? 'to' : 'from'
					} <@${member.id}>.`,
					allowedMentions: { parse: [] }
				})
				return interaction.reply({
					content: `✅ ${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} other count ${amount > 0 ? 'to' : 'from'} <@${member.id}>.`,
					allowedMentions: { parse: [] },
					flags: MessageFlags.Ephemeral
				})
			}
		}
	}
}
