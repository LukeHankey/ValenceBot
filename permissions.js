class Roles {
    constructor(name, db, msg) {
        this.name = name;
        this.db = db;
        this.msg = msg;
        this._role = this.msg.guild.roles.cache.find(role => role.id === this.roleID());
        this._position = this.msg.guild.roles.cache.filter(roles => roles.rawPosition >= this._role.rawPosition);
    }

    roleID() {
        return this.db.roles[this.name].slice(3, 21)
    }

    memberRole() { // abovePermModArray
        const memberRoleArray = [];
        this._position
            .map(role => role.id)
            .forEach(id => {
                if (this.msg.member.roles.cache.has(id)) return memberRoleArray.push(id)
            })
        return memberRoleArray;
    }

    higherRoles() { // availPermMod
        const higherRoleArray = [];
        this._position
            .map(role => role.id)
            .forEach(id => {
                if (!this.msg.member.roles.cache.has(id)) return higherRoleArray.push(id)
            })
        return higherRoleArray.map(id => `<@&${id}>`);
    }

    modPlusRoles(num = 0) {
        const aboveMod = [];
        this.memberRole().forEach(id => {
            const abovePermRawMod = message.guild.roles.cache.find(role => role.id === id)
            const aboveRpMod = abovePermRawMod.rawPosition + "";
            aboveRpMod.split().forEach(rp => {
                aboveMod.push(rp);
            })
        })
        return aboveMod[num]
    }
}

exports.RolePerms = Roles