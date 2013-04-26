/* ***** BEGIN LICENSE BLOCK *****
* Version: MIT/X11 License
* 
* Copyright (c) 2010 Erik Vold
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the 'Software'), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*
* Contributor(s):
*   Erik Vold <erikvvold@gmail.com> (Original Author)
*   Greg Parris <greg.parris@gmail.com>
*
* ***** END LICENSE BLOCK ***** */

'use strict';

const NS_XUL = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';

const {unload} = require('unload+');
const {listen} = require('listen');
const {WindowTracker} = require('sdk/deprecated/window-utils');
const {windows} = require('sdk/window/utils');

function isBrowserWindow(window) window.location.href === 'chrome://browser/content/browser.xul'

exports.ToolbarButton = function ToolbarButton(options) {
	let unloaders = [],
		destoryFuncs = [],
		toolbarID = '',
		insertBefore = '',
		destroyed = false;
	
	function moveTo(pos) {
		if (destroyed) return;
		
		// record the new position for future windows
		toolbarID = pos.toolbarID;
		insertBefore = pos.insertBefore;
		
		// change the current position for open windows
		for (let window of windows()) {
			if (!isBrowserWindow(window)) continue;
			
			let $ = function(id) window.document.getElementById(id);
			
			// if the move isn't being forced and it is already in the window, abort
			if (!pos.forceMove && $(options.id)) return;
			
			let tb = $(toolbarID);
			if (tb) tb.insertItem(options.id, $(insertBefore), null, false);
			// TODO: if b4 dne, but insertBefore is in currentset, then find toolbar to right
		};
	}
	
	let delegate = {
		onTrack: function (window) {
			if (!isBrowserWindow(window) || destroyed) return;
			
			let doc = window.document;
			let $ = function(id) doc.getElementById(id);
			
			// create toolbar button
			let tbb = doc.createElementNS(NS_XUL, 'toolbarbutton');
			tbb.setAttribute('id', options.id);
			tbb.setAttribute('type', options.type || 'button');
			tbb.setAttribute('class', 'toolbarbutton-1 chromeclass-toolbar-additional');
			tbb.setAttribute('removable', 'true');
			tbb.setAttribute('label', options.label);
			
			if (options.image) tbb.setAttribute('image', options.image)
			if (options.modify) options.modify(tbb);
			tbb.addEventListener('command', function(event) {
				if (options.onCommand)
					options.onCommand(event);
				
				if (options.panel)
					options.panel.show(tbb);
			}, true);
			if (options.onClick)
				tbb.addEventListener('click', options.onClick, true);
			
			// add toolbarbutton to palette
			($('navigator-toolbox') || $('mail-toolbox')).palette.appendChild(tbb);
			
			// find a toolbar to insert the toolbarbutton into
			let tb;
			if (toolbarID) tb = $(toolbarID);
			if (!tb) tb = toolbarbuttonExists(doc, options.id);
			
			// found a toolbar to use?
			if (tb) {
				let b4;
				
				// find the toolbarbutton to insert before
				if (insertBefore)
					b4 = $(insertBefore);
				
				if (!b4) {
					let currentset = tb.getAttribute('currentset').split(',');
					let i = currentset.indexOf(options.id) + 1;
					
					// was the toolbarbutton id found in the curent set?
					if (i > 0) {
						// find a toolbarbutton to the right which actually exists
						for (; i < currentset.length; i++) {
							b4 = $(currentset[i]);
							if (b4) break;
						}
					}
				}
				
				tb.insertItem(options.id, b4, null, false);
			}
			
			let saveTBNodeInfo = function(e) {
				toolbarID = tbb.parentNode.getAttribute('id') || '';
				insertBefore = (!tbb.nextSibling) ? '' : tbb.nextSibling.getAttribute('id').replace(/^wrapper-/i, '');
				moveTo({
					toolbarID: toolbarID,
					insertBefore: insertBefore,
					forceMove: true,
				});
			};
			
			window.addEventListener('aftercustomization', saveTBNodeInfo, false);
			
			// add unloader to unload+'s queue
			let unloadFunc = function() {
				tbb.parentNode.removeChild(tbb);
				window.removeEventListener('aftercustomization', saveTBNodeInfo, false);
			};
			let index = destoryFuncs.push(unloadFunc) - 1;
			listen(window, window, 'unload', function() {
				destoryFuncs[index] = null;
			}, false);
			unloaders.push(unload(unloadFunc, window));
		}
	};
	let tracker = WindowTracker(delegate);
	
	return {
		destroy: function() {
			if (destroyed) return;
			destroyed = true;
			
			if (options.panel)
				options.panel.destroy();
			
			// run unload functions
			for (let u of destoryFuncs)
				if (u) u();
			destoryFuncs.length = 0;
			
			// remove unload functions from unload+'s queue
			for (let u of unloaders) u();
			unloaders.length = 0;
		},
		moveTo: moveTo,
	};
};

exports.getProxy = function(options) {
	let toolbarbuttons = [];
	let proxy = new FakeProxy({ getTBBs: function() toolbarbuttons });
	
	if (options.id) {
		let winIndex = 0;
		
		let delegate = {
			onTrack: function(window) {
				if (!isBrowserWindow(window)) return;
				
				let i = winIndex++;
				function findTBB() {
					if (!toolbarbuttons[i])
						toolbarbuttons[i] = window.document.getElementById(options.id);
				}
				findTBB();
				
				window.addEventListener('aftercustomization', findTBB, false);
				
				// add unloader to unload+'s queue
				unload(function() {
					window.removeEventListener('aftercustomization', findTBB, false);
				}, window);
			}
		};
		let tracker = WindowTracker(delegate);
	}
	
	return proxy;
};

function FakeProxy(options) {
	let classList = {
		add: function(aClassName) {
			for (let tbb of options.getTBBs()) {
				if (!tbb) return;
				tbb.classList.add(aClassName);
			}
		},
		remove: function(aClassName) {
			for (let tbb of options.getTBBs()) {
				if (!tbb) return;
				tbb.classList.remove(aClassName);
			}
		}
	};
	
	this.__defineGetter__('classList', function() classList);
	
	this.getTBBs = options.getTBBs;
	
	return this;
}

function toolbarbuttonExists(doc, id) {
	for (let toolbar of doc.getElementsByTagNameNS(NS_XUL, 'toolbar')) {
		if (toolbar.getAttribute('currentset').split(',').indexOf(id) !== -1)
			return toolbar;
	}
	return false;
}
