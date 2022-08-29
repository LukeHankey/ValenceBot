import { checkNum, splitMessage } from '../functions.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { ChannelType } from 'discord.js'

export default {
	name: 'send',
	description: ['Sends a message to a channel.', 'Edits a message by providing the channel and message ID and overwrite the previous post with new content.'],
	aliases: [''],
	usage: ['<channel Tag/ID> <message content>', 'edit <channel Tag/ID> <message ID> <new message content>'],
	guildSpecific: 'all',
	permissionLevel: 'Admin',
	data: new SlashCommandBuilder()
		.setName('send')
		.setDescription('Send a message to a channel')
		.setDefaultPermission(false)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('to')
				.setDescription('Sends or edits a message to a specific channel in the server.')
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('The channel you want to send a message to.')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(true)
				)
				.addStringOption((option) =>
					option
						.setName('message')
						.setDescription('Write your message.')
						.setRequired(true)
				)
				.addStringOption(option =>
					option
						.setName('edit_message')
						.setDescription('If editing a message, provide the message ID.')
				)
		),
	slash: async (interaction, perms) => {
		if (!perms.admin) return interaction.reply(perms.errorA)
		if (interaction.options.getSubcommand() === 'to') {
			const options = interaction.options
			const channel = options.getChannel('channel')
			const content = options.getString('message')
			// Null if not provided
			const editing = options.getString('edit_message')
			try {
				if (editing) {
					await channel.messages.edit(editing, { content })
					return await interaction.reply({ content: 'Message successfully edited.', ephemeral: true })
				}

				const sentChannel = await channel.send(content)
				await interaction.reply({ content: 'Message successfully sent', ephemeral: true })

				if (interaction.guild.id === '420803245758480405') {
					const botLogsAdminChannel = '794608385106509824'
					const channel = interaction.guild.channels.cache.get(botLogsAdminChannel)
					await channel.send({ content: `${interaction.member.toString()} sent a message to <#${sentChannel.channelId}>` })
				}
			} catch (err) {
				if (err.code === 10008) {
					return await interaction.reply({ content: 'Error. Unable to find message. Make sure you have the correct message ID.', ephemeral: true })
				} else {
					return await interaction.reply({ content: `Error. ${err.rawError.message}. Unable to send message.`, ephemeral: true })
				}
			}
		}
	},
	run: async (client, message, args, perms, db) => {
		const channels = await db.channels
		const myID = '212668377586597888'
		const content = args.slice(1).join(' ')
		if (!perms.admin) return message.channel.send(perms.errorA)

		const checkAndGetID = (id) => {
			if (checkNum(id, 0, Infinity) && [18, 19].includes(id.length)) {
				return { value: true, id }
			} else if (message.mentions.has(id.slice(2, -1))) {
				return { value: true, id: id.slice(2, -1) }
			} else { return { value: false, id: null } }
		}

		if (!args[0]) {
			return message.channel.send({ content: 'Provide a valid channel Id.' })
		}

		if (args[0] && !content) {
			return message.channel.send({ content: 'You must provide a message to send and a channel to send it to.' })
		}

		const catchMissingAccessError = (e) => {
			if (e.code === 50001) {
				return message.channel.send({ content: 'Error: Missing channel access.' })
			}
		}

		try {
			switch (args[0]) {
			case 'edit': {
				const [channelID, messageID, ...messageContent] = args.slice(1)
				const { value, id } = checkAndGetID(channelID)
				const messageCheck = checkAndGetID(messageID)
				if (value) {
					if (messageCheck.value && message.author.id !== myID && messageContent.length) {
						if (message.guild.channels.cache.has(id)) {
							const getChannel = message.guild.channels.cache.get(id)
							try {
								const msg = await getChannel.messages.fetch(messageCheck.id)
								await msg.edit({ content: messageContent.join(' ') })
								return message.react('✅')
							} catch (err) {
								channels.errors.send(err)
							}
						} else {
							return message.channel.send({ content: 'You are not able to edit a message in another server.' })
						}
					} else {
						if (!messageContent.length) return message.channel.send({ content: 'You must provide a message to send and a channel to send it to.' })
						if (!messageCheck.value) return message.channel.send({ content: `Make sure the messageID is valid and in <#${id}>` })
						if (message.author.id === myID && messageCheck.value && messageContent.length) {
							const getChannel = client.channels.cache.get(id)
							try {
								const msg = await getChannel.messages.fetch(messageCheck.id)
								await msg.edit({ content: messageContent.join(' ') })
								return message.react('✅')
							} catch (err) {
								channels.errors.send(err)
							}
						}
					}
				} else {
					return message.channel.send({ content: 'You must have a valid channel ID.' })
				}
			}
				break
			default: {
				if (checkAndGetID(args[0]).value) { // Has valid channel ID
					const split = splitMessage(content)
					const channelId = checkAndGetID(args[0]).id
					const sendChannel = client.channels.cache.get(channelId)
					if (message.guild.channels.cache.has(channelId) && content && message.author.id !== myID) { // Has content and channel is in same server
						split.forEach(text => {
							sendChannel.send({ content: text }).catch(err => {
								catchMissingAccessError(err)
							})
						})
						if (message.guild.id === '668330890790699079') {
							const botLogsAdminChannel = '903432222139355207'
							const channel = message.guild.channels.cache.get(botLogsAdminChannel)
							await channel.send({ content: `${message.member.toString()} sent a message to <#${sendChannel.id}>` })
						}
					}
					if (message.author.id === myID && content) {
						split.forEach(text => {
							sendChannel.send({ content: text }).catch(err => {
								catchMissingAccessError(err)
							})
						})
					} else if (message.author.id !== myID && content && !message.guild.channels.cache.has(checkAndGetID(args[0]).id)) { // Checks for non-owner, message content and if ID is not in same server
						message.channel.send({ content: 'You are not able to send a message to a channel in another server.' })
						channels.logs.send({ content: `<@${message.author.id}> tried to send a message to another Server, from Channel: <#${message.channel.id}> to <#${args[0]}>: \`\`\`Server Name: ${message.guild.name}\nServer ID:${message.guild.id}\nMessage content: ${content}\`\`\`` })
					}
				} else { // No valid ID
					return message.channel.send({ content: 'You must provide a valid channel ID.' })
				}
			}
			}
		} catch (err) {
			await channels.errors.send(err)
		}
	}
}
