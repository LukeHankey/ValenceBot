const { Client, Collection } = require('discord.js');
const connection = require('./mongodb').initDb;
require('dotenv').config();

const client = new Client({ intents: [ 'GUILDS', 'GUILD_MEMBERS', 'GUILD_INTEGRATIONS', 'GUILD_WEBHOOKS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS', 'DIRECT_MESSAGES'], partials: ['MESSAGE', 'REACTION', 'CHANNEL'] });
client.commands = new Collection();

['commands', 'events'].forEach(x => require(`./handlers/${x}`)(client));

process.on('unhandledRejection', (reason, p) => {
	console.log('Unhandled Rejection at:', p, 'reason:', reason);
});

connection(err => { if (err) console.log(err);});
console.log(process.env.NODE_ENV);

client.login(process.env.BOT_TOKEN);