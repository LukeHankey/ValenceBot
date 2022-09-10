import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js'

export default class Ticket {
	constructor (interaction, ticketData, database) {
		this.interaction = interaction
		this.ticketData = ticketData
		this.database = database
	}

	get currentTicket () {
		const [ticket] = this.ticketData.ticket.filter((t) => t.messageId === this.interaction.message.id)
		return ticket
	}

	get preference () {
		return this.currentTicket.prefer
	}

	get roleId () {
		return this.currentTicket.role
	}

	get member () {
		return this.interaction.member
	}

	isApplication () {
		return this.currentTicket.application
	}

	async create () {
		let newChannel
		if (this.preference === 'Threads' && this._checkThreadsPreference()) {
			newChannel = await this.interaction.channel.threads.create({
				name: `${this.isApplication() ? 'Application' : 'Ticket'} by ${this.interaction.member.displayName}`,
				autoArchiveDuration: 1440,
				type: ChannelType.GuildPrivateThread,
				invitable: false,
				reason: !this.isApplication() ? 'Ticket for report.' : 'Application'
			})
		} else {
			if (this.preference === 'Threads') {
				const starter = await this.interaction.guild.members.fetch(this.currentTicket.ticketStarter)

				try {
					starter.send({
						content: `Hi ${starter.displayName}, your chosen preference for tickets in ${this.currentTicket.guildName} - <#${this.currentTicket.channelId}> was \`Threads\`. However, your server does not meet the required boost level (Tier 2) for private threads so I have switched you over to \`Channels\`. If this changes in the future, you can just re-run the ticket command again.`
					})
				} catch (e) {
					const channels = await this.database.channels
					channels.errors.send(e)
				}

				await this.database.collection.findOneAndUpdate(
					{ _id: this.interaction.guild.id, 'ticket.messageId': this.interaction.message.id },
					{
						$set: {
							'ticket.$.prefer': 'Channels'
						}
					}
				)
			}
			const permissionOverwrites = [
				// Ticket requester
				{
					id: this.interaction.member.id,
					allow: 'ViewChannel',
					type: 'member'
				},
				// Bot
				{
					id: this.interaction.message.author.id,
					allow: 'ViewChannel',
					type: 'member'
				},
				// Ticket responders
				{
					id: this.roleId,
					allow: 'ViewChannel',
					type: 'role'
				},
				// Everyone role
				{
					id: this.interaction.guild.id,
					deny: 'ViewChannel',
					type: 'role'
				}
			]
			newChannel = await this.interaction.guild.channels.create({
				name: `${this.isApplication() ? 'Application' : 'Ticket'} by ${this.interaction.member.displayName}`,
				parent: this.interaction.channel.parentId,
				reason: !this.isApplication() ? 'Ticket for report.' : 'Application',
				permissionOverwrites: this.isApplication() ? permissionOverwrites.slice(1) : permissionOverwrites
			})
		}

		// Brings in the user and all Staff
		await this._sendInitialResponse(newChannel, this.interaction.member.id)
		return newChannel
	}

	_checkThreadsPreference () {
		return !![2, 3].includes(this.interaction.guild.premiumTier)
	}

	async _sendInitialResponse (channel, memberId) {
		const resolveButton = new ActionRowBuilder().addComponents([
			new ButtonBuilder()
				.setCustomId('Resolve Issue')
				.setLabel('Resolve Issue')
				.setStyle(ButtonStyle.Success)
				.setEmoji({ name: '❗' })
		])

		if (!this.isApplication()) {
			channel.send({
				content: `Hello <@!${memberId}>, a member of <@&${this.roleId}> will be with you shortly.`,
				components: [resolveButton]
			})
		} else {
			const msg = await channel.send({
				content: `Hello <@&${this.roleId}>, ${this.interaction.member.displayName} (${memberId}) has submitted a new application! Please review and get back to them ASAP. They have been notified that their application is in review.`
			})
			await msg.react('✅')
			await msg.react('❌')
		}
	}
}
