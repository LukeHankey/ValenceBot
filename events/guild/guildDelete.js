const getDb = require("../../mongodb").getDb;

module.exports = async (client, guild) => {
let db = getDb();
const collection = db.collection(`Settings`);
const code = "```";
    collection.deleteOne({ _id: `${guild.name}` })

    client.channels.cache.get("731997087721586698").send(`The bot has left **${guild.name}**. The bot is in a total of ${client.guilds.cache.size} servers.
    \n${code}diff\n+ Server name: ${guild.name}
+ Server ID: ${guild.id}
+ Owner: ${guild.owner}
+ Channel count: ${guild.channels.cache.size}
+ Member count: ${guild.memberCount}${code}`);
};