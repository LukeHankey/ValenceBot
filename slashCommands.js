const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
require('dotenv').config();

const commands = [];
const commandFiles = fs.readdirSync('./commands/all').filter(file => file.endsWith('.js'));

// Place your client and guild ids here
const clientId = '668330399033851924';
// eslint-disable-next-line no-unused-vars
const guildId = '668330890790699079';

// Comment out to remove all guild-specific commands
for (const file of commandFiles) {
	const command = require(`./commands/all/${file}`);
	if (command.name !== 'send_guild') continue;
	if (!command.data) continue;
	commands.push(command.data.toJSON());
}
console.log(commands);

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands },
		);

		// await rest.put(
		// 	Routes.applicationCommands(clientId),
		// 	{ body: commands },
		// );

		console.log('Successfully reloaded application (/) commands.');
	}
	catch (error) {
		console.error(error);
	}
})();