export default {
	name: 'Affiliate Events',
	description: 'Context menu which pings the affiliate events role.',
	type: 'menu',
	guildSpecific: ['420803245758480405', '668330890790699079'],
	permissionLevel: 'Everyone',
	data: {
		name: 'Affiliate Events',
		type: 3
	},
	menu: async (interaction) => {
		await interaction.deferReply({ ephemeral: true })
		const role = interaction.guild.roles.cache.find(role => role.name === 'Affiliate Events')
		if (interaction.channel.id !== '881320233627967508') { // extra-role-pings
			return await interaction.editReply({ content: 'Please use the <#881320233627967508> channel.', ephemeral: true })
		}
		await interaction.editReply({ content: 'Delete me.', ephemeral: true })
		await interaction.channel.send({ content: `<@&${role.id}>` })
	}
}
