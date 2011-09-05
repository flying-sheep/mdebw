var Ci = Components.interfaces;
Components.utils.import("resource://gre/modules/Services.jsm");
Services.ss = Components.classes["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);

function getKeys(obj) {
	let keys = [];
	for(let key in obj)
		keys.push(key);
	return keys;
}

var console = {
	log: function(msg) {
		try {
			let recentWindow = Services.wm.getMostRecentWindow("navigator:browser");
			recentWindow.Firebug.Console.log(msg);
		} catch(e) {
			Services.console.logStringMessage(msg.toString());
		}
	}
}

const PREF_BRANCH = "extensions.mdebw.";
//TODO: fragile if button after this one is removed
const PREFS = {
	toolbar:	"nav-bar",
	anchor:	"",
	delay:	120000,
};

function setDefaultPrefs() {
	let prefs = Services.prefs.getDefaultBranch(PREF_BRANCH);
	for (let [key, val] in Iterator(PREFS)) {
		let setPref = prefs.setCharPref;
		if (typeof(val) == "boolean")
			setPref = prefs.setBoolPref;
		else if (typeof(val) == "number")
			setPref = prefs.setIntPref;
		setPref(key, val);
	}
}

var reloadInterval;
function resetInterval(window) {
	let prefs = Services.prefs.getBranch(PREF_BRANCH);
	
	window.clearInterval(reloadInterval);
	reloadInterval = window.setInterval(updateList, prefs.getIntPref("delay"), window);
}

var BrowserHelper = {
	gotoBoard: function() {
		let baseURI = "http://forum.mods.de/bb/";
		BrowserHelper.openWithReusing(baseURI, function(uri) {
			let isRoot = uri == baseURI;
			return isRoot |= uri == baseURI + "index.php";
		});
	},
	
	openWithReusing: function(url, comperator) {
		let browserEnumerator = Services.wm.getEnumerator("navigator:browser");
		
		// Check each browser instance for our URL
		let found = false;
		while (!found && browserEnumerator.hasMoreElements()) {
			let browserWin = browserEnumerator.getNext();
			let tabbrowser = browserWin.getBrowser();
			
			// Check each tab of this browser instance
			let numTabs = tabbrowser.browsers.length;
			for (let index = 0; index < numTabs; index++) {
				let currentBrowser = tabbrowser.getBrowserAtIndex(index);
				
				let testURI = currentBrowser.currentURI.spec;
				if (comperator && comperator(testURI) || url == testURI) {
					// The URL is already opened. Select this tab.
					tabbrowser.selectedTab = tabbrowser.mTabs[index];
					
					// Focus *this* browser-window
					browserWin.focus();
					browserWin.loadURI(url);
					
					found = true;
					break;
				}
			}
		}
		
		// Our URL isn't open. Open it now (when option activated)
		if (!found) {
			this.openTab(url);
		}
	},
	
	openTab: function(url) {
		let recentWindow = Services.wm.getMostRecentWindow("navigator:browser");
		if (recentWindow) {
			// Use an existing browser window
			recentWindow.delayedOpenTab(url, null, null, null, null);
		} else {
			// No browser windows are open, so open a new one.
			window.open(url);
		}
	},
}

function specificIcon(title) {
	let icons = [
		"Black Mesa Source",
		"Browserthread",
		"Das Ende",
		"Gehirnsalat",
		"Greasemonkey",
		"Linux",
		"Magicka",
		"Minecraft",
		"Ultimate"
	];
	
	for (let i=0; i<icons.length; i++)
		if (title.indexOf(icons[i]) != -1)
			return "resource://mdebw/threadicons/" + icons[i] + ".png";
	
	return null;
}

function updateList(window) {
	resetInterval(window);
	
	let req = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
	req.open("GET", "http://forum.mods.de/bb/xml/bookmarks.php", true);
	req.onreadystatechange = function (aEvt) {
		if (req.readyState != 4)
			return;
		
		let menu = window.document.getElementById("mdebw-menu");
		while (menu.childNodes.length > 0)
			menu.removeChild(menu.firstChild);
		
		let fail = false;
		if (req.status != 200)
			fail = true;
		else {
			let doc = req.responseXML;
			root = doc.getElementsByTagName("bookmarks")[0];
			
			if(!doc || !root)
				fail = true;
			else {
				let button = window.document.getElementById("mdebw-button");
				let newPosts = root.getAttribute("newposts");
				button.setAttribute("label", newPosts);
				
				if (newPosts == "0")
					fail = true;
				else {
					//XPathResult undefined‽
					let bookmarks = doc.evaluate("/bookmarks/bookmark", doc, null, 0, null);
					
					for (let bm=bookmarks.iterateNext(); bm; bm=bookmarks.iterateNext()) {
						let newposts = bm.getAttribute("newposts");
						let thread = bm.getElementsByTagName("thread")[0];
						let TID = thread.getAttribute("TID");
						let title = thread.textContent.replace(/&#93;/, "]");
						let PID = bm.getAttribute("PID");
						let link = "http://forum.mods.de/bb/thread.php?TID=" + TID + "&PID=" + PID + "#reply_" + PID;
						
						if (newposts > 0) {
							let item = window.document.createElement("menuitem");
							item.setAttribute("label",     title)
							item.setAttribute("class",     "menuitem-iconic");
							item.setAttribute("acceltext", newposts);
							item.setAttribute("name",      "bookmark");
							item.setAttribute("value",     link);
							let specificIconURL = specificIcon(title);
							if (specificIconURL)
								item.setAttribute("image", specificIconURL);
							
							let searchedTID = link.match(/bb\/thread\.php\?TID=(\d+)/)[1];
							item.addEventListener("command", function(evt) {
								BrowserHelper.openWithReusing(link, function (uri) {return (uri.indexOf("/bb/thread.php?TID=" + searchedTID) != -1)});
							}, true);
							menu.appendChild(item);
						}
					}
				}
			}
		}
		
		if (fail) {
			let button = window.document.getElementById("mdebw-button");
			let status = null;
			if (req.responseXML.getElementsByTagName("not-logged-in")[0]) {
				status = "Bitte einloggen";
				button.setAttribute("label", "-");
			} else if (req.responseXML.getElementsByTagName("forum-offline")[0]) {
				status = "Das Forum ist offline";
				button.setAttribute("label", "☠");
			} else {
				status = "keine ungelesenen bookmarks";
			}
			let loginItem = window.document.createElement("menuitem");
			loginItem.setAttribute("label",    status);
			loginItem.setAttribute("name",     "bookmark");
			//loginItem.setAttribute("disabled", "true");
			loginItem.addEventListener("command", BrowserHelper.gotoBoard, true);
			menu.appendChild(loginItem);
		}
	};
	req.send(null);
}

function loadIntoWindow(window) {
	if (!window) return;
	let prefs = Services.prefs.getBranch(PREF_BRANCH);
	
	// Get the anchor for "overlaying" but make sure the UI is loaded
	let toolbar = window.document.getElementById(prefs.getCharPref("toolbar"));
	if (!toolbar) return;
	
	let anchorId = prefs.getCharPref("anchor");
	let anchor = (anchorId) ? window.document.getElementById(anchorId) : null;
	if (!anchor) anchor = null;
	
	//setup UI
	let button = window.document.createElement("toolbarbutton");
	button.setAttribute("id", "mdebw-button");
	button.setAttribute("class", "toolbarbutton-1 chromeclass-toolbar-additional");
	button.setAttribute("label", "-");
	button.setAttribute("type", "menu-button");
	button.setAttribute("removable", "true");
	toolbar.insertBefore(button, anchor);
	
	let panel = window.document.createElement("panel");
	panel.setAttribute("type", "arrow");
	button.appendChild(panel);
	
	let menu = window.document.createElement("vbox");
	menu.setAttribute("id", "mdebw-menu");
	panel.appendChild(menu);
	
	//menu.appendChild(window.document.createElement("menuseparator"));
	
	//let settingsItem = window.document.createElement("menuitem");
	//settingsItem.setAttribute("label", "Einstellungen");
	//menu.appendChild(settingsItem);
	
	//wire up ui
	button.addEventListener("click", function(aEvt) {
		//FIXME: das failt, wenn im popup toolbarbuttons sind
		if ("menu-button" == aEvt.originalTarget.type || aEvt.originalTarget.tagName != "xul:toolbarbutton")
			return;
		switch (aEvt.button) {
		case 0:
			for each (let item in window.document.getElementById("mdebw-menu").childNodes) {
				//hier loope ich auch über anderes zeug wie z.b. ….childNodes.length
				if (item.getAttribute && item.getAttribute("name") == "bookmark") {
					evt = window.document.createEvent("UIEvents");
					evt.initEvent("command", true, true);
					item.dispatchEvent(evt);
				}
			}
			break;
		case 1:
			updateList(window);
			break;
		case 2:
			//right click, open std menu
			break;
		}
	}, false);
	
	window.addEventListener("aftercustomization", function() {
		prefs.setCharPref("toolbar", button.parentNode.getAttribute("id"));
		let anchor = button.nextSibling;
		prefs.setCharPref("anchor", (anchor) ? anchor.getAttribute("id") : "");
	}, false);
	
	updateList(window);
}

function unloadFromWindow(window) {
	if (!window) return;
	
	let button = window.document.getElementById("mdebw-button");
	
	if (button)
		button.parentNode.removeChild(button);
}

/*
 bootstrap.js API
*/
function startup(aData, aReason) {
	// Always set the default prefs as they disappear on restart
	setDefaultPrefs();
	
	//register alias for resources
	let resource = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
	let alias = Services.io.newFileURI(aData.installPath);
	if (!aData.installPath.isDirectory())
		alias = Services.io.newURI("jar:" + alias.spec + "!/", null, null);
	resource.setSubstitution("mdebw", alias);
	
	// Load into any existing windows
	let enumerator = Services.wm.getEnumerator("navigator:browser");
	while (enumerator.hasMoreElements()) {
		let win = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
		loadIntoWindow(win);
	}
	
	// Load into any new windows
	Services.wm.addListener({
		onOpenWindow: function(aWindow) {
		// Wait for the window to finish loading
			let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal);
			domWindow.addEventListener("load", function() {
				domWindow.removeEventListener("load", arguments.callee, false);
				loadIntoWindow(domWindow);
			}, false);
		},
		onCloseWindow: function(aWindow) { },
		onWindowTitleChange: function(aWindow, aTitle) { }
	});
	
	//add stylesheet
	let uri = Services.io.newURI("resource://mdebw/stylesheet.css", null, null);
	if(!Services.ss.sheetRegistered(uri, Services.ss.USER_SHEET))
		Services.ss.loadAndRegisterSheet(uri, Services.ss.USER_SHEET);
}

function shutdown(aData, aReason) {
	// When the application is shutting down we normally don't have to clean up any UI changes
	//but the button position has to be saved
	//if (aReason == APP_SHUTDOWN) return;
	
	//unload resource alias
	let resource = Services.io.getProtocolHandler("resource").QueryInterface(Ci.nsIResProtocolHandler);
	resource.setSubstitution("mdebw", null);
	
	// Unload from any existing windows
	let enumerator = Services.wm.getEnumerator("navigator:browser");
	while (enumerator.hasMoreElements()) {
		let win = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
		unloadFromWindow(win);
	}
	
	//remove stylesheet
	let uri = Services.io.newURI("resource://mdebw/stylesheet.css", null, null);
	if(Services.ss.sheetRegistered(uri, Services.ss.USER_SHEET))
		Services.ss.unregisterSheet(uri, Services.ss.USER_SHEET);
}

function install(aData, aReason) { }

function uninstall(aData, aReason) { }
