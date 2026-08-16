import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from 'discord.js'

/**
 * Strip a name to letters and digits for comparison.
 *
 * Discord slugifies channel names: "Ticket by Praise Lord Helix" is created as
 * `ticket-by-praise-lord-helix`, and punctuation is dropped entirely, so
 * "berx/0 enrage" becomes `berx0-enrage`. Matching a channel name against a
 * raw display name therefore failed for anyone whose name was not a single
 * plain word, and they could open a second ticket while one was still open.
 * Thread names keep their spacing, so this only bit the Channels preference —
 * comparing compacted forms works for both.
 */
const compact = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

export default class Ticket {
	constructor(interaction, ticketData, database, category = null) {
		this.interaction = interaction
		this.ticketData = ticketData
		this.database = database
		this.category = category
	}

	get currentTicket() {
		const [ticket] = this.ticketData.ticket.filter((t) => t.messageId === this.interaction.message.id)
		return ticket
	}

	get preference() {
		return this.currentTicket.prefer
	}

	get roleId() {
		return this.currentTicket.role
	}

	get member() {
		return this.interaction.member
	}

	isApplication() {
		return this.currentTicket.application
	}

	async hasOpenTicket() {
		const guild = this.interaction.guild
		const memberId = this.member.id
		const preference = this.preference
		const userDisplayName = compact(this.member.displayName)
		const ticketPrefix = this.isApplication() ? 'application' : 'ticket'

		// Search based on preference
		if (preference === 'Threads') {
			const threads = this.interaction.channel.threads.cache
			// Check all threads in the current channel
			if (threads.size === 0) return null

			// Find all matching threads for this user
			const matchingThreads = threads.filter((thread) => {
				if (thread.type !== ChannelType.PrivateThread || thread.archived || thread.locked) return false

				const threadName = compact(thread.name)
				return threadName.includes(ticketPrefix) && threadName.includes(userDisplayName)
			})

			if (matchingThreads.size === 0) return null

			// For applications, just return the first thread (user isn't a member)
			if (this.isApplication()) {
				return matchingThreads.first()
			}

			// For regular tickets, check each thread for category match
			for (const [, thread] of matchingThreads) {
				try {
					const members = await thread.members.fetch()
					if (!members.has(memberId)) continue

					// If no category specified, any open ticket counts
					if (!this.category) return thread

					// Check if category matches by fetching starter message
					const initialMessage = await thread.fetchStarterMessage()
					if (initialMessage && initialMessage.content.includes(`**Category:** ${this.category}`)) {
						return thread
					}
				} catch (e) {
					continue
				}
			}

			return null
		} else {
			// Channels preference - check all channels in the same parent
			const ticketChannel = guild.channels.cache.get(this.currentTicket.channelId)
			if (!ticketChannel) return null

			const parentId = ticketChannel.parentId

			// Find all matching channels for this user
			const matchingChannels = guild.channels.cache.filter((channel) => {
				if (channel.type !== ChannelType.GuildText || channel.parentId !== parentId) return false

				const channelName = compact(channel.name)
				return channelName.includes(ticketPrefix) && channelName.includes(userDisplayName)
			})

			if (matchingChannels.size === 0) return null

			// For applications, just return the first channel (user doesn't have permissions)
			if (this.isApplication()) {
				return matchingChannels.first()
			}

			// For regular tickets, check each channel for category match
			for (const [, channel] of matchingChannels) {
				try {
					// Check if ticket has been closed by checking the button text
					const pinnedMessages = await channel.messages.fetchPinned()
					const initialMessage = pinnedMessages.first()

					// If the button says "Issue resolved", the ticket is closed
					if (initialMessage?.components?.[0]?.components?.[0]?.data?.label === 'Issue resolved') {
						continue
					}

					// Check if user has ViewChannel permission (for open tickets)
					const hasAccess = channel.permissionOverwrites.cache.has(memberId)
					if (!hasAccess) continue

					const perms = channel.permissionOverwrites.cache.get(memberId)
					if (!perms.allow.has('ViewChannel')) continue

					// If no category specified, any open ticket counts
					if (!this.category) return channel

					// Check if category matches
					if (initialMessage && initialMessage.content.includes(`**Category:** ${this.category}`)) {
						return channel
					}
				} catch (e) {
					continue
				}
			}

			return null
		}
	}

	async create() {
		let newChannel
		// No boost check: Discord removed the Tier 2 requirement for private
		// threads in 2022, so every server can create them. Requiring it meant
		// unboosted servers that asked for Threads silently got Channels, plus a
		// DM telling them about a restriction that no longer exists.
		if (this.preference === 'Threads') {
			newChannel = await this.interaction.channel.threads.create({
				name: `${this.isApplication() ? 'Application' : 'Ticket'} by ${this.interaction.member.displayName}`,
				autoArchiveDuration: 1440,
				type: ChannelType.PrivateThread,
				invitable: false,
				reason: !this.isApplication() ? 'Ticket for report.' : 'Application'
			})
		} else {
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

	async _sendInitialResponse(channel, memberId) {
		const resolveButton = new ActionRowBuilder().addComponents([
			new ButtonBuilder()
				.setCustomId('Close Ticket')
				.setLabel('Close Ticket')
				.setStyle(ButtonStyle.Success)
				.setEmoji({ name: '❗' })
		])

		if (!this.isApplication()) {
			const categoryText = this.category ? `**Category:** ${this.category}\n\n` : ''
			const msg = await channel.send({
				content: `${categoryText}Hello <@!${memberId}>, a member of <@&${this.roleId}> will be with you shortly.`,
				components: [resolveButton]
			})
			await msg.pin()
		} else {
			const msg = await channel.send({
				content: `Hello <@&${this.roleId}>, ${this.interaction.member.displayName} (${memberId}) has submitted a new application! Please review and get back to them ASAP. They have been notified that their application is in review.`
			})
			await msg.react('✅')
			await msg.react('❌')
		}
	}
}
