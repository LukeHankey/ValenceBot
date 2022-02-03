import { SlashCommandBuilder } from '@discordjs/builders'
import { ChannelType } from 'discord-api-types/v9'
import { Formatters, MessageActionRow, MessageSelectMenu } from 'discord.js'
import { randomNum } from '../functions.js'

export default {
	name: 'move',
	description: ['Moves messages from one channel to another.'],
	aliases: [''],
	guildSpecific: 'all',
	data: new SlashCommandBuilder()
		.setName('move')
		.setDescription('Set up of moving messages from one channel to another.')
		.setDefaultPermission(false)
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Adds a set of channels to the move messages list.')
				.addChannelOption(option =>
					option
						.setName('from')
						.setDescription('The channel you want messages moved from.')
						.addChannelType(ChannelType.GuildText)
						.setRequired(true)
				)
				.addChannelOption(option =>
					option
						.setName('to')
						.setDescription('The channel you want messages moved to.')
						.addChannelType(ChannelType.GuildText)
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('template')
						.setDescription('Template embeds available to use.')
						.addChoice('Mod Application', 'Mod Application')
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('list')
				.setDescription('Lists the channels which you have messages moving to and from.')
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('A selection of setups to remove.')
		),
	permissionLevel: 'Admin',
	slash: async (interaction, perms, db) => {
		const channels = await db.channels
		const data = await db.collection.findOne({ _id: interaction.guild.id }, { projection: { messageList: 1 } })

		const options = interaction.options

		/**
		 * data.messageList = Object[]
		 */
		switch (options.getSubcommand()) {
		case 'add': {
			const from = options.getChannel('from').id
			const to = options.getChannel('to').id
			const template = options.getString('template')
			try {
				// Add the list
				await db.collection.findOneAndUpdate({ _id: interaction.guild.id }, {
					$addToSet: {
						messageList: {
							from,
							to,
							template,
							created: new Date(interaction.createdTimestamp),
							createdBy: interaction.member.nickname ?? interaction.member.user.username,
							key: randomNum()
						}
					}
				})
				return await interaction.reply({ content: 'All set up.', ephemeral: true })
			} catch (err) {
				channels.errors.send(err)
			}
		}
			break
		case 'list': {
			const list = data.messageList.map((m, i) => `${i + 1}. Created by ${m.createdBy} ${Formatters.time(m.created, 'R')}. Moving messages from ${Formatters.channelMention(m.from)} to ${Formatters.channelMention(m.to)} ${m.template ? `using ${m.template}.` : '.'}`)

			await interaction.reply({ content: list.length ? `${Formatters.blockQuote(list.join('\n'))}` : 'None set up.' })
		}
			break
		case 'remove': {
			const list = data.messageList.map((m, i) => {
				return {
					label: `${i + 1}. Created by ${m.createdBy} on ${m.created.toString().split(' ').slice(0, 5).join(' ')}`,
					description: `From #${interaction.guild.channels.cache.get(m.from).name} to #${interaction.guild.channels.cache.get(m.to).name}${m.template ? ` using ${m.template}.` : '.'}`,
					value: m.key.toString()
				}
			})

			const selectMenu = new MessageActionRow()
				.addComponents(
					new MessageSelectMenu()
						.setCustomId('select_move_message')
						.setPlaceholder('Nothing selected')
						.setMinValues(1)
						.setMaxValues(list.length)
						.addOptions(list)
				)

			if (list.length) return await interaction.reply({ content: 'Which one would you like to remove?', components: [selectMenu] })
			else return await interaction.reply({ content: 'There are none set up to remove.' })
		}
		}
	}
}
