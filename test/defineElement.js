export default function defineElement(tag) {
	window.customElements.define(tag, class extends HTMLElement {
		constructor() {
			super();
			this.innerHTML = `${tag} loaded`;
		}
	});
}
