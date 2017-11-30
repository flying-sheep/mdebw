import * as settings from './settings'


const url_index = 'http://forum.mods.de/bb/xml/bookmarks.php'

async function fetch_bookmark_doc() {
	const response = await fetch(url_index, { credentials: 'include' })
	if (!response.ok) throw Error(`HTTP ${response.statusText}`)
	const xml = await response.text()
	const doc = (new DOMParser).parseFromString(xml, 'application/xml')
	return {doc, xml}
}

function update_badge(doc) {
	const count = parseInt(doc.documentElement.getAttribute('newposts'))
	browser.browserAction.setBadgeText({ text: `${count}` })
}

async function update() {
	const {doc, xml} = await fetch_bookmark_doc()
	update_badge(doc)
	await settings.set({ xml })
}

async function get_delay() {
	const delay = await settings.get_one('delay')
	const [m, s] = delay.split(':').map(i => parseInt(i))
	return m*60 + s
}

async function loop_update() {
	try {
		await update()
	} catch (error) {
		console.error(error)
	}
	setTimeout(loop_update, 1000 * await get_delay())
}
loop_update()
