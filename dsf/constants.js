const merchRegex = /(^(?:m|merch|merchant|w|world){1}(\s?)(?!3$|7$|8$|11$|13$|17|19|20|29|33|34|38|41|43|47|57|61|75|80|81|90|93|94|101|102|10[7-9]|11[0-3]|12[0-2]|12[5-9]|13[0-3]|135|136)([1-9]\d?|1[0-3]\d|140|25[2, 7-9])(([,.\s]|f|ua)?|\s+\w*)*$)/i;
const lobbyWorldsSpace = /(^(?:m|merch|merchant|w|world){1}\s+(25[2, 7-9])(([,.\s]|f|ua)?|\s+\w*)*$)/i;
const lobbyWorldsNoSpace = /(^(?:m|merch|merchant|w|world){1}(25[2, 7-9])(([,.\s]|f|ua)?|\s+\w*)*$)/i;

module.exports = {
	merchRegex,
	lobbyWorldsSpace,
	lobbyWorldsNoSpace,
};