/**
 * Ticket-panel cleanup only. Deleted calls in #dsf-calls are handled by
 * DSFMessaging (src/messaging), which can read them: see handleDeletedCall.
 */
export default async (client, message) => {
	const db = client.database.settings
	client.logger.debug(`messageDelete start: guild=${message.guild?.id} channel=${message.channel?.id} message=${message.id}`)
	const ticketData = await db.findOne({ _id: message.guild.id }, { projection: { ticket: 1 } })

	if (!ticketData || !ticketData.ticket) {
		client.logger.debug(`messageDelete early return: missing ticket config for guild=${message.guild.id}`)
		return
	}
	const [currentTicket] = ticketData.ticket.filter((t) => t.messageId === message.id)
	if (currentTicket) {
		if (message.id === currentTicket.messageId) {
			client.logger.debug(`messageDelete matched ticket message: ${message.id}`)
			return await db.findOneAndUpdate(
				{ _id: message.guild.id },
				{
					$pull: {
						ticket: { messageId: message.id }
					}
				}
			)
		}
	}
}
