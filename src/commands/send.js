import { checkNum } from '../functions.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { Util, ChannelType } from 'discord.js'

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
			if (editing) {
				try {
					await channel.messages.edit(editing, { content })
					return await interaction.reply({ content: 'Message successfully edited.', ephemeral: true })
				} catch (err) {
					if (err.code === 10008) {
						return await interaction.reply({ content: 'Error. Unable to find message. Make sure you have the correct message ID.', ephemeral: true })
					} else {
						return await interaction.reply({ content: `Error. ${err.rawError.message}. Make sure you have the correct message ID.`, ephemeral: true })
					}
				}
			}
			await channel.send(content)
			await interaction.reply({ content: 'Message successfully sent', ephemeral: true })
		}
	},
	run: async (client, message, args, perms, db) => {
		const channels = await db.channels
		const myID = '212668377586597888'
		const content = args.slice(1).join(' ')
		if (!perms.admin) return message.channel.send(perms.errorA)

		const checkAndGetID = (id) => {
			if (checkNum(id, 0, Infinity) && id.length === 18) {
				return { value: true, id }
			} else if (message.mentions.has(id.slice(2, -1))) {
				return { value: true, id: id.slice(2, -1) }
			} else { return { value: false, id: null } }
		}

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
				const split = Util.splitMessage(content)
				if (message.guild.channels.cache.has(checkAndGetID(args[0]).id) && content && message.author.id !== myID) { // Has content and channel is in same server
					split.forEach(text => {
						client.channels.cache.get(checkAndGetID(args[0]).id).send({ content: text })
							.catch(async err => {
								if (err.code === 50013) {
									return message.channel.send({ content: `I am missing some permissions to post in <#${checkAndGetID}>.` })
								} else {
									return channels.errors.send(err)
								}
							})
					})
				}
				if (message.author.id === myID && content) {
					split.forEach(text => {
						client.channels.cache.get(checkAndGetID(args[0]).id).send({ content: text })
							.catch(async err => {
								if (err.code === 50013) {
									return message.channel.send({ content: `I am missing some permissions to post in <#${checkAndGetID}>.` })
								} else {
									return channels.errors.send(err)
								}
							})
					})
				} else if (message.author.id !== myID && content && !message.guild.channels.cache.has(checkAndGetID(args[0]).id)) { // Checks for non-owner, message content and if ID is not in same server
					message.channel.send({ content: 'You are not able to send a message to a channel in another server.' })
					channels.logs.send({ content: `<@${message.author.id}> tried to send a message to another Server, from Channel: <#${message.channel.id}> to <#${args[0]}>: \`\`\`Server Name: ${message.guild.name}\nServer ID:${message.guild.id}\nMessage content: ${content}\`\`\`` })
				}
			} else { // No valid ID
				return message.channel.send({ content: 'You must provide a valid channel ID.' })
			}

			if (args[0] && !content) {
				return message.channel.send({ content: 'You must provide a message to send and a channel to send it to.' })
			}
		}
		}
	}
}
