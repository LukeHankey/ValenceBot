/* eslint-disable no-useless-escape */
export const merchRegex =
	/(^(?:m|merch|merchant|w|world){1}\s?(([124569]|1[024568]|2[1-8]|3[0125-79]|4[024-689]|5[0-689]|6[02-9]|7[0-46-9]|8[2-9]|9[126-9]|10[03-6]|11[4-79]|12[34]|13[47-9]|140|25[27-9])(([,.\s]|ua|f)?|\s[\W\w\+]*)*)$)/i
export const otherCalls =
	/(^(?:wp|j|jf|wh|sm|tt|a|ark|whirlpool|whale|jelly|jellyfish|pool|sea monster|treasure turtle|turtle|arkaneo|sailfish){1}\s?(([124569]|1[024568]|2[1-8]|3[0125-79]|4[024-689]|5[0-689]|6[02-9]|7[0-46-9]|8[2-9]|9[126-9]|10[03-6]|11[4-79]|12[34]|13[47-9]|140|25[27-9]|21[1-4679]|22[6-9]|238)(([,.\s]|ua|f)?|\s[\W\w\+]*)*)$)/i
export const foreignWorldsRegex =
	/(^(?:m|merch|merchant|w|world|wp|j|jf|wh|sm|tt|a|ark|whirlpool|whale|jelly|jellyfish|pool|sea monster|treasure turtle|turtle|arkaneo|sailfish){1}\s?((47|75|10[12]|118|121)(([,.\s]|ua|f)?|\s[\W\w\+]*)*)$)/i
export const tenMinutes = 600_000
export const allEvents =
	/^((?<merchant>m|merch|merchant|w|world)|(?<whirlpool>wp|whirlpool|pool)|(?<sea_monster>sm|sea monster)|(?<jellyfish>j|jf|jelly|jellyfish)|(?<whale>wh|whale)|(?<treasure_turtle>tt|turtle|treasure turtle)|(?<arkaneo>a|ark|arkaneo|sailfish))\s?\d{1,3}.*$/i
export const worldFullMessage =
	'Hello everyone! There are currently some worlds full. If there is an event called and the world is full, when you try to join the server, you will be disconnected. To fix this problem, lobby first, then join the world. You will be placed in a queue to join the world.'
