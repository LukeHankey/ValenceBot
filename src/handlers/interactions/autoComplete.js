export const autoComplete = async (interaction) => {
	const client = interaction.client
	const focusedValue = interaction.options.getFocused()
	// eslint-disable-next-line array-callback-return
	const choices = [...client.commands.values()].filter((command) => {
		if ((command.slash || command.menu) && (command.guildSpecific.includes(interaction.guild.id) || command.guildSpecific === 'all')) {
			return command
		}
	})

	const filtered = choices
		.filter((choice) => choice.name.startsWith(focusedValue))
		.map((slash) => ({ name: slash.name, value: slash.name }))
	interaction.respond(filtered)
}
