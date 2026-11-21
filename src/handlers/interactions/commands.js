import { Permissions } from '../../classes.js'
import { MessageFlags } from 'discord.js'
import { recordCommandUse } from '../../dsf/commandUsage.js'

export const commands = async (client, interaction, data) => {
	const db = client.database.settings
	const channels = await client.database.channels
	// guildId and channelId are always on the interaction; interaction.channel
	// is null when the channel is not cached, e.g. a thread the bot has not seen.
	const commandDB = await db.findOne({ _id: interaction.guildId }, { projection: { prefix: 1, roles: 1 } })
	const command = client.commands.get(interaction.commandName)
	if (!command) return

	const aR = new Permissions('adminRole', commandDB, interaction)
	const mR = new Permissions('modRole', commandDB, interaction)
	const owner = new Permissions('owner', commandDB, interaction)

	const perms = {
		owner: owner.botOwner(),
		admin:
			interaction.member.roles.cache.has(aR.memberRole()[0]) ||
			interaction.member.roles.cache.has(aR.roleId) ||
			interaction.member.id === interaction.guild.ownerId,
		mod:
			interaction.member.roles.cache.has(mR.memberRole()[0]) ||
			interaction.member.roles.cache.has(mR.roleId) ||
			mR.modPlusRoles() >= mR._role.rawPosition ||
			interaction.member.id === interaction.guild.ownerId,
		errorO: owner.ownerError(),
		errorM: mR.error(),
		errorA: aR.error()
	}

	try {
		if (interaction.guildId === '420803245758480405' && interaction.channelId === data.eventChannel.otherChannelID) {
			return interaction.reply({ content: 'Please use the bot commands channel.', flags: MessageFlags.Ephemeral })
		} else {
			await command.slash(client, interaction, perms)
			// After the run, so a command that throws is not counted as used.
			await recordCommandUse(db, interaction.commandName)
		}
	} catch (error) {
		channels.errors.send(error, {
			command: `/${interaction.commandName}`,
			user: interaction.user?.tag,
			guild: interaction.guild?.name
		})
		await interaction.reply({
			content: 'There was an error while executing this command!',
			flags: MessageFlags.Ephemeral
		})
	}
}
