const getDb = require("../../mongodb").getDb;

module.exports = async (client, oldGuild, newGuild) => {
let db = getDb();
const collection = db.collection(`Settings`);
const code = "```";

    collection.updateOne({ _id: `${oldGuild.id}` },
        {
        $set: { serverName: `${newGuild.name}` },
        },
        { upsert: true }
        );

    collection.findOne({ serverID: `${oldGuild.id}` })
    .then(async res => {
        client.channels.cache.get("731997087721586698").send(`The server name has been changed from ${oldGuild.name} to **${newGuild.name}**.\n${code}diff\n
+ Server Name: ${newGuild.name}
+ Server ID: ${oldGuild.id}
+ Owner: ${newGuild.owner ? newGuild.owner.nickname : oldGuild.owner.nickname}${code}`);
})
};