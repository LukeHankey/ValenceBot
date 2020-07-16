const getDb = require("../../mongodb").getDb;

module.exports = async (client, guild) => {
let db = getDb();
db.createCollection("Settings")
const collection = db.collection(`Settings`);
const code = "```";

    collection.insertOne(
        { _id: `${guild.name}`, serverID: `${guild.id}`, prefix: ";", adminRole: `${guild.roles.highest}`, defaultAdminRole: `${guild.roles.highest}` }, { forceServerObjectId: true }
    );

    client.channels.cache.get("731997087721586698").send(`The bot has been added to **${guild.name}**. The bot is in a total of ${client.guilds.cache.size} servers. 
    \n${code}diff\n
+ Server name: ${guild.name}
+ Server ID: ${guild.id}
+ Owner: ${guild.owner}
+ Channel count: ${guild.channels.cache.size}
+ Member count: ${guild.memberCount}${code}`);
};
