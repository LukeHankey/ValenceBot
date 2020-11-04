module.exports = {
	name: "self-assign",
	description: ["Assign a role."],
	aliases: ["sa"],
	usage:  ["<role name>"],
	permissions: [false],
	run: async (client, message, args, perms) => {

        const [...roleName] = args;

        const rName = roleName.join(" ").trim();
        const highBotRoleID = '771973952562135042'
        
        const check = (r, bP) => {
            const role = message.guild.roles.cache.find(role => role.name.toLowerCase() === r.toLowerCase());
            if (!role) {
                return message.channel.send(`Unable to find \`${rName}\`.`)
            }
            const roleCheck = message.guild.roles.cache.has(role.id)
            const botPerms = bP.hasPermission('MANAGE_ROLES')
            const botRoleHighest = message.guild.roles.cache.get(highBotRoleID);
            const botHighest = botRoleHighest.position > role.position

            roleCheck ? true : message.channel.send(`Unable to find \`${r ? r : 'blank'}\`. Make sure your spelling is correct.`);
            botPerms ? true : message.channel.send(`I am missing some permissions: \`MANAGE_ROLES\`.`);
            botHighest ? true : message.channel.send(`You cannot assign yourself this role.`)
            
            return roleCheck && botPerms && botHighest
        }

        if (check(rName, message.guild.me)) {
            const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === rName.toLowerCase())
            const memberRole = message.member.roles;
            if (!role) return
            memberRole.cache.has(role.id)
            ? memberRole.remove(role.id) && message.channel.send(`${role.name} has been removed.`)
            : memberRole.add(role.id) && message.channel.send(`${role.name} has been added.`)
        }
	},
}
