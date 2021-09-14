const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
require('dotenv').config();

const commands = [];
const commandFiles = fs.readdirSync('./commands/all').filter(file => file.endsWith('.js'));

// Place your client and guild ids here
const clientId = '668330399033851924';
// eslint-disable-next-line no-unused-vars
// eslint-disable-next-line no-inline-comments
const guildId = '420803245758480405'; // DSF
// const guildId = '472448603642920973'; // Valence
// const guildId = '668330890790699079'; // Test

// Comment out to remove all guild-specific commands
for (const file of commandFiles) {
	const command = require(`./commands/all/${file}`);
	if (!command.data) continue;
	if (['nick', 'events', 'calendar'].includes(command.name)) continue;
	commands.push(command.data.toJSON());
}
// console.log(commands);

// Context Menu

const menuData = {
	name: 'Skull this message.',
	type: 3,
};

// commands.push(menuData);

const rest = new REST({ version: '9' }).setToken(process.env.BOT_TOKEN);

(async () => {
	try {
		console.log('Started refreshing application (/) commands.');

		// Valence done
		// Add menu to dsf when its gone
		const gcoms = await rest.get(
			Routes.applicationGuildCommands(clientId, guildId),
			// { body: commands },
		);
		console.log(1, gcoms);

		// const coms = await rest.get(
		// 	Routes.applicationCommands(clientId),
		// 	// { body: commands },
		// );
		// console.log(2, coms);

		console.log('Successfully reloaded application (/) commands.');
	}
	catch (error) {
		console.error(error);
	}
})();