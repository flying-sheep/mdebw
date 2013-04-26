const tabs = require('sdk/tabs'),
	{Request} = require('sdk/request');

exports.openWithReusing = function(url, comparator) {
	for each (let tab in tabs) { //TODO: remove for each
		if (comparator && comparator(tab.url) || url === tab.url) {
			tab.activate();
			tab.url = url;
			return;
		}
	}
	
	//TODO: add 'about: blank' here
	//care has to be taken for multiple opened tabs, because each tab.url is shortly about:blank
	if (tabs.activeTab.url == 'about:newtab')
		tabs.activeTab.url = url;
	else
		tabs.open(url);
};

exports.BOARD_URL = 'http://forum.mods.de/bb/';

exports.gotoBoard = function() {
	exports.openWithReusing(exports.BOARD_URL, function(uri) [exports.BOARD_URL, exports.BOARD_URL + 'index.php'].indexOf(uri) !== -1);
};