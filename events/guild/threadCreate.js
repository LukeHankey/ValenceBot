module.exports = async (client, thread) => {
	await thread.join();
	if (thread.sendable) {
		const archiveTime = thread.autoArchiveDuration;
		return thread.send({ content: `Hello! This thread: \`${thread.name}\` will be automatically archived in \`${archiveTime / 60} hours\` if there is no activity.` });
	}
};