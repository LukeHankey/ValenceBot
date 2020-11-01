const cron = require('node-cron');
const { Collection } = require("discord.js");
const getDb = require("../../mongodb").getDb;

module.exports = async (client, message) => {
	const db = getDb();
	const settingsColl = db.collection("Settings");
	const mReactCollection = new Collection()

	if (message.author.bot) return;
	const filterWords = ["retard", "nigger", "ngr"]
	const blocked = filterWords.filter(word => { 
		if (message.content.toLowerCase().includes("congrats") || message.content.toLowerCase().includes("ten gri")) return
		return message.content.toLowerCase().includes(word)
	});
	
	if (message.guild.id === "472448603642920973" && blocked.length > 0) message.delete()

	if (message.channel.id === "566338186406789123") {
		cron.schedule('* * * * *', async () => {
			const mes = await message.channel.messages.fetch({ limit: 15 })
			const log = [...mes.values()]
			for (const messages in log) mReactCollection.set(log[messages].id, { 
				content: log[messages].content,
				time: log[messages].createdTimestamp 
			})
			for (let i = 1; i <= mReactCollection.size; i++) {
				const lastID = mReactCollection.lastKey(i)[0];
				const lastVal = mReactCollection.last(i)[0];
				message.channel.messages.fetch(lastID)
				.then(m => {
					const check = Date.now() - lastVal.time > 600000
					if (check) {
						m.react('☠️')
						mReactCollection.delete(lastID)
					}
				})
				.catch(err => {
					if (err.message === "Uknown Message") return
				})
			}
		})
		message.content.match(/(?:(?:^|m|merch|merchant|w|world)(?:\s)*)(\d{1,3})(?:[^\d]|$)/)
		? message.channel.send(`<@&670842187461820436>`).then(m => m.delete())
		: message.delete()
	}

	settingsColl.findOne({ _id: `${message.guild.id}` })
	.then(res => {
		if (!message.content.startsWith(res.prefix)) return;

		const args = message.content.slice(res.prefix.length).split(/ +/g);
		const commandName = args.shift().toLowerCase();

		const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases
		&& cmd.aliases.includes(commandName)); // Command object

		
		if (message.channel.id === '566338186406789123') return
		// Find a way to make this work for joining new guilds without having to manually change the admin/mod roles in the DB.

		if ((command.permissions.includes("Admin") && res.roles.adminRole === null) || (command.permissions.includes("Mod") && res.roles.modRole === null)) {
			return message.channel.send("To use this command, you first need to set some permissions. Either your Admin or Mod role needs to be set.")
		} 

		// Admin Roles \\
		const rID = res.roles.adminRole.slice(3, 21) // Get adminRole ID
		const adRole = message.guild.roles.cache.find(role => role.id === rID); // Grab the adminRole object by ID
		const oRoles = message.guild.roles.cache.filter(roles => roles.rawPosition >= adRole.rawPosition); // Grab all roles rawPosition that are equal to or higher than the adminRole
		const filterORoles = oRoles.map(role => role.id); // Finds the ID's of available roles
		const abovePerm = []; // Roles on the member
		const availPerm = []; // adminRole+ that the member doesn't have
		const aboveRP = []; // rawPosition of each role on the member
		filterORoles.forEach(id => {
			if (message.member.roles.cache.has(id)) {
				abovePerm.push(id)
			}
			else {
				availPerm.push(id);
			}
		})
		abovePerm.forEach(id => {
			const abovePermRaw = message.guild.roles.cache.find(role => role.id === id)
			const aboveRp = abovePermRaw.rawPosition + "";
			aboveRp.split().forEach(rp => {
				aboveRP.push(rp);
			})
		})
		const allRoleIDs = availPerm.map(id => `<@&${id}>`);

		 // Mod Roles \\
		 const mrID = res.roles.modRole.slice(3, 21) // Get modRole ID
		 const modRole = message.guild.roles.cache.find(role => role.id === mrID); // Grab the modRole object by ID
		 const modRoles = message.guild.roles.cache.filter(roles => roles.rawPosition >= modRole.rawPosition); // Grab all roles' rawPositions that are equal to or higher than the modRole
		 const filterORolesM = modRoles.map(role => role.id); // Finds the ID's of available roles
		 const abovePermModArray = []; // All roles that the member has that is >= modRole
		 const availPermMod = []; // All the roles that the member doesn't have that are >= modRole
		 const aboveRPMod = [];
		 filterORolesM.forEach(id => {
			 if (message.member.roles.cache.has(id)) {
				 abovePermModArray.push(id)
			 }
			 else {
				 availPermMod.push(id);
			 }
		 })
		 abovePermModArray.forEach(id => {
			 const abovePermRawMod = message.guild.roles.cache.find(role => role.id === id)
			 const aboveRpMod = abovePermRawMod.rawPosition + "";
			 aboveRpMod.split().forEach(rp => {
				 aboveRPMod.push(rp);
			 })
		 })
		 const allModRoleIDs = availPermMod.map(id => `<@&${id}>`);

		let perms = {
			admin: message.member.roles.cache.has(abovePerm[0]) || message.member.roles.cache.has(rID) || message.author.id === message.guild.ownerID,
			mod: message.member.roles.cache.has(abovePermModArray[0]) || message.member.roles.cache.has(mrID) || aboveRPMod[0] >= modRole.rawPosition || message.author.id === message.guild.ownerID,
			joinA: allRoleIDs.join(", "),
			joinM: allModRoleIDs.join(", "),
		}

		try {
			// undefined results in all guilds allowed
			command.guildSpecific === undefined || command.guildSpecific.includes(message.guild.id)
			? command.run(client, message, args, perms)
			: message.channel.send("You cannot use that command in this server.")
		}
		catch (error) {
			if (commandName !== command) message.channel.send("That's not a valid command!");
			console.error(error);
		}
	})	
}