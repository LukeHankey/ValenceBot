const getDb = require("../../mongodb").getDb;

module.exports = async (client, role) => {
let db = getDb();
const collection = db.collection(`Settings`);

<<<<<<< HEAD
    collection.findOne({ serverID: role.guild.id })
||||||| bce0c31
// let roleName = role.guild.roles;
    let roleStore = role.guild.roles;
    console.log(role.guild.ownerID);
    // console.log(role); // Gets deleted role

    collection.findOne({ _id: role.guild.name })
=======
    await collection.findOne({ _id: role.guild.name })
>>>>>>> 66709079b38d1e524ce69c3fb1f4f8522dd04d74
    .then(res => {
<<<<<<< HEAD
        console.log(res.adminRole)
        if (res.adminRole === `<@&${role.id}>`) {
            client.users.cache.get(role.guild.ownerID).send(`Your server Admin role was deleted in ${role.guild.id}. Make sure to reset your Admin role to allow your server to use admin commands!`)
            client.channels.cache.get("731997087721586698").send(`The Admin role **(${role.id})** in ${role.guild.id} has been deleted. The server owner has been sent a message!`);
        }
    })
};
||||||| bce0c31
        console.log(res.adminRole)
        if (res.adminRole === `<@&${role.id}>`) {
            client.users.cache.get(role.guild.ownerID).send(`Your server Admin role was deleted in ${role.guild.name}. Make sure to reset your Admin role to allow your server to use admin commands!`)
            client.channels.cache.get("731997087721586698").send(`The Admin role **(${role.name})** in ${role.guild.name} has been deleted. The server owner has been sent a message!`);
        }
    })
};
=======
            console.log(res.adminRole)
            if (res.adminRole === `<@&${role.id}>`) {
                collection.findOneAndUpdate({ adminRole: `<@&${role.id}>` }, { $set: { adminRole: res.defaultAdminRole }})
		.then(r => {
			client.users.cache.get(role.guild.ownerID).send(`Your server Admin role was deleted in \`${role.guild.name}\` and has been set back to the default: ${r.value.defaultAdminRole}. Make sure to reset your Admin role to allow your server admins to use admin commands! Use \`${r.value.prefix}settings adminRole set <NEW ROLE>\` in ${role.guild.name} (Must have the Administrator permission)`)
			client.channels.cache.get("731997087721586698").send(`The Admin role **(${role.name})** in \`${role.guild.name}\` has been deleted. The server owner has been sent a message!`)
		;})
            }
        })
};
>>>>>>> 66709079b38d1e524ce69c3fb1f4f8522dd04d74
