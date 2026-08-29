import {utils} from "../utils.js";

export const enrichments = {
	check : {
		pattern: /@check\[\s*([^|\]\s]+)(?:\s*\|\s*(\{(?:[^{}]|\{[^{}]*\})*\}))?\s*\](?:\((.*?)\))?/gi,
		enricher: async (match, options) => {
			const [original, aspect, rollConfigString, customLabel] = match;
			
			let rollConfig = {}
			if (rollConfigString) {
				try {
					rollConfig = utils.tolerantJSONparse(rollConfigString);
				} catch(error) {
					if (CONFIG.debug.o13?.enrichments) console.error(`Failed to parse string ${rollConfigString} during 13 omens enrichment, error:`, error);
				}
			}
			
			const aspectName = game.i18n.has(`13omens.titles.${aspect?.toLowerCase()}`) ? game.i18n.localize(`13omens.titles.${aspect?.toLowerCase()}`)  : "";
			const fallbackLabel = aspectName ? game.i18n.format("13omens.actions.rollcheck", {aspect : aspectName}) : game.i18n.localize("13omens.actions.rollacheck");
			
			const label = customLabel || fallbackLabel;
			const icon = `<i class="fa-solid fa-dice"></i>`;
			
			const enrichedElement = document.createElement("span");
			enrichedElement.classList.add("o13-enrich", "o13-button", "o13-clickable", "o13-inline");
			enrichedElement.setAttribute("enrich-type", "check");
			enrichedElement.innerHTML = `${icon} ${label}`;
			
			enrichedElement.dataset.original = original;
			enrichedElement.dataset.aspect = aspect;
			enrichedElement.dataset.rollConfig = JSON.stringify(rollConfig);
			
			return enrichedElement;
		},
		onclick : (event, enrichedElement, dataAction) => {
			const original = enrichedElement.dataset.original;
			console.log(`Clicked 13 Omens enriched check: ${original}`)
			const aspect = enrichedElement.dataset.aspect;
			const rollConfigString = enrichedElement.dataset.rollConfig;
			
			if (event.ctrlKey) {
				ChatMessage.create({content : original});
				return true;
			}
			
			let rollConfig = {}
			if (rollConfigString) {
				try {
					rollConfig = utils.tolerantJSONparse(rollConfigString);
				} catch(error) {
					if (CONFIG.debug.o13?.enrichments) console.error(`Failed to parse string ${rollConfigString} during 13 omens enrichment, error:`, error);
				}
			}
			
			const actor = utils.currentActor("pc");
			
			if (actor) {
				actor.rollAspect(aspect, rollConfig, event.shiftKey);
				return true;
			}
			else {
				ui.notifications.warn(game.i18n.localize("13omens.warnings.selectActor"), {console : false});
			}
		}
	}
}

export function registerEnrichments() {
	for (const enrich of Object.values(enrichments)) {
		CONFIG.TextEditor.enrichers.push(enrich);
	}
	
	Hooks.once("ready", () => {
		document.addEventListener("click", (event) => {
			const enrichedElement = event.target.closest(".o13-enrich");
			const dataAction = event.target.getAttribute("data-action");
			
			if (!enrichedElement) return;
			
			const type = enrichedElement.getAttribute("enrich-type");
			
			if (enrichments[type]?.onclick) {
				const handled = enrichments[type].onclick(event, enrichedElement, dataAction);
				
				if (handled) {
					event.stopPropagation();
				}
			}
		})
	});
}