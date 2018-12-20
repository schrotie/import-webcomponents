# import-webcomponents
Small helper script to help loading web components and their dependencies

## What?

```html
<html>
	<head>
		<link rel="preload" href="my-webcomponent.js"       as="script"
			data-es5="my-webcomponentES5.js"       data-lib="defineES5Element.js">
		<link rel="preload" href="my-other-webcomponent.js" as="script"
			data-es5="my-other-webcomponentES5.js" data-lib="defineES5Element.js">
		<script src="import-webcomponents.js" async></script>
	</head>
	<body>
		<my-webcomponent></my-webcomponent><br/>
		<my-other-webcomponent></my-other-webcomponent>
	</body>
</html>
```

Will load `my-[other-]webcomponent.js` for modern browsers without delay and will load `my-[other-]webcomponentES5.js` for old browsers after loading the polyfills and `defineES5Element.js`. Modern browsers (80%) waste zero time, old browsers may unnecessarily load and discard the modern version (they shouldn't understand `<link rel="preload" ...` but IEE does) and will load their version after `import-webcomponents.js` is loaded and executed and after the polyfills and dependency library are loaded.

## Why?

Using web components today - end of 2018 - is a challenge, though a worthwhile one. The problem is: what a web component does and how it works varies wildly depending on browser capabilities. For 80% of the users web components are a slick modern technology that requires minimal overhead and just works (TM) out of the box. For the other 20% they are a bloated abomination of convoluted (transpiled) code, barely kept afloat by the most advanced set of polyfills the web has to offer.

The standard approach for dealing with this is to set up your web server to decide whether to serve beauty or abomination based on who asks. I used to recommend that, too. Though I never did it myself, and I guess most projects don't bother either. And failing that, the authors of said polyfills [recommend](https://github.com/webcomponents/webcomponentsjs#custom-elements-es5-adapterjs) to wrap the abomination in another abomination to make it at least work. Somehow.

This situation is hardly acceptable. For the sake of 20% of the users - those 20% who care least for modern technology - we sacrifice footprint, performance, and debuggability for the other 80%.

Thus I worked out an approach that will deliver slick beauty to the 80% _without delay_ and keep the 20% afloat. Somehow. Turns out, this approach has little disadvantage over the server side approach. The server could make the experience of the 20% a bit faster at the expense of duplicating logic.

The reason is, that client side code has to decide anyway, whether or not to load the polyfills. So `import-webcomponents` is a small addition to the standard polyfill loader.


## How?

`<link rel="preload" ...>` is a modern technology that tells the browser to load the designated file since it will be required soon. `import-webcomponents.js` looks for all `<link rel="preload" data-es5>`. It evaluates the browser capabilities and either tells the browser to evaluate the modern version or load polyfills and old version.

Thus in order to use `import-webcomponents.js` you need to prepare two builds.
1. The _modern_ build should just [rollup](https://rollupjs.org/guide/en) your web component and then [uglify](https://www.npmjs.com/package/uglify-es) it.
2. The _backported_ build should [rollup](https://rollupjs.org/guide/en) your web component, then [transpile](https://babeljs.io/) and then finally [uglify](https://www.npmjs.com/package/uglify-es).

If you have big dependencies (like [Polymer](https://polymer-library.polymer-project.org/)) _and_ want to load several web components separately, you should exclude the dependency from rollup and build it separately. In your modern code you just leave the respective import statement. In addition you may want to add a `<link rel="preload" href="my-dependency.js">` to the head (without `data-es5`!). That way there will be no delays for loading the web component and only then figuring out the dependency is required.

__Caveat__: A few intermediate browser versions exist that support web components but do not support `import`. For these my plan is to load the backported version _and_ load [custom-elements-es5-adapter.js](https://github.com/webcomponents/webcomponentsjs#custom-elements-es5-adapterjs). The latter is __not yet implemented__!

For your backported version `import-webcomponents.js` supports loading such (backported!) dependency libraries before your web components.

In your `<head>` put the `<link rel="preload">` first and only then
```html
<script src="import-webcomponents.js" async></script>
```
Otherwise if the script is cached it may be executed while the head is still loading and it would miss components!

For optimal page load performance I recommend loading `import-webcomponents.js` `async`. In that case you may want your web components to be [hidden until defined](https://developers.google.com/web/fundamentals/web-components/customelements#prestyle)!

### API
`import-webcomponents.js` does
```js
document.querySelectorAll('link[rel="preload"][data-es5]');
```
in order to determine what to do. It supports the following attributes in the `<link>` elements:
* __href__  
This is automatically evaluated by the browser and `import-webcomponents.js` will use it to determine what to evaluate for modern browsers (i.e. it adds a `<script>` tag to the `<head>` with the respective `src` attribute)
* __data-es5__  
string that determines what to load for old browsers
* __data-lib__  
library to load _before_ `data-es5`; use ES6 `import` in your modern code to load dependencies (add `preload`s without `data-es5` for these for optimal performance on modern browsers)

__Web Components Root__: `import-webcomponents` uses three ways to determine from where to load the polyfills:
1. [standard polyfill approach](https://github.com/webcomponents/webcomponentsjs#using-webcomponents-loaderjs): `window.WebComponents.root`
2. look for the `data-wc-root` attribute on the `<script>` tag that loaded `import-webcomponents`
3. fall back to `/node_modules/@webcomponents/webcomponentsjs/`
