/* eslint-disable no-inline-comments */
import { SlashCommandBuilder } from '@discordjs/builders'
import { EmbedBuilder } from 'discord.js'
import Color from '../colors.js'

const description = [
	'Shows the current Vis Wax combinations.',
	'Upload an image of the current Vis wax combinations or a message link which includes an attachment.',
	'Force reset of image.'
]

export default {
	name: 'vis',
	description,
	usage: ['', '<image URL or discord message link>', 'new'],
	guildSpecific: 'all',
	permissionLevel: 'Everyone',
	data: new SlashCommandBuilder()
		.setName('vis')
		.setDescription(description[0])
		.addSubcommand((subcommand) => subcommand.setName('wax').setDescription('Todays Vis Wax combinations.')),
	// 	.addSubcommand(subcommand =>
	// 		subcommand
	// 			.setName('other_commands')
	// 			.setDescription('Shows other vix wax commands')
	// 			.addIntegerOption(option =>
	// 				option.setName('reset')
	// 					.setDescription(`${description[2]} [ADMIN]`)
	// 					.addChoice('True', 1))),
	// // Add back when files are allowed to be uploaded with slash commands
	// .addStringOption(option =>
	// 	option.setName('upload')
	// 		.setDescription(`${description[1]}`)
	// 		.addChoice('File', 'file_upload')
	// 		.addChoice('Message Link', 'message_link')
	// 		.addChoice('Image URL', 'image_url')));
	slash: async (client, interaction, perms) => {
		const db = client.database.settings
		const channels = await client.database.channels
		const { visTime, vis, visContent } = await db.findOne(
			{ _id: 'Globals' },
			{ projection: { visTime: 1, vis: 1, visContent: 1 } }
		)
		if (!interaction.options.getInteger('reset')) {
			let currentDate = new Date().toUTCString()
			currentDate = currentDate.split(' ')
			// eslint-disable-next-line no-unused-vars
			const [day, month, year, ...rest] = currentDate.slice(1)
			const savedDate = visTime.toString().split(' ')

			if (year !== savedDate[3] || month !== savedDate[1] || day !== savedDate[2]) {
				interaction.reply({
					content:
						'No current Vis out yet! Use `;vis [Image URL or Message Link]` to update the command. I will ping you when the stock is out.'
				})
				return await db.updateOne(
					{ _id: 'Globals' },
					{
						$set: {
							vis: null,
							visContent: []
						},
						$addToSet: {
							visCache: {
								$each: [
									{
										user: interaction.user.id,
										channel: interaction.channel.id,
										guild: interaction.guild.id
									}
								]
							}
						}
					}
				)
			}
			if (vis === null && visContent.length === 0) {
				await db.updateOne(
					{ _id: 'Globals' },
					{
						$addToSet: {
							visCache: {
								$each: [
									{
										user: interaction.user.id,
										channel: interaction.channel.id,
										guild: interaction.guild.id
									}
								]
							}
						}
					}
				)
				return await interaction.reply({
					content:
						'No current Vis out yet! Use `;vis [Image URL or Message Link]` to update the command. I will ping you when the stock is out.'
				})
			} else if (vis) {
				return interaction.reply({
					content: `**Image uploaded at:** <t:${
						Math.round(Date.parse(visTime)) / 1000
					}>\nSource: [Vis Wax Server](https://discord.gg/wv9Ecs4)`,
					files: [vis]
				})
			} else {
				const content = visContent.flat()
				const slotOneIndex = content.findIndex((el) => el.match(/slot/i))
				const newContent = content.slice(slotOneIndex).map((el) => {
					const match = el.match(/<:[\w_]{1,14}:\d{1,19}>/g)
					if (match) {
						el = el.trim().slice(match[0].length)
						return `\t${el}`
					}
					return el
				})

				return await interaction.reply({
					content: `**Image uploaded at:** <t:${
						Math.round(Date.parse(visTime)) / 1000
					}>\nSource: [Vis Wax Server](https://discord.gg/wv9Ecs4)\n${newContent.join('\n')}`
				})
			}
		} else if (interaction.options.getInteger('reset')) {
			if (!perms.owner) return await interaction.reply(perms.errorO)
			if (vis === null) {
				return interaction.reply({
					content: "There currently isn't any Vis Wax image uploaded.",
					ephemeral: true
				})
			} else {
				await db.updateOne(
					{ _id: 'Globals' },
					{
						$set: {
							vis: null
						}
					}
				)
				return channels.vis.send(
					`${interaction.member.user.tag} reset the Vis command in **${interaction.channel.guild.name}.**`
				)
			}
		}
	},
	run: async (client, message, args, _) => {
		const db = client.database.settings
		const channels = await client.database.channels
		const [...attachment] = args

		const embed = new EmbedBuilder()
			.setTitle('New Vis Wax Upload')
			.setDescription(
				`**${message.member.nickname ?? message.author.tag}** uploaded a new Vis Wax Image from Server:\n**${
					message.guild.name
				}** - ${message.guild.id}.`
			)
			.setTimestamp()
			.setThumbnail(message.author.displayAvatarURL())
			.setColor(Color.cream)

		const { visTime, vis, visContent } = await db.findOne(
			{ _id: 'Globals' },
			{ projection: { visTime: 1, vis: 1, visContent: 1 } }
		)
		if (!args.length && !message.attachments.size) {
			try {
				let currentDate = new Date().toUTCString()
				currentDate = currentDate.split(' ')
				// eslint-disable-next-line no-unused-vars
				const [day, month, year, ...rest] = currentDate.slice(1)
				const savedDate = visTime.toString().split(' ')

				if (year !== savedDate[3] || month !== savedDate[1] || day !== savedDate[2]) {
					message.channel.send({
						content:
							'No current Vis out yet! Use `;vis [Image URL or Message Link]` to update the command. I will ping you when the stock is out.'
					})
					await db.updateOne(
						{ _id: 'Globals' },
						{
							$set: {
								vis: null,
								visContent: []
							}
						}
					)
					return await db.updateOne(
						{ _id: 'Globals' },
						{
							$addToSet: {
								visCache: {
									user: message.author.id,
									channel: message.channel.id,
									guild: message.guild.id
								}
							}
						}
					)
				}

				if (vis === null && visContent.length === 0) {
					await db.updateOne(
						{ _id: 'Globals' },
						{
							$addToSet: {
								visCache: {
									user: message.author.id,
									channel: message.channel.id,
									guild: message.guild.id
								}
							}
						}
					)
					return message.channel.send({
						content:
							'No current Vis out yet! Use `;vis [Image URL or Message Link]` to update the command. I will ping you when the stock is out.'
					})
				} else if (vis) {
					return message.channel.send({
						content: `**Image uploaded at:** <t:${
							Math.round(Date.parse(visTime)) / 1000
						}>\nSource: Vis Wax Server | <https://discord.gg/wv9Ecs4>`,
						files: [vis]
					})
				} else {
					const content = visContent.flat()
					const slotOneIndex = content.findIndex((el) => el.match(/slot/i))
					const newContent = content.slice(slotOneIndex).map((el) => {
						const match = el.match(/<:[\w_]{1,14}:\d{1,19}>/g)
						if (match) {
							el = el.trim().slice(match[0].length)
							return `\t${el}`
						}
						return el
					})

					return await message.channel.send({
						content: `**Image uploaded at:** <t:${
							Math.round(Date.parse(visTime)) / 1000
						}>\nSource: Vis Wax Server | <https://discord.gg/wv9Ecs4>\n${newContent.join('\n')}`
					})
				}
			} catch (err) {
				await db.updateOne(
					{ _id: 'Globals' },
					{
						$addToSet: {
							visCache: {
								user: message.author.id,
								channel: message.channel.id,
								guild: message.guild.id
							}
						}
					}
				)
				return message.channel.send({
					content:
						'No current Vis out yet! Use `;vis [Image URL or Message Link]` to update the command. I will ping you when the stock is out.'
				})
			}
		} else {
			// Image URL
			const array = ['gif', 'jpeg', 'tiff', 'png', 'webp', 'bmp', 'prnt.sc', 'gyazo.com']
			if (message.attachments.size) {
				message.react('✅')
				return channels.vis
					.send({ embeds: [embed.setImage(message.attachments.first().url)] })
					.then(async () => {
						return await db.updateOne(
							{ _id: 'Globals' },
							{
								$set: {
									vis: message.attachments.first().url,
									visTime: message.createdAt
								}
							}
						)
					})
					.catch(async (err) => channels.errors.send(err))
			} else if (array.some((x) => attachment[0].includes(x))) {
				message.react('✅')
				return channels.vis
					.send({ embeds: [embed.setImage(attachment[0])] })
					.then(async () => {
						return await db.updateOne(
							{ _id: 'Globals' },
							{
								$set: {
									vis: attachment[0],
									visTime: message.createdAt
								}
							}
						)
					})
					.catch(async (err) => channels.errors.send(err))
			} else if (attachment[0].includes('discord.com')) {
				// Discord message link
				const split = attachment[0].split('/')
				const [g, c, m] = split.slice(4)

				try {
					const guildFetch = await client.guilds.fetch(g)
					const channelFetch = await guildFetch.channels.cache.get(c)
					const messageFetch = await channelFetch.messages.fetch(m)
					const newEmbed = embed.setImage(`${messageFetch.attachments.first().attachment}`)
					channels.vis.send({ embeds: [newEmbed] })
					message.react('✅')
					return await db.updateOne(
						{ _id: 'Globals' },
						{
							$set: {
								vis: messageFetch.attachments.first().attachment,
								visTime: message.createdAt
							}
						}
					)
				} catch (e) {
					// Catch errors for a guild where the bot isn't in. Same for channel or message
					if (e.code === 50001) {
						if (e.url.includes('guilds')) {
							return message.channel.send({
								content: 'I am not in that server so I cannot access that message link.'
							})
						} else {
							return message.channel.send({
								content: 'I do not have access to that channel to view the message.'
							})
						}
					} else if (e.code === 10008) {
						if (e.rawError.message === 'Unknown Message') {
							return message.channel.send({
								content: 'I am unable to find that message. Maybe it has been deleted?'
							})
						}
					} else {
						channels.errors.send(e)
					}
				}
			} else {
				return message.channel.send({ content: "Couldn't find attachment/image." })
			}
		}
	}
}
