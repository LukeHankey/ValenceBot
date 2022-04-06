export default async (_, thread) => {
	await thread.join()
	if (thread.sendable) {
		if (thread.parentId === '938566070569144371' || thread.parentId === '630418192451371018') {
			return
		}
		const archiveTime = thread.autoArchiveDuration
		return thread.send({ content: `Hello! This thread: \`${thread.name}\` will be automatically archived in \`${archiveTime / 60} hours\` if there is no activity.` })
	}
}
