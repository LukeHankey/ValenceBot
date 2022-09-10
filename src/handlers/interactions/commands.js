import { Permissions } from '../../classes.js'

export const commands = async (interaction, db, data) => {
	const client = interaction.client
	const channels = await db.channels
	const commandDB = await db.collection.findOne(
		{ _id: interaction.channel.guild.id },
		{ projection: { prefix: 1, roles: 1 } }
	)
	const command = client.commands.get(interaction.commandName)
	if (!command) return

	const aR = new Permissions('adminRole', commandDB, interaction)
	const mR = new Permissions('modRole', commandDB, interaction)
	const owner = new Permissions('owner', commandDB, interaction)

	const perms = {
		owner: owner.botOwner(),
		admin:
			interaction.member.roles.cache.has(aR.memberRole()[0]) ||
			interaction.member.roles.cache.has(aR.roleID) ||
			interaction.member.id === interaction.channel.guild.ownerId,
		mod:
			interaction.member.roles.cache.has(mR.memberRole()[0]) ||
			interaction.member.roles.cache.has(mR.roleID) ||
			mR.modPlusRoles() >= mR._role.rawPosition ||
			interaction.member.id === interaction.channel.guild.ownerId,
		errorO: owner.ownerError(),
		errorM: mR.error(),
		errorA: aR.error()
	}

	try {
		const merchGuilds = ['420803245758480405', '668330890790699079']
		if (
			merchGuilds.includes(interaction.guildId) &&
			[data.merchChannel.channelID, data.merchChannel.otherChannelID].includes(interaction.channel.id)
		) {
			return interaction.reply({ content: 'Please use the bot commands channel.', ephemeral: true })
		} else {
			await command.slash(interaction, perms, db)
		}
	} catch (error) {
		channels.errors.send(error)
		await interaction.reply({
			content: 'There was an error while executing this command!',
			ephemeral: true
		})
	}
}
