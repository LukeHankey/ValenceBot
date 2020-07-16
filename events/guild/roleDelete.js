const getDb = require("../../mongodb").getDb;

module.exports = async (client, role) => {
let db = getDb();
const collection = db.collection(`Settings`);

    collection.findOne({ serverID: role.guild.id })
    .then(res => {
        console.log(res.adminRole)
        if (res.adminRole === `<@&${role.id}>`) {
            client.users.cache.get(role.guild.ownerID).send(`Your server Admin role was deleted in ${role.guild.id}. Make sure to reset your Admin role to allow your server to use admin commands!`)
            client.channels.cache.get("731997087721586698").send(`The Admin role **(${role.id})** in ${role.guild.id} has been deleted. The server owner has been sent a message!`);
        }
    })
};