const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField, DocumentUUIDField } = foundry.data.fields;

import {virtualItem} from "./virtualItem.js";

import {utils} from "../utils.js";

const USESPEROPTIONS = ["passive", "act", "story", "custom"];

export class o13perkItem extends virtualItem {
	//Choose
	get isChosen() {
		const owner = this.parent;
		
		if (owner?.isPC) {
			return owner.hasPickedPerk(this.id);
		}
	}
	
	//Use
	async resetUses() {
		return this.update({system : {usesper : {value : this.system.usesper.max}}})
	}
	
	get usesPerOptions() {
		return USESPEROPTIONS;
	}
	
	get canBeUsed() {
		return (this.system.usesper.per != USESPEROPTIONS[0]);
	}
	
	get usesMax() {
		return this.system.usesper.max;
	}
	
	get hasMax() {
		return this.system.usesper.max != null
	}
	
	get usesLeft() {
		return this.system.usesper.value ?? 0;
	}
	
	async newAct() {
		if (this.system.usesper.per == "act") {
			await this.resetUses();
		}
	}
	
	async use() {
		if (this.canBeUsed && this.usesLeft > 0) {
			this.update({system : {usesper : {value : this.usesLeft - 1}}});
		}
	}
	
	//Effects
	async createNewEffect(data) {
		const effect = {name : game.i18n.localize("DOCUMENT.ActiveEffect"), ...data};
		
		return this.createEmbeddedDocuments("ActiveEffect", [effect]);
	}
	
	async removeEffect(id) {
		let effect = this.effects.get(id);
		
		if (effect) {
			return this.deleteEmbeddedDocuments("ActiveEffect", [id]);
		}
	}
	
	get effectsActive() {
		const useActive = !this.canBeUsed || this.usesLeft > 0;
		const chosenActive = this.isChosen;
		
		return useActive && chosenActive;
	}

	get activeEffects() {
		let effects = [...this.effects].sort((a,b) => a.sort - b.sort);
		
		return Object.fromEntries(effects.map(effect => [effect.id, effect]));
	}
	
	checkEffectActivation() {
		//cheat with local only to disable effect during data preperation without triggering an actor update
		const effectsActive = this.effectsActive;
		
		let change = false;
		
		for (const effect of this.effects) {
			change = change || (effect.disabled != !effectsActive);
			
			effect.disabled = !effectsActive;
		}
		
		return change;
	}
	
	//chat
	async toChatMessage(chatMessageData = {}) {
		return utils.createHBSChatMessage({item : this, enrichables : this.enrichables}, chatMessageData, "chat/perk");
	}
	
	//data preperation/handling
	get enrichables() {
		return {
			description : this.system.description
		}
	}
	
	async handleDrop(data, event, prepared) {
		let handled = false;
		
		const object = prepared.object;
		//Default sheet drop
		if (!object) return handled;

		if (!prepared.selfOrigin) {
			if(object.documentName == "ActiveEffect") {
				await this.createNewEffect(object.toObject());
				handled = true;
			}
		}
		
		return handled;
	}
	
	prepareDragData(data, event) {
		if (data.effectID) {
			const effect = this.effects.get(data.effectID);
			
			if (effect) {
				data.type = "ActiveEffect",
				data.uuid = effect.uuid;
			}
		}
	}
}

export class perkDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			description: new HTMLField({ required: true, initial: ""}),
			
			usesper:  new SchemaField({
				per : new StringField({ required: true, nullable: true, initial: "passive", choices: USESPEROPTIONS}),
				max : new NumberField({ required: true, integer: true, nullable: true, min: 1, initial: 1 }),
				value : new NumberField({ required: true, integer: true, nullable: true, min: 0, initial: null })
			}),
			
			used : new SchemaField({
				story : new SchemaField({
					uses : new NumberField({ required: true, integer: true, min: 0, initial: 0 })
				}),
				
				acts : new ArrayField(new SchemaField({
					uses : new NumberField({ required: true, integer: true, min: 0, initial: 0 })
				}), {initial: () => Array.from({length : 4}, () => ({uses : 0}))})
			}),
			
			origin: new SchemaField({
				id: new DocumentIdField({required: false, nullable: true, initial: null}),
				parentArchetype: new DocumentUUIDField({required: false, nullable: true, initial: null})
			})
		};
	}
	
	prepareDerivedData() {
		
	}
}