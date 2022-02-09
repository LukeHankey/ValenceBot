import { MessageActionRow, MessageButton } from 'discord.js'

export default class Ticket {
	constructor (interaction, ticketData, database) {
		this.interaction = interaction
		this.ticketData = ticketData
		this.database = database
	}

	get preference () {
		return this.ticketData.ticket.prefer
	}

	get roleId () {
		return this.ticketData.ticket.role
	}

	async create () {
		let newChannel
		if (this.preference === 'Threads' && this._checkThreadsPreference()) {
			newChannel = await this.interaction.channel.threads.create({
				name: `Ticket by ${this.interaction.member.displayName}`,
				autoArchiveDuration: 1440,
				type: 'GUILD_PRIVATE_THREAD',
				invitable: false,
				reason: 'Ticket for report.'
			})
		} else {
			if (this.preference === 'Threads') {
				const ticketData = this.ticketData.ticket
				const starter = await this.interaction.guild.members.fetch(ticketData.ticketStarter)

				try {
					starter.send({ content: `Hi ${starter.displayName}, your chosen preference for tickets in ${ticketData.guildName} - <#${ticketData.channelId}> was \`Threads\`. However, your server does not meet the required boost level (Tier 2) for private threads so I have switched you over to \`Channels\`. If this changes in the future, you can just re-run the ticket command again.` })
				} catch (e) {
					const channels = await this.database.channels
					channels.errors.send(e)
				}

				await this.database.collection.updateOne({ _id: this.interaction.guild.id }, {
					$set: {
						'ticket.prefer': 'Channels'
					}
				})
			}
			newChannel = await this.interaction.guild.channels.create(
				`Ticket by ${this.interaction.member.displayName}`,
				{
					parent: this.interaction.channel.parentId,
					reason: 'Ticket for report.',
					permissionOverwrites: [
						// Ticket requester
						{
							id: this.interaction.member.id,
							allow: 'VIEW_CHANNEL',
							type: 'member'
						},
						// Bot
						{
							id: this.interaction.message.author.id,
							allow: 'VIEW_CHANNEL',
							type: 'member'
						},
						// Ticket responders
						{
							id: this.roleId,
							allow: 'VIEW_CHANNEL',
							type: 'role'
						},
						// Everyone role
						{
							id: this.interaction.guild.id,
							deny: 'VIEW_CHANNEL',
							type: 'role'
						}
					]
				}
			)
		}

		// Brings in the user and all Staff
		this._sendInitialResponse(newChannel, this.interaction.member.id)
		return newChannel
	}

	_checkThreadsPreference () {
		return !!['TIER_2', 'TIER_3'].includes(this.interaction.guild.premiumTier)
	}

	_sendInitialResponse (channel, memberId) {
		const resolveButton = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId('Resolve Issue')
					.setLabel('Resolve Issue')
					.setStyle('SUCCESS')
					.setEmoji('❗')
			)

		channel.send({ content: `Hello <@!${memberId}>, a member of <@&${this.roleId}> will be with you shortly.`, components: [resolveButton] })
	}
}
