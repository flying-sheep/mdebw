'use strict';

const {Cc, Ci, Cu} = require('chrome');

Cu.import('resource://gre/modules/Services.jsm');
Services.ss = Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService);
const parser = Cc['@mozilla.org/xmlextras/domparser;1'].createInstance(Ci.nsIDOMParser);

const prefEvents = require('sdk/simple-prefs'),
	{prefs} = require('sdk/simple-prefs'),
	{ToolbarButton, getProxy} = require('toolbarbutton'),
	{id: addonID, data} = require('sdk/self'),
	{getMostRecentBrowserWindow} = require('sdk/window/utils'),
	{browserWindows} = require('sdk/windows'),
	{notify} = require('sdk/notifications'),
	{Request} = require('sdk/request'),
	{clearInterval, setInterval} = require('sdk/timers');

const buttonOptions = {
	id: 'mdebw-button',
	label: '-',
	type: 'menu-button',
	modify: function(tbb) {
		let panel = tbb.ownerDocument.createElement('panel');
		panel.setAttribute('type', 'arrow');
		
		let menu = tbb.ownerDocument.createElement('vbox');
		menu.setAttribute('id', 'mdebw-menu');
		
		panel.appendChild(menu);
		tbb.appendChild(panel);
	},
	onClick: function(evt) {
		//TODO: das failt, wenn im popup toolbarbuttons sind
		if (evt.originalTarget.type === 'menu-button' || evt.originalTarget.tagName !== 'xul:toolbarbutton')
			return;
		
		let prefName = BUTTON2PREF[evt.button];
		mouseAction(evt.originalTarget, prefs[prefName], evt);
		
		if (evt.button === 2 && prefs[prefName] !== 'noop') {
			evt.preventDefault();
			evt.stopPropagation();
			return false; //show normal menu on rightclick only on noop
		}
	}
};

const BUTTON2PREF = ['actionLMB', 'actionMMB', 'actionRMB'];

function mouseAction(button, name) { //Aktionen, die die maustasten ausführen können.
	let actions = {
		open: function() {
			for (let item of getMenuNode(button).childNodes)
				item.doCommand();
		},
		refresh: restartMainLoop,
		settings: function() {
			getMostRecentBrowserWindow().BrowserOpenAddonsMgr('addons://detail/' + encodeURIComponent(addonID) + '/preferences');
			//http://stackoverflow.com/questions/10192434/display-options-xul-programmatically
		},
		noop: function() {},
	};
	actions[name]();
}

function getMenuNode(button) {
	return button.ownerDocument.getElementById('mdebw-menu');
}

const BrowserHelper = {
	gotoBoard: function() {
		let baseURI = 'http://forum.mods.de/bb/';
		BrowserHelper.openWithReusing(baseURI, function(uri) {
			let isRoot = uri === baseURI;
			return isRoot || uri === baseURI + 'index.php';
		});
	},
	
	openWithReusing: function(url, comparator) {
		// Check each browser instance for our URL
		let found = false;
		
		for each (let window in browserWindows) { //TODO: remove for each
			for each (let tab in window.tabs) {
				if (comparator && comparator(tab.url) || url === tab.url) {
					// The URL is already opened. Select this tab.
					tabbrowser.selectedTab = tabbrowser.mTabs[index];
					
					tab.url = url;
					
					found = true;
					break;
				}
			}
			
			if (found)
				break;
		}
		
		// Our URL isn't open. Open it now (when option activated)
		if (!found)
			if (browserWindows.activeWindow)
				browserWindows.activeWindow.tabs.open(url);
			else
				browserWindows.open(url);
	},
}

function specificIcon(title) {
	let icons = [
		'Black Mesa Source',
		'Browserthread',
		'Das Ende',
		'Gehirnsalat',
		'Greasemonkey',
		'Linux',
		'Magicka',
		'Minecraft',
		'Ultimate',
	];
	
	for (let i=0; i<icons.length; i++)
		if (title.indexOf(icons[i]) !== -1)
			return data.url('threadicons/' + icons[i] + '.png');
	
	return null;
}

