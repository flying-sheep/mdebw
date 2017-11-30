import Panel from './panel-list'
import List  from './panel-list'
import Sep   from './panel-section-separator'
import Item  from './panel-list-item'


const thread_link = ({thread, post}) =>
	`http://forum.mods.de/bb/thread.php?TID=${thread}&PID=${post}#reply_${post}`

const specific_icons = [
	'Black Mesa Source',
	'Browserthread',
	'Das Ende',
	'Gehirnsalat',
	'Greasemonkey',
	'Linux',
	'Magicka',
	'Minecraft',
	'Ultimate',
]

function specific_icon(title) {
	for (const icon of specific_icons)
		if (title.indexOf(icon) !== -1)
			return `../icons/thread/${icon}.png`
}


export default function BookmarksPanel(bookmarks) {
	const contents = bookmarks.map(bookmark => {
		const thread = bookmark.querySelector('thread')
		const url = thread_link({
			thread: thread.getAttribute('TID'),
			post: bookmark.getAttribute('PID'),
		})
		
		const disabled = Boolean(parseInt(thread.getAttribute('closed')))
		const text = thread.textContent
		const icon = specific_icon(text)
		const shortcut = bookmark.getAttribute('newposts')
		const onclick = e => {
			browser.tabs.create({url})
			window.close()
		}
		
		return Item({icon, text, shortcut, onclick})
	})
	
	return Panel([
		Item({text: 'Alle öffnen'}),
		Sep,
		...contents,
	])
}
