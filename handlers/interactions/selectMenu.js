export const selectMenu = async (interaction, _, db) => {
	const client = interaction.client
	const channels = await db.channels

	if (interaction.guild === null) {
		// DSF Specific
		const serverName = interaction.message.content.split('\n')[0]
		const dmData = await db.collection.findOne({ serverName }, { projection: { merchChannel: { components: 1, deletions: 1 } } })
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
					await db.collection.updateOne({ serverName: 'Deep Sea Fishing' }, {
						$pull: {
							'merchChannel.components': thisSelection[0]
						}
					})
				} else {
					interaction.followUp({ content: 'Thank you for responding.' })
					buttonMessage.edit({ components: [] })
					await db.collection.updateOne({ serverName: 'Deep Sea Fishing' }, {
						$pull: {
							'merchChannel.components': thisSelection[0]
						}
					})
				}
			} catch (err) {
				channels.errors.send(err)
			}
		}
	} else {
		const [...keys] = interaction.values
		console.log(keys, interaction.guild.id)
		for (const key of keys) {
			await db.collection.updateOne({ _id: interaction.guild.id },
				{
					$pull: {
						messageList: { key: Number(key) }
					}
				})
		}
		await interaction.update({ content: `${keys.length === 1 ? `${keys.length} entry removed.` : `${keys.length} entries removed`}`, components: [] })
	}
}
