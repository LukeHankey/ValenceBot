const getDb = require("../../mongodb").getDb;

module.exports = async (client, guild) => {
let db = getDb();
const collection = db.collection(`Settings`);
const code = "```";

    collection.updateMany({},
        {
        $set: { _id: `${guild.name}` },
        $set: { serverID: `${guild.id}` },
        $set: { prefix: ";" },
        $set: { roles: { 
            modRole: `${guild.roles.highest}`,
            adminRole: `${guild.roles.highest}`,
            defaultAdminRole: `${guild.roles.highest}`
        }},
        $set: { channels: { 
            adminChannel: null,
        }},
        $set: { citadel_reset_time: { 
            hour: "*", 
            minute: "*", 
            day: "*", 
            scheduled: "false"
        }}, 
        $set: { reminders: [
        ]}
        },
        { upsert: true }
        );

    client.channels.cache.get("731997087721586698").send(`The bot has been added to **${guild.name}**. The bot is in a total of ${client.guilds.cache.size} servers. 
    \n${code}diff\n
+ Server name: ${guild.name}
+ Server ID: ${guild.id}
+ Owner: ${guild.owner}
+ Channel count: ${guild.channels.cache.size}
+ Member count: ${guild.memberCount}${code}`
);
};
