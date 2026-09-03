const { HandlebarsApplicationMixin } = foundry.applications.api;
const { sheetV2 } = foundry.applications.sheets;

import {utils} from "../utils.js";

//just some basic commonality between actor and item sheets

export function o13SheetMixin(baseSheet) {
	class o13Sheet extends baseSheet {
		constructor(options = {}) {
			super(options);

			if (CONFIG.debug.o13.dialogues) console.log(this);

			this._boundonAction = this._onAction.bind(this);
			
			//custom Hooks
			this._externalItemUpdateRender = Hooks.on("updateItem", async (item, changes, options, userId) => {
				if (this.rendered) {
					const rerender = await this._onUpdateItem(item, changes, options, userId);
					if (rerender) this.render({force : false, window : {focus : false}});
				}
			});
			
			this._externalItemCreateRender = Hooks.on("createItem", async (item, options, userId) => {
				if (this.rendered) {
					const rerender = await this._onUpdateItem(item, {create : true}, options, userId);
					if (rerender) this.render({force : false, window : {focus : false}});
				}
			});
			
			this._externalItemDeleteRender = Hooks.on("deleteItem", async (item, options, userId) => {
				if (this.rendered) {
					const rerender = await this._onUpdateItem(item, {delete : true}, options, userId);
					if (rerender) this.render({force : false, window : {focus : false}});
				}
			});
		
			this._externalActorUpdateRender = Hooks.on("updateActor", async (actor, changes, options, userId) => {
				if (this.rendered) {
					const rerender = await this._onUpdateActor(actor, changes, options, userId);
					if (rerender) this.render({force : false, window : {focus : false}});
				}
			});
		}
		
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
			
			this.element.removeEventListener("click", this._boundonAction)
			this.element.addEventListener("click", this._boundonAction);
			
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
			if (this.element?.contains(document.activeElement)) {
				const active = document.activeElement;
				
				const name = active.getAttribute("name");
				if (name) {
					activeInputCache.name = name;
					activeInputCache.selectionStart = active.selectionStart;
					activeInputCache.selectionEnd = active.selectionEnd;
					activeInputCache.selectionDirection = active.selectionDirection;
				}
			}
			
			//textarea height persistance
			const textAreaHeights = {};
			if (this.element) {
				const textAreas = this.element.querySelectorAll("textarea[name]");
				
				for (const el of textAreas) {
					const name = el.getAttribute("name");
					
					if (name && el.style?.height) {
						textAreaHeights[name] = el.style.height;
					}
				}
			}
			
			await super._replaceHTML(result, content, options);
			
			if (this.element) {
				const newScrollables = this.element.querySelectorAll("[scroll-id]");
				for (const el of newScrollables) {
					const id = el.getAttribute("scroll-id");
					const saved = scrollCache[id];
					
					if (saved) {
						requestAnimationFrame(() => {
							el.scrollTop = saved.top;
							el.scrollLeft = saved.left;
						});
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
			
			for (const key of Object.keys(textAreaHeights)) {
				const textarea = this.element.querySelector(`textarea[name="${key}"]`);
				
				if (textarea) {
					textarea.style.height = textAreaHeights[key];
				}
			}
		}
		
		async _prepareContext(options) {
			const context = await super._prepareContext(options);
			
			switch (this.document?.documentName) {
				case "Actor":
					context.actor = this.document;
					break;
				case "Item":
					context.item = this.document;
					break;
			}
			
			context.editable = true;
			
			const enrichables = this.document?.enrichables ?? {};
			
			context.enriched = foundry.utils.isEmpty(enrichables) ? {} : await utils.enrichHTMLStructure(enrichables, {
				secrets: this.document.isOwner,
				async: true,
				relativeTo: this.document
			});
			
			return context;
		}
		
		async _onUpdateItem(item, changes, options, userId) {
			
		}
		
		async _onUpdateActor(actor, changes, options, userId) {
			
		}
		
		async _onAction(event) {
			const target = event?.target?.closest("[data-action]");
			const action = target?.getAttribute("data-action");

			if (!action) return;
			
			event.stopPropagation();

			if (this.constructor.DEFAULT_OPTIONS?.actions?.[action]) return; //other defined sheets action, let foundry handle it

			if (typeof this[action] == "function") return this[action](event, target); //equally named sheet action

			if (typeof this.document?.[action] == "function") return this.document?.[action](); //equally named document action

			//some default foundry actions are not handled here:
			if (!["save"].includes(action))console.warn(`Unhandled sheet action ${action} at click:`, target);
		}
		
		async _onDrop(event) {
			event.preventDefault();
			if (!this.document.handleDrop) return;
			const targetElement = event.target;
			
			const dragData = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
			if (!dragData) return;
			
			const sortElement = targetElement.closest(".o13-sortable");
			
			const object = await fromUuid(dragData.uuid);
			const selfOrigin = object?.parent == this.document;
			const dropZone = targetElement.closest("[drop-zone]")?.getAttribute("drop-zone");
			const sourceIDData = Object.fromEntries(["story", "pc", "npc", "archetype", "perk", "gear", "effect"].map(type => ([`${type}ID`, dragData[`${type}ID`]])));
			const targetIDData = Object.fromEntries(["story", "pc", "npc", "archetype", "perk", "gear", "effect"].map(type => ([`${type}ID`, sortElement?.getAttribute(`${type}-id`)])));
			const sortBehaviour = sortElement?.closest("[sort-behaviour]")?.getAttribute("sort-behaviour");
			const sortDirection = sortElement?.closest("[sort-direction]")?.getAttribute("sort-direction");
			
			let sortBefore = undefined;
			const rect = sortElement?.getBoundingClientRect();
			if (rect) {
				switch (sortDirection) {
					case "l_r":
						const relativeX = event.clientX - rect.left;
						sortBefore = relativeX < rect.width/2;
						break;
					case "t_b":
						const relativeY = event.clientY - rect.top;
						sortBefore = relativeY < rect.height/2;
						break;
				}
			}
			
			const prepared = {object : object, dropZone : dropZone, selfOrigin: selfOrigin, sourceID : sourceIDData, targetID : targetIDData, sortBefore : sortBefore, sortBehaviour : sortBehaviour};
			
			if (CONFIG.debug.o13.dragndrop) console.warn(`Handling 13 omens drop:`, dragData, prepared);
			
			const handled = await this.document.handleDrop(dragData, event, prepared);
			
			if (!handled && sortBehaviour == "AUTO") {
				this._autoSort(dragData, event, prepared);
			}
		}
		
		async _autoSort(data, event, prepared) {
			let handled = false;
			
			const object = prepared.object;
			if (!object) return handled;
		
			let idType = "";
			let collectionName = "";
			
			if (object instanceof Item) {
				idType = object.type;
				collectionName = "Item"
			}
			if (object instanceof ActiveEffect) {
				idType = "effect";
				collectionName = "ActiveEffect";
			}
		
			if (prepared.selfOrigin) {
				const targetID = prepared.targetID[idType + "ID"];
			
				const target = this.document[object.collectionName].get(targetID);

				if (CONFIG.debug.o13.dragndrop) console.warn(`Handling 13 omens auto sort:`, object, target, idType, collectionName);

				if (target?.type == object.type) {
					const siblings = [...this.document[object.collectionName]].filter(entry => entry.type == object.type);

					if ((prepared.sortBefore || prepared.sortBefore == undefined) && object.sort < target.sort && !siblings.some(sibling => sibling.sort > object.sort && sibling.sort < target.sort)) prepared.sortBefore = false;

					const sorted = foundry.utils.performIntegerSort(object, {
						target: target,
						siblings: siblings,
						sortKey: "sort",
						sortBefore : (prepared.sortBefore || prepared.sortBefore == undefined)
					})
					
					await this.document.updateEmbeddedDocuments(collectionName, sorted.map(entry => ({_id : entry.target._id, sort : entry.update.sort})));
					
					handled = true;
				}
			}
			
			return handled;
		}
		
		_onDragStart(event) {
			const element = event.currentTarget;

			const IDdata = ["story", "pc", "npc", "archetype", "perk", "gear", "effect"].map(type => ([`${type}ID`, element.getAttribute(`${type}-id`)]));
			
			const dragData = Object.fromEntries(IDdata);
			
			if (this.document.prepareDragData) this.document.prepareDragData(dragData, event);

			if (CONFIG.debug.o13.dragndrop) console.warn(`Handling 13 omens drag:`, dragData);
			
			event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
		}
		
		async choosePortrait(event, target) {
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
		
		async viewPortrait(event, target) {
			new foundry.applications.apps.ImagePopout({
				src: this.document.img,
				window: {
					title: this.document.name
				},
				uuid: this.document.uuid
			}).render(true);
		}
		
		_disableExternalRenderHooks() {
			Hooks.off("updateItem", this._externalItemUpdateRender);
			this._externalItemUpdateRender = null;
			Hooks.off("createItem", this._externalItemCreateRender);
			this._externalItemCreateRender = null;
			Hooks.off("deleteItem", this._externalItemDeleteRender);
			this._externalItemDeleteRender = null;
			Hooks.off("updateActor", this._externalActorUpdateRender);
			this._externalActorUpdateRender = null;
		}
		
		async _onClose(options) {
			await super._onClose(options);
		
			this._disableExternalRenderHooks();
		}
	}
	
	return o13Sheet;
}