import { SlashCommandBuilder } from '@discordjs/builders'
import { ChannelType, MessageFlags } from 'discord.js'

export default {
	name: 'send',
	description: [
		'Sends a message to a channel.',
		'Edits a message by providing the channel and message ID and overwrite the previous post with new content.'
	],
	usage: ['<channel Tag/ID> <message content>', 'edit <channel Tag/ID> <message ID> <new message content>'],
	guildSpecific: 'all',
	permissionLevel: 'Admin',
	data: new SlashCommandBuilder()
		.setName('send')
		.setDescription('Send a message to a channel')
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
				.addStringOption((option) => option.setName('message').setDescription('Write your message.'))
				.addAttachmentOption((option) => option.setName('attachment').setDescription('Add an attachment.'))
				.addStringOption((option) =>
					option.setName('edit_message').setDescription('If editing a message, provide the message ID.')
				)
				.addBooleanOption((option) => option.setName('force').setDescription('Override editing images/attachments.'))
		),
	slash: async (_, interaction, perms) => {
		if (!perms.admin) return interaction.reply(perms.errorA)
		if (interaction.options.getSubcommand() !== 'to') return

		const options = interaction.options
		// Required
		const channel = options.getChannel('channel')

		// Optional
		const content = options.getString('message')
		const attachment = options.getAttachment('attachment')
		const editing = options.getString('edit_message')
		const force = options.getBoolean('force')

		try {
			let file = null
			if (attachment) {
				const response = await fetch(attachment.url)
				const buffer = await response.arrayBuffer()

				file = {
					attachment: Buffer.from(buffer),
					name: attachment.name
				}
			}

			if (editing) {
				const msgToEdit = await channel.messages.fetch(editing)
				const existingFiles = []
				for (const att of msgToEdit.attachments.values()) {
					const res = await fetch(att.url)
					const buf = await res.arrayBuffer()
					existingFiles.push({
						attachment: Buffer.from(buf),
						name: att.name
					})
				}

				const editPayload = {
					content: content ?? ''
				}

				// Attachment logic
				if (force) {
					// Force replace: if file exists, use it; else clear attachments
					editPayload.files = file ? [file] : []
				} else if (file) {
					// Add new attachment
					editPayload.files = [...existingFiles, file]
				}

				await interaction.reply({
					content: 'Message successfully edited.',
					flags: MessageFlags.Ephemeral
				})
				return await channel.messages.edit(editing, editPayload)
			}

			const sentChannel = await channel.send({
				content: content ?? '',
				files: file ? [file] : []
			})
			await interaction.reply({ content: 'Message successfully sent', flags: MessageFlags.Ephemeral })

			if (interaction.guild.id === '420803245758480405') {
				const botLogsAdminChannel = '794608385106509824'
				const logChannel = interaction.guild.channels.cache.get(botLogsAdminChannel)
				await logChannel.send({
					content: `${interaction.member.toString()} sent a message to <#${sentChannel.channelId}>`
				})
			}
		} catch (err) {
			if (err.code === 10008) {
				return await interaction.reply({
					content: 'Error. Unable to find message. Make sure you have the correct message ID.',
					flags: MessageFlags.Ephemeral
				})
			} else {
				return await interaction.reply({
					content: `Error. ${err.rawError?.message || err.message || 'Unknown error'}. Unable to send message.`,
					flags: MessageFlags.Ephemeral
				})
			}
		}
	}
}
