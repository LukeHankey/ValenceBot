const { Client, Collection } = require("discord.js");
const connection = require("./mongodb").initDb;
require("dotenv").config();

const client = new Client();
client.commands = new Collection();

["commands", "events"].forEach(x => require(`./handlers/${x}`)(client));

process.on("unhandledRejection", (reason, p) => {
	console.log("Unhandled Rejection at:", p, "reason:", reason);
});

connection(err => { if (err) console.log(err)})

client.login(process.env.BOT_TOKEN);