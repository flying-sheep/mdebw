import {render} from 'lit-html/lib/lit-extended'

import BookmarksPanel from './components/bookmarks-panel'

import * as settings from './settings'


const getting_xml = settings.get_one('xml')

document.addEventListener('DOMContentLoaded', async () => {
	const xml = await getting_xml
	const doc = (new DOMParser).parseFromString(xml, 'application/xml')
	
	const bookmarks_unread = Array.from(doc.querySelectorAll('bookmark'))
		.filter(bookmark => parseInt(bookmark.getAttribute('newposts')) > 0)
	
	const elem_panel = document.getElementById('panel')
	
	render(BookmarksPanel(bookmarks_unread), elem_panel)
})
