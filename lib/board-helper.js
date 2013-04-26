const tabs = require('sdk/tabs'),
	{Request} = require('sdk/request');

exports.openWithReusing = function(url, comparator) {
	// Check each browser instance for our URL
	let found = false;
	
	for each (let tab in tabs) { //TODO: remove for each
		if (comparator && comparator(tab.url) || url === tab.url) {
			// The URL is already opened. Select this tab.
			tab.activate();
			tab.url = url;
			
			found = true;
			break;
		}
	}
	
	// Our URL isn't open. Open it now (when option activated)
	if (!found) {
		if (['about:blank', 'about:newtab'].indexOf(tabs.activeTab.url) !== -1)
			tabs.activeTab.url = url;
		else
			tabs.open(url);
	}
};

const BOARD_URL = 'http://forum.mods.de/bb/';

exports.gotoBoard = function() {
	exports.openWithReusing(BOARD_URL, function(uri) [BOARD_URL, BOARD_URL + 'index.php'].indexOf(uri) !== -1);
};