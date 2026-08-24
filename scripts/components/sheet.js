const { HandlebarsApplicationMixin } = foundry.applications.api;
const { sheetV2 } = foundry.applications.sheets;

import {utils} from "../utils.js";

//just some basic commonality between actor and item sheets

export function o13SheetMixin(baseSheet) {
	class o13Sheet extends baseSheet {
		static get DEFAULT_OPTIONS() {
			return foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}), {
				tag: "form",
				form: {
					closeOnSubmit: false,
					submitOnChange: true
				},
				window: {
					resizable: true
				},
				actions: {
					choosePortrait : o13Sheet.choosePortrait
				}
			});
		}
		
		_configureRenderParts(options) {
			let directory = "";
			
			switch (this.document.documentName) {
				case "Actor":
					directory = "actors";
					break;
				case "Item":
					directory = "items";
					break;
			}
			
			return {
				main: {
					template: `systems/13omens/templates/${directory}/${this.document.type}.hbs`
				}
			};
		}
		
		async _onRender(context, options) {
			super._onRender(context, options);
			
			//tabs
			const html = this.element;
			html.querySelectorAll("nav.o13-nav").forEach(nav => {
				const group = nav.getAttribute("nav-group");
				
				nav.querySelectorAll("a[nav-tab]").forEach(a => {
					const tab = a.getAttribute("nav-tab");
					
					a.addEventListener("click", (event) => {
						this._activeo13Tab(group, tab)
					})
				})
				
				if (!nav.querySelector("a[nav-tab].active")) {
					const tab = nav.querySelector("a[nav-tab]").getAttribute("nav-tab");
					console.log(group, tab);
					this._activeo13Tab(group, tab);
				}
			})
		}
		
		async _activeo13Tab(group, tab) {
			const html = this.element;
			
			html.querySelector(`nav.o13-nav[nav-group="${group}"]`)?.querySelectorAll("a[nav-tab]").forEach(a => {
				a.classList.toggle("active", a.getAttribute("nav-tab") == tab);
			})
			
			html.querySelectorAll(`section.o13-tab[nav-group="${group}"]`).forEach(section => {
				section.classList.toggle("active", section.getAttribute("nav-tab") == tab);
			})
		}
		
		async _replaceHTML(result, content, options) {
			//scrollables persistance
			const scrollCache = {};
			if (this.element) {
				const scrollables = this.element.querySelectorAll("[scroll-id]");
				for (const el of scrollables) {
					const id = el.getAttribute("scroll-id");
					if (id) {
						scrollCache[id] = { top: el.scrollTop, left: el.scrollLeft };
					}
				}
			}
			
			//tabs persistance
			const tabCache = {}
			if (this.element) {
				const tabs = this.element.querySelectorAll("nav.o13-nav[nav-group]");
				for (const el of tabs) {
					const tab = (el.querySelector("a[nav-tab].active") || el.querySelector("a[nav-tab]"))?.getAttribute("nav-tab");
					
					if (tab) {
						tabCache[el.getAttribute("nav-group")] = tab;
					}
				}
			}
			
			//input focus persistance
			const activeInputCache = {}
			if (this.element.contains(document.activeElement)) {
				const active = document.activeElement;
				
				const name = active.getAttribute("name");
				if (name) {
					activeInputCache.name = name;
					activeInputCache.selectionStart = active.selectionStart;
					activeInputCache.selectionEnd = active.selectionEnd;
					activeInputCache.selectionDirection = active.selectionDirection;
				}
			}
			
			await super._replaceHTML(result, content, options);
			
			if (this.element) {
				const newScrollables = this.element.querySelectorAll("[scroll-id]");
				for (const el of newScrollables) {
					const id = el.getAttribute("scroll-id");
					const saved = scrollCache[id];
					if (saved) {
						el.scrollTop = saved.top;
						el.scrollLeft = saved.left;
					}
				}
			}
			
			for (const group of Object.keys(tabCache)) {
				this._activeo13Tab(group, tabCache[group]);
			}
			
			if (activeInputCache.name) {
				const toActive = this.element.querySelector(`[name="${activeInputCache.name}"]`);
				if (toActive) {
					toActive.focus();
					if (activeInputCache.selectionStart != null && typeof toActive.setSelectionRange == "function") {
						try {
							toActive.setSelectionRange(activeInputCache.selectionStart, activeInputCache.selectionEnd, activeInputCache.selectionDirection);
						} catch(e) {};
					}
				}
			}
		}
		
		async _prepareContext(options) {
			const context = await super._prepareContext(options);
			
			switch (this.document.documentName) {
				case "Actor":
					context.actor = this.document;
					break;
				case "Item":
					context.item = this.document;
					break;
			}
			
			context.editable = true;
			
			const enrichables = this.document.enrichables ?? {};
			
			context.enriched = await utils.enrichHTMLStructure(enrichables, {
				secrets: this.document.isOwner,
				async: true,
				relativeTo: this.document
			});
			
			return context;
		}
		
		static async choosePortrait(event, target) {
			if (this.document.isOwner) {
				const picker = new foundry.applications.apps.FilePicker.implementation({
					type: "image",
					current: this.document.img,
					callback: async (path) => {
						await this.document.update({img : path})
					}
				}).render(true);
			}
		}
	}
	
	return o13Sheet;
}