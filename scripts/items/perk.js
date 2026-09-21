const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField, DocumentUUIDField, TypedObjectField } = foundry.data.fields;

import {virtualItemMixin, virtualItemDataModel} from "./virtualItem.js";

import {utils} from "../utils.js";

import {o13checkQuery} from "../dialogues/checkQuery.js";

const USESPEROPTIONS = ["passive", "act", "story", "character", "custom"];

const AECONDITIONOPTIONS = ["usesleft", "usedup", "nextroll"];

export function o13perkItemMixin(base) {
	return class o13perkItem extends virtualItemMixin(base) {
		constructor(...args) {
			super(...args);
			
			this._usedonnextroll = false;
		}
		
		//Choose
		get isChosen() {
			const owner = this.parent;
			
			if (owner?.isPC) {
				return owner.hasPickedPerk(this.id);
			}
		}
		
		//Use
		async resetUses() {
			return this.update({system : {usesper : {value : this.system.usesper.max, usedcharacters : []}}})
		}
		
		get usesPerOptions() {
			return USESPEROPTIONS;
		}
		
		get canBeUsed() {
			return (this.system.usesper.per != USESPEROPTIONS[0]);
		}
		
		get usesMax() {
			if (this.system.usesper.per == "character") {
				return this.availableCharacters.length;
			}
			
			return this.system.usesper.max;
		}
		
		get availableCharacters() {
			return this.parent?.siblingCharacters ?? [];
		}
		
		get hasMax() {
			return this.system.usesper.max != null
		}
		
		get usesLeft() {
			if (this.system.usesper.per == "character") {
				return this.availableCharacters.filter(actor => !this.usedforCharacter(actor)).length;
			}
			
			return this.system.usesper.value ?? 0;
		}
		
		usedforCharacter(character) {
			return this.system.usesper.usedcharacters?.includes(character.id);
		}
		
		async newAct() {
			if (this.system.usesper.per == "act") {
				await this.resetUses();
			}
		}
		
		async use() {
			if (this.system.usesper.per == "character") {
				this.useCharacter();
			}
			else {
				if (this.canBeUsed && this.usesLeft > 0) {
					return this.update({system : {usesper : {value : this.usesLeft - 1}}});
				}
			}
		}
		
		async useCharacter(locked = true) {
			const usedCharacterState = Object.fromEntries(this.availableCharacters.map(actor => {
				return [actor.id, {
					name : actor.name,
					checked : this.usedforCharacter(actor),
					locked : this.usedforCharacter(actor) && locked
				}]
			}));
			
			const updatedState = await new o13checkQuery(usedCharacterState, {query : game.i18n.localize("13omens.titles.used")}).wait(true);
			
			const usedCharacters = Object.keys(updatedState).filter(key => updatedState[key].checked)
			
			return this.update({system : {usesper : {usedcharacters : usedCharacters}}})
		}
		
		async restoreUse() {
			if (this.system.usesper.per == "character") {
				this.useCharacter(false);
			}
			else {
				if (this.canBeUsed) {
					this.update({system : {usesper : {value : Math.min(this.usesLeft + 1, this.usesMax)}}});
				}
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
		
		effectActive(id) {
			const useActive = (!this.canBeUsed && this.getAECondition(id) != "nextroll") || (this.usesLeft > 0 && this.getAECondition(id) == "usesleft") || (this.usesLeft == 0 && this.getAECondition(id) == "usedup");
			const rollToggleActive = this.getAECondition(id) == "nextroll" && this.usedonNextRoll;
			const chosenActive = this.isChosen;

			return (useActive || rollToggleActive) && chosenActive;
		}

		get activeEffects() {
			let effects = [...this.effects].sort((a,b) => a.sort - b.sort);
			
			return Object.fromEntries(effects.map(effect => [effect.id, effect]));
		}
		
		checkEffectActivation() {
			//cheat with local only to disable effect during data preperation without triggering an actor update
			let change = false;
			
			for (const effect of this.effects) {
				const effectsActive = this.effectActive(effect.id);
				
				change = change || (effect.disabled != !effectsActive);
				
				effect.disabled = !effectsActive;
			}
			
			return change;
		}
		
		//AE Conditions
		get AEConditionOptions() {
			return AECONDITIONOPTIONS;
		}
		
		get AEConditions() {
			return Object.fromEntries(Object.keys(this.activeEffects).map(key => [key, this.getAECondition(key)]))
		}
		
		getAECondition(aeID) {
			return this.system.aeconditions[aeID]?.condition ?? AECONDITIONOPTIONS[0];
		}
		
		toggleUseOnNextRoll(refresh = true) {
			this._usedonnextroll = !this._usedonnextroll;
			
			if (refresh) this.parent?.refresh();
		}
		
		onRollRolled(refresh = true) {
			if (this._usedonnextroll) {
				this._usedonnextroll = false;
				
				if (refresh) this.parent?.refresh();
			}
		}
		
		get usedonNextRoll() {
			return this._usedonnextroll;
		}
		
		get hasNextRollUse() {
			return Object.values(this.AEConditions).find(condition => condition == "nextroll");
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
}

export class perkDataModel extends virtualItemDataModel {
	static defineSchema() {
		return {
			...super.defineSchema(),
			
			description: new HTMLField({ required: true, initial: ""}),
			
			usesper:  new SchemaField({
				per : new StringField({ required: true, nullable: true, initial: "passive", choices: USESPEROPTIONS}),
				max : new NumberField({ required: true, integer: true, nullable: true, min: 1, initial: 1 }),
				value : new NumberField({ required: true, integer: true, nullable: true, min: 0, initial: null }),
				usedcharacters : new ArrayField(new DocumentIdField({required: true, blank: true, nullable: true, readonly: false}), { initial: [] })
			}),
			
			aeconditions: new TypedObjectField(
				new SchemaField({
					condition : new StringField({ required: true, nullable: true, initial: AECONDITIONOPTIONS[0], choices: AECONDITIONOPTIONS})
				})
			)
		};
	}
	
	prepareDerivedData() {
		
	}
}