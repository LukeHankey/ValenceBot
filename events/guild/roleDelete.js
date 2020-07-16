const getDb = require("../../mongodb").getDb;

module.exports = async (client, role) => {
let db = getDb();
const collection = db.collection(`Settings`);
const code = "```";

    let roleStore = role.guild.roles;
    console.log(role.guild.ownerID);
    
       
    await collection.findOne({ _id: role.guild.name })
    .then(res => {
            console.log(res.adminRole)
            if (res.adminRole === `<@&${role.id}>`) {
                client.users.cache.get(role.guild.ownerID).send(`Your server Admin role was deleted in ${role.guild.name}. Make sure to reset your Admin role to allow your server to use admin commands!`)
                client.channels.cache.get("731997087721586698").send(`The Admin role **(${role.name})** in ${role.guild.name} has been deleted. The server owner has been sent a message!`);
                
                collection.findOneAndUpdate({ adminRole: role.id }, { $set: { adminRole: res.defaultAdminRole }})
				.then(r => {
                    console.log(r);
                    console.log(r.adminRole);
                    console.log(r.defaultAdminRole);
                })
            }
        })
};
