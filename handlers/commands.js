/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const { readdirSync } = require("fs");

module.exports = client => {
	const load = dirs => {
		const commandFiles = readdirSync(`./commands/${dirs}/`)
			.filter(d => d.endsWith(".js"));

		for (const file of commandFiles) {
			const command = require(`../commands/${dirs}/${ file }`);
			client.commands.set(command.name, command);
		}
	};
	["all"].forEach(x => load(x));
};