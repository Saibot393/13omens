const { HandlebarsApplicationMixin } = foundry.applications.api;
const { sheetV2 } = foundry.applications.sheets;

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

			if (this.document.system?.description) {
				context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
					this.document.system.description ?? "",
					{
						secrets: this.document.isOwner,
						async: true,
						relativeTo: this.document
					}
				);
			};
			
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