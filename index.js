const { Client, Collection } = require("discord.js");
require("dotenv").config();

const client = new Client();
client.commands = new Collection();

["commands", "events"].forEach(x => require(`./handlers/${x}`)(client));

process.on("unhandledRejection", (reason, p) => {
	console.log("Unhandled Rejection at:", p, "reason:", reason);
});

client.login(process.env.BOT_TOKEN);