function updateList(response) {
	for (let button of getProxy(buttonOptions).getTBBs()) {
		if (button === null)
			continue;
		let menu = getMenuNode(button);
		let oldPosts = 0;
		while (menu.childNodes.length > 0) {
			oldPosts += parseInt(menu.firstChild.getAttribute('acceltext'));
			menu.removeChild(menu.firstChild);
		}
		
		//if (response.status !== 200)
		//	return; //TODO: more gracefully
		
		let doc = parser.parseFromString(response.text, 'application/xml');
		let root = doc.getElementsByTagName('bookmarks')[0];
		
		let newPosts = 0;
		if(root)
			newPosts = parseInt(root.getAttribute('newposts'));
		
		let label = '-';
		if (newPosts && newPosts !== 0) {
			label = newPosts.toString();
			//XPathResult undefined‽
			let bookmarks = doc.evaluate('/bookmarks/bookmark', doc, null, 0, null);
			
			for (let bm = bookmarks.iterateNext(); bm; bm = bookmarks.iterateNext()) {
				let bmPosts = bm.getAttribute('newposts');
				let thread = bm.getElementsByTagName('thread')[0];
				let TID = thread.getAttribute('TID');
				let title = thread.textContent.replace(/&#93;/, ']');
				let PID = bm.getAttribute('PID');
				let link = 'http://forum.mods.de/bb/thread.php?TID=' + TID + '&PID=' + PID + '#reply_' + PID;
				
				if (bmPosts > 0) {
					let item = button.ownerDocument.createElement('menuitem');
					item.setAttribute('label', title)
					item.setAttribute('class', 'menuitem-iconic');
					item.setAttribute('name',  'bookmark');
					item.setAttribute('value', link);
					item.setAttribute('acceltext', bmPosts);
					let specificIconURL = specificIcon(title);
					if (specificIconURL)
						item.setAttribute('image', specificIconURL);
					
					let searchedTID = link.match(/bb\/thread\.php\?TID=(\d+)/)[1];
					item.addEventListener('command', function(evt) {
						BrowserHelper.openWithReusing(link, function(uri) {
							return uri.indexOf('/bb/thread.php?TID=' + searchedTID) !== -1;
						});
					}, true);
					menu.appendChild(item);
				}
			}
			
			let diff = newPosts - oldPosts;
			if (prefs.notify && diff > 0) {
				notify({
					title: diff + ' neue Beiträge!',
					text:  '…im mods.de-Forum',
					iconURL: data.url('icon.png'),
				});
			}
		} else {
			let status = null;
			if (doc.getElementsByTagName('not-logged-in')[0]) {
				status = 'Bitte einloggen';
				label = '-';
			} else if (doc.getElementsByTagName('forum-offline')[0]) {
				status = 'Das Forum ist offline';
				label = '☠';
			} else {
				status = 'keine ungelesenen bookmarks';
				label = '0';
			}
			
			let loginItem = button.ownerDocument.createElement('menuitem');
			loginItem.setAttribute('label', status);
			loginItem.setAttribute('name',  'bookmark');
			//loginItem.setAttribute('disabled', 'true');
			loginItem.addEventListener('command', BrowserHelper.gotoBoard, true);
			menu.appendChild(loginItem);
		}
		
		if (prefs.showNumber)
			button.setAttribute('label', label);
		else
			button.removeAttribute('label');
	}
}

var reloadInterval;

function restartMainLoop() {
	tick();
	clearInterval(reloadInterval);
	reloadInterval = setInterval(tick, prefs.delay * 1000);
}

prefEvents.on('delay', restartMainLoop);
prefEvents.on('showNumber', restartMainLoop);

function tick() {
	Request({
		url: 'http://forum.mods.de/bb/xml/bookmarks.php',
		onComplete: updateList,
	}).get();
}

exports.main = function(options) {
	var button = ToolbarButton(buttonOptions);
	button.moveTo({
		toolbarID: 'nav-bar',
		forceMove: false,
	});
	
	//add stylesheet
	let uri = Services.io.newURI(data.url('stylesheet.css'), null, null);
	if(!Services.ss.sheetRegistered(uri, Services.ss.USER_SHEET))
		Services.ss.loadAndRegisterSheet(uri, Services.ss.USER_SHEET);
	
	restartMainLoop();
}

exports.onUnload = function (reason) {
	//remove stylesheet
	let uri = Services.io.newURI(data.url('stylesheet.css'), null, null);
	if(Services.ss.sheetRegistered(uri, Services.ss.USER_SHEET))
		Services.ss.unregisterSheet(uri, Services.ss.USER_SHEET);
};