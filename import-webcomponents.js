/**
* @license
* Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
* Copyright (c) 2018 Thorsten Roggendorf. All rights reserved.
* This code may only be used under the BSD style license found at
* http://polymer.github.io/LICENSE.txt
* The complete set of authors may be found at
* http://polymer.github.io/AUTHORS.txt
* The complete set of contributors may be found at
* http://polymer.github.io/CONTRIBUTORS.txt
* Code distributed by Google as part of the polymer project is also
* subject to an additional IP rights grant found at
* http://polymer.github.io/PATENTS.txt
*/

(function() {
	'use strict';

	/**
	* Basic flow of the loader process
	*
	* There are 4 flows the loader can take when booting up
	*
	* - Synchronous script, no polyfills needed
	*   - wait for `DOMContentLoaded`
	*   - run callbacks passed to `waitFor`
	*   - fire WCR event
	*
	* - Synchronous script, polyfills needed
	*   - document.write the polyfill bundle
	*   - wait on the `load` event of the bundle to batch Custom Element upgrades
	*   - wait for `DOMContentLoaded`
	*   - run callbacks passed to `waitFor`
	*   - fire WCR event
	*
	* - Asynchronous script, no polyfills needed
	*   - fire WCR event, as there could not be any callbacks passed to `waitFor`
	*
	* - Asynchronous script, polyfills needed
	*   - Append the polyfill bundle script
	*   - wait for `load` event of the bundle
	*   - batch Custom Element Upgrades
	*   - run callbacks pass to `waitFor`
	*   - fire WCR event
	*/

	// polyfill variables
	var polyfillsLoaded = false;
	var whenLoadedFns = [];
	var allowUpgrades = false;
	var flushFn;

	// component loader variables
	var componentImports = [];
	var libraryImports = [];
	var importedLibraries = 0;

	function fireEvent() {
		window.WebComponents.ready = true;
		document.dispatchEvent(
			new CustomEvent('WebComponentsReady', {bubbles: true})
		);
		importWebcomponents();
	}

	function batchCustomElements() {
		if (window.customElements && customElements.polyfillWrapFlushCallback) {
			customElements.polyfillWrapFlushCallback(function(flushCallback) {
				flushFn = flushCallback;
				if (allowUpgrades) {
					flushFn();
				}
			});
		}
	}

	function asyncReady() {
		batchCustomElements();
		ready();
	}

	function ready() {
		// bootstrap <template> elements before custom elements
		if (window.HTMLTemplateElement && HTMLTemplateElement.bootstrap) {
			HTMLTemplateElement.bootstrap(window.document);
		}
		polyfillsLoaded = true;
		runWhenLoadedFns().then(fireEvent);
	}

	function runWhenLoadedFns() {
		allowUpgrades = false;
		var done = function() {
			allowUpgrades = true;
			whenLoadedFns.length = 0;
			flushFn && flushFn();
		};
		return Promise.all(whenLoadedFns.map(function(fn) {
			return fn instanceof Function ? fn() : fn;
		}))
			.then(function() {done();})
			// eslint-disable-next-line no-console
			.catch(function(err) {console.error(err);});
	}

	window.WebComponents = window.WebComponents || {};
	window.WebComponents.ready = window.WebComponents.ready || false;
	window.WebComponents.waitFor = window.WebComponents.waitFor ||
	function(waitFn) {
		if (!waitFn) {
			return;
		}
		whenLoadedFns.push(waitFn);
		if (polyfillsLoaded) {
			runWhenLoadedFns();
		}
	};
	window.WebComponents._batchCustomElements = batchCustomElements;

	// Feature detect which polyfill needs to be imported.
	var polyfills = [];
	if(
		!(
			'attachShadow' in Element.prototype &&
			'getRootNode' in Element.prototype
		) ||
		(window.ShadyDOM && window.ShadyDOM.force)
	) polyfills.push('sd');
	if(!window.customElements || window.customElements.forcePolyfill) {
		polyfills.push('ce');
	}

	var needsTemplate = (function() {
		// no real <template> because no `content` property
		// (IE and older browsers)
		var t = document.createElement('template');
		if (!('content' in t)) {
			return true;
		}
		// broken doc fragment (older Edge)
		if (!(t.content.cloneNode() instanceof DocumentFragment)) {
			return true;
		}
		// broken <template> cloning (Edge up to at least version 17)
		var t2 = document.createElement('template');
		t2.content.appendChild(document.createElement('div'));
		t.content.appendChild(t2);
		var clone = t.cloneNode(true);
		return (clone.content.childNodes.length === 0 ||
			clone.content.firstChild.content.childNodes.length === 0);
	})();

	prepareWebcomponentsImport();
	// NOTE: any browser that does not have template or ES6 features
	// must load the full suite of polyfills.
	if (
		!window.Promise ||
		!Array.from ||
		!window.URL ||
		!window.Symbol ||
		needsTemplate
	) polyfills = ['sd-ce-pf'];

	if (polyfills.length) {
		var url;
		var polyfillFile = 'bundles/webcomponents-' + polyfills.join('-') + '.js';

		// Load it from the right place.
		var path;
		if (window.WebComponents.root) path = window.WebComponents.root;
		else {
			var script = document.querySelector('script[data-wc-root]');
			if(script) path = script.getAttribute('data-wc-root') + '/';
			else path = '/node_modules/@webcomponents/webcomponentsjs/';
		}
		url = path + polyfillFile;

		var newScript = document.createElement('script');
		newScript.src = url;
		// if readyState is 'loading', this script is synchronous
		if (document.readyState === 'loading') {
			// make sure custom elements are batched whenever parser gets to the
			// injected script
			newScript.setAttribute(
				'onload', 'window.WebComponents._batchCustomElements()'
			);
			document.write(newScript.outerHTML);
			document.addEventListener('DOMContentLoaded', ready);
		} else {
			newScript.addEventListener('load', function() {
				asyncReady();
			});
			newScript.addEventListener('error', function() {
				throw new Error('Could not load polyfill bundle' + url);
			});
			document.head.appendChild(newScript);
		}
	} else {
		polyfillsLoaded = true;
		if (document.readyState === 'complete') {
			fireEvent();
		} else {
			// this script may come between DCL and load, so listen for both,
			// and cancel load listener if DCL fires
			window.addEventListener('load', ready);
			window.addEventListener('DOMContentLoaded', function() {
				window.removeEventListener('load', ready);
				ready();
			});
		}
	}

	function prepareWebcomponentsImport() {
		const src = document.querySelectorAll('link[rel="preload"][data-es5]');
		for(var i = 0; i < src.length; i++) {
			componentImports.push(
				src[i].getAttribute(needsES5() ? 'data-es5' : 'href')
			);
			if(needsES5() && src[i].hasAttribute('data-lib')) {
				libraryImports.push(src[i].getAttribute('data-lib'));
			}
		}
		for(var j = 0;  j < libraryImports.length; j++) {
			importScript(libraryImports[j], false, libraryImported);
		}
	}

	function needsES5() {
		return !window.Promise ||
			!('noModule' in HTMLScriptElement.prototype) ||
			!Array.from ||
			!window.URL ||
			!window.Symbol;
	}

	function libraryImported() {
		importedLibraries++;
		importWebcomponents();
	}

	function importWebcomponents() {
		if(!polyfillsLoaded || (importedLibraries < libraryImports.length)) {
			return;
		}
		for(var i = 0; i < componentImports.length; i++) {
			importScript(componentImports[i]);
		}
	}

	function importScript(src, callback) {
		const newScript = document.createElement('script');
		newScript.src = src;
		if(!needsES5()) newScript.setAttribute('type', 'module');
		if(callback) newScript.addEventListener('load', callback);
		document.head.appendChild(newScript);
	}
})();
