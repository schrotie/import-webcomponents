function defineES5Element(tag) {
	function _inherits(subClass, superClass) {
		subClass.prototype = Object.create(
			superClass && superClass.prototype,
			{
				constructor: {
					value: subClass,
					enumerable: false,
					writable: true,
					configurable: true,
				},
			}
		);
		if(superClass) {
			Object.setPrototypeOf ?
				Object.setPrototypeOf(subClass, superClass) :
				subClass.__proto__ = superClass;
		}
	}

	var SimpleElement = function() {
		_inherits(SimpleElement, HTMLElement);
		function SimpleElement() {
			var _this = (
				SimpleElement.__proto__ ||
				Object.getPrototypeOf(SimpleElement)
			).call(this);
			return _this;
		}
		SimpleElement.prototype.connectedCallback = function() {
			this.innerHTML = tag + ' loaded';
		};
		return SimpleElement;
	}();
	window.customElements.define(tag, SimpleElement);
}

defineES5Element('my-wc');
