import { getDb } from '../../mongodb.js'
import { MessageEmbed, MessageButton, MessageActionRow, MessageSelectMenu } from 'discord.js'
import { Permissions } from '../../classes.js'
import { redDark } from '../../colors.js'

export default async (client, interaction) => {
	const db = getDb()
	const settings = db.collection('Settings')
	const data = await settings.findOne({ _id: interaction.guildId }, { projection: { merchChannel: { components: 1, channelID: 1, otherChannelID: 1 } } })
	const { channels: { errors, logs } } = await settings.findOne({ _id: 'Globals' }, { projection: { channels: { errors: 1, logs: 1 } } })

	const channels = {
		errors: {
			id: errors,
			embed: function (err) {
				const filePath = import.meta.url.split('/')
				const fileName = filePath[filePath.length - 1]
				const embed = new MessageEmbed()
					.setTitle(`An error occured in ${fileName}`)
					.setColor(redDark)
					.addField(`${err.message}`, `\`\`\`${err.stack}\`\`\``)
				return embed
			},
			send: function (...args) {
				const channel = client.channels.cache.get(this.id)
				return channel.send({ embeds: [this.embed(...args)] })
			}
		},
		logs: {
			id: logs,
			send: function (content) {
				const channel = client.channels.cache.get(this.id)
				return channel.send({ content })
			}
		}
	}

	if (interaction.isButton()) {
		const userMessageId = interaction.message.content.split(' ')[3]
		const thisButton = data.merchChannel.components.filter(b => {
			return b.messageID === userMessageId
		})
		if (!thisButton.length) return await interaction.reply({ content: 'Unable to find message related with this button.', ephemeral: true })

		try {
			switch (interaction.customId) {
			case thisButton[0].primaryID: {
				const selectID = `select_${thisButton[0].userID}`
				const menu = new MessageActionRow()
					.addComponents(
						new MessageSelectMenu()
							.setCustomId(selectID)
							.setPlaceholder('Nothing selected')
							.addOptions([
								{
									label: 'Yes, this was a password.',
									description: 'Select this option to automatically remove it from our logs.',
									value: 'yes'
								},
								{
									label: 'No, this was not a password.',
									value: 'no'
								}
							])
					)
				const dateTime = new Date(thisButton[0].time).toUTCString()
				const potentialPassowrd = thisButton[0].content
				const serverName = interaction.member.guild.name

				const passwordDM = `${serverName}\n\nHello.\n\nWe saw you typed into the #merch-calls channel on ${dateTime} and the Deep Sea Fishing Admins have flagged this as a potential password which is why you are receiving this DM. That specific channel has all messages logged.\n\nYour message content: ${potentialPassowrd}\n\nIf it is a password, then we recommend that you change it ASAP, even though it got deleted straight away. Please respond with one of the selections to let our Admins know if we should also delete that message from our message logs.\n\nDSF Admin Team.`

				const fetchUser = await interaction.guild.members.fetch(thisButton[0].userID)
				const sentDM = await fetchUser.send({ content: passwordDM, components: [menu] })
				const row = new MessageActionRow()
					.addComponents(new MessageButton(interaction.message.components[0].components[0]).setEmoji('📩').setLabel('DM sent...').setDisabled())
				await interaction.update({ components: [row] })
				console.log(`Action: Password Button\nBy: ${interaction.user.username}\nUser: ${fetchUser.user.username}`)
				await settings.updateOne({ _id: interaction.guildId, 'merchChannel.components.messageID': userMessageId }, {
					$set: {
						'merchChannel.components.$.selectID': selectID,
						'merchChannel.components.$.selectMessageID': sentDM.id
					}
				})
			}
				break
			case thisButton[0].dangerID: {
				const content = interaction.message.content.split('\n')
				await interaction.update({ components: [] })
				console.log(`Action: Clear Button\nBy: ${interaction.user.username}\nContent: ${content.slice(3).join(' ')}`)
				await settings.updateOne({ _id: interaction.guildId }, {
					$pull: {
						'merchChannel.components': thisButton[0]
					}
				})
			}
			}
		} catch (err) {
			channels.errors.send(err)
		}
	} else if (interaction.isCommand()) {
		const commandDB = await settings.findOne({ _id: interaction.channel.guild.id }, { projection: { prefix: 1, roles: 1 } })
		const command = client.commands.get(interaction.commandName)
		if (!command) return

		const aR = new Permissions('adminRole', commandDB, interaction)
		const mR = new Permissions('modRole', commandDB, interaction)
		const owner = new Permissions('owner', commandDB, interaction)

		const perms = {
			owner: owner.botOwner(),
			admin: interaction.member.roles.cache.has(aR.memberRole()[0]) || interaction.member.roles.cache.has(aR.roleID) || interaction.member.id === interaction.channel.guild.ownerId,
			mod: interaction.member.roles.cache.has(mR.memberRole()[0]) || interaction.member.roles.cache.has(mR.roleID) || mR.modPlusRoles() >= mR._role.rawPosition || interaction.member.id === interaction.channel.guild.ownerId,
			errorO: owner.ownerError(),
			errorM: mR.error(),
			errorA: aR.error()
		}

		try {
			const merchGuilds = ['420803245758480405', '668330890790699079']
			if (merchGuilds.includes(interaction.guildId) && [data.merchChannel.channelID, data.merchChannel.otherChannelID].includes(interaction.channel.id)) {
				return interaction.reply({ content: 'Please use the bot commands channel.', ephemeral: true })
			} else {
				await command.slash(interaction, perms, channels, settings)
			}
		} catch (error) {
			channels.errors.send(error)
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true })
		}
	} else if (interaction.isAutocomplete()) {
		const focusedValue = interaction.options.getFocused()
		// eslint-disable-next-line array-callback-return
		const choices = [...client.commands.values()].filter(command => {
			if (command.slash && (command.guildSpecific.includes(interaction.guild.id) || command.guildSpecific === 'all')) {
				return command
			}
		})

		const filtered = choices.filter(choice => choice.name.startsWith(focusedValue)).map(slash => ({ name: slash.name, value: slash.name }))
		interaction.respond(filtered)
	} else if (interaction.isSelectMenu()) {
		const serverName = interaction.message.content.split('\n')[0]
		const dmData = await settings.findOne({ serverName }, { projection: { merchChannel: { components: 1, deletions: 1 } } })
		const thisSelection = dmData.merchChannel.components.filter(b => {
			return b.selectMessageID === interaction.message.id
		})
		if (interaction.customId === thisSelection[0].selectID) {
			try {
				await interaction.update({ components: [] })
				const errorChannel = client.channels.cache.get('794608385106509824')
				const buttonMessage = await errorChannel.messages.fetch(thisSelection[0].buttonMessageID)
				if (interaction.values.includes('yes')) {
					await interaction.followUp({ content: 'Thank you for responding, the log has been automatically removed.' })
					await buttonMessage.delete()
					errorChannel.send({ content: `A password was confirmed by <@!${thisSelection[0].userID}> and the message has been deleted.` })
					await settings.updateOne({ serverName: 'Deep Sea Fishing' }, {
						$pull: {
							'merchChannel.components': thisSelection[0]
						}
					})
				} else {
					interaction.followUp({ content: 'Thank you for responding.' })
					buttonMessage.edit({ components: [] })
					await settings.updateOne({ serverName: 'Deep Sea Fishing' }, {
						$pull: {
							'merchChannel.components': thisSelection[0]
						}
					})
				}
			} catch (err) {
				channels.errors.send(err)
			}
		}
	} else if (interaction.isContextMenu()) {
		switch (interaction.commandName) {
		case 'Mark event as dead.':
			if ([data.merchChannel.channelID, data.merchChannel.otherChannelID].includes(interaction.channel.id)) {
				interaction.deferReply({ ephemeral: true })
				try {
					const dsfServerErrorChannel = await client.channels.cache.get('884076361940078682')
					const message = interaction.channel.messages.cache.get(interaction.targetId)
					const reaction = await message.react('☠️')
					const userReactCollection = await reaction.users.fetch()
					const timestamp = interaction.createdAt.toString().split(' ').slice(0, 5).join(' ')
					if (userReactCollection.size > 1) {
						return await interaction.editReply({ content: 'This call is already marked as dead.' })
					}
					await interaction.editReply({ content: 'Thank you for marking this call as dead.' })
					dsfServerErrorChannel.send({ content: `\`\`\`diff\n\n+ Reaction Added by ${interaction.member.displayName} - Content: ${message.content}\n- User ID: ${interaction.member.id}\n- Timestamp: ${timestamp}\`\`\`` })
				} catch (err) {
					if (err.code === 50001) {
						// Missing Access
						return await interaction.editReply({ content: 'I am not able to access this channel.' })
					}
					channels.errors.send(err)
				}
			} else {
				interaction.reply({ content: 'You can\'t use that in this channel.', ephemeral: true })
			}
			break
		case 'Affiliate Events': {
			const role = interaction.guild.roles.cache.find(role => role.name === 'Affiliate Events')
			await interaction.reply({ content: `<@&${role.id}>`, allowedMentions: { parse: ['roles'] } })
		}
		}
	}
}
