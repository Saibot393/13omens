const { HTMLField, NumberField, SchemaField, StringField, ArrayField, EmbeddedDocumentField, DocumentIdField, BooleanField, FilePathField, ObjectField, DocumentUUIDField } = foundry.data.fields;

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class o13Item extends Item {
	async update(data={}, options={}) {
		if (this.hasParentAchetype && !this.parent) {
			await this.parentArchetype.updateSubItem(this.originID, data);
			
			switch (this.type) {
				case "peark" : this.updateSource(this.parentArchetype.perksData[this.id]); break;
				case "gear" : this.updateSource(this.parentArchetype.gearData[this.id]); break;
			}
			
			this.sheet?.render(false);
            return this;
		}
		
		return super.update(data, options);
	}
	
	get isArchetype() {
		return this.type == "archetype";
	}
	
	get isPerk() {
		return this.type == "perk";
	}
	
	get isGear() {
		return this.type == "gear";
	}
	
	async addSubItem(item) {
		if (this.isArchetype && (item instanceof o13Item)) {
			const data = item.toObject();
			
			data._id = foundry.utils.randomID();
			
			foundry.utils.setProperty(data, "flags.core.sourceId", item.uuid);
			data.system.origin.parentArchetype = this.uuid;
			data.system.origin.id = data._id;
			
			if (item?.isPerk) {
				return this.update({system : {perks : {[data._id] : data}}});
			}
			
			if (item?.isGear) {
				return this.update({system : {gear : {[data._id] : data}}});
			}
		}
	}
	
	get hasParentAchetype() {
		if (this.isPerk || this.isGear) {
			return Boolean(this.system.origin.parentArchetype);
		}
	}
	
	get parentArchetype() {
		if (this.hasParentAchetype) {
			const parentUUID = this.system.origin.parentArchetype;
			
			return fromUuidSync(parentUUID);
		}
	}
	
	get isVirtualItem() {
		return this.hasParentAchetype && !this.parent;
	}
	
	get originID() {
		if (this.hasParentAchetype) {
			return this.system.origin.id
		}
	}
	
	get isArchetypeOrigin() {
		if (this.isPerk || this.isGear) {
			return Boolean(this.system.origin?.id && this.system.origin?.parentArchetype);
		}
	}	
	
	isFromOrigin(originid) {
		if (this.isPerk || this.isGear) {
			return this.originID == originid;
		}
	}
	
	async removeSubItem(id) {
		if (this.isArchetype) {
			if (this.system.perks[id]) {
				//return this.update({[`system.perks.-=${id}`] : null})
				return this.update({system : {perks : {[id] : _del}}})
			}
			if (this.system.gear[id]) {
				//return this.update({[`system.gear.-=${id}`] : null})
				return this.update({system : {gear : {[id] : _del}}})
			}
		}
	}
	
	async updateSubItem(itemid, data) {
		if (this.isArchetype) {
			const currentData = this.system.perks[itemid] || this.system.gear[itemid];
			
			if (currentData && ((currentData.type == data.type) || !data.hasOwnProperty("type"))) {
				const cleanedData = {...data, _id : currentData._id}; //make sure update doesnt change _id
				foundry.utils.setProperty(cleanedData, "system.origin.parentArchetype", this.uuid);
				foundry.utils.setProperty(cleanedData, "system.origin.id", currentData._id);
				
				switch (currentData.type) {
					case "perk" : return this.update({system : {perks : {[itemid] : cleanedData}}}); break;
					case "gear" : return this.update({system : {gear : {[itemid] : cleanedData}}}); break;
				}
			}
		}
	}
	
	async createNewPerk(data = {}) {
		if (this.isArchetype) {
			const perk = new o13Item({name : game.i18n.localize("13omens.titles.perk"), ...data, type : "perk"});

			return this.addSubItem(perk);
		}
	}
	
	async createNewGear(data = {}) {
		if (this.isArchetype) {
			const gear = new o13Item({name : game.i18n.localize("13omens.titles.gear"), ...data, type : "gear"});
			
			return this.addSubItem(gear);
		}
	}
	
	get perksData() {
		if (this.isArchetype) {
			return this.system.perks;
		}
	}
	
	getPerkItem(id) {
		if (this.isArchetype) {
			const data = this.system.perks[id];
			
			if (data && data.type == "perk") {
				const perk = new o13Item(data);
				
				if (perk.isPerk) {
					return perk;
				}
			}
		}
	}
	
	get gearData() {
		if (this.isArchetype) {
			return this.system.gear;
		}
	}
	
	getGearItem(id) {
		if (this.isArchetype) {
			const data = this.system.gear[id];
			
			if (data && data.type == "gear") {
				const gear = new o13Item(data);
				
				if (gear.isGear) {
					return gear;
				}
			}
		}
	}
	
	get parentArchetype() {
		if (this.isPerk || this.isGear) {
			const uuid = this.system.origin.parentArchetype;
			
			if (uuid) {
				const archetype = fromUuidSync(uuid);
				
				if (archetype.isArchetype) {
					return archetype;
				}
			}
		}
	}
	
	hasPerk(id) {
		if (this.isArchetype) {
			return Boolean(this.system.perks[id]);
		}
	}
	
	hasGear(id) {
		if (this.isArchetype) {
			return Boolean(this.system.gear[id]);
		}
	}
	
	get storyActor() {
		if (this.isArchetype) {
			if (this.parent?.type == "story") {
				return this.parent;
			}
		}
	}
	
	get archetypeAspect() {
		if (this.isArchetype) {
			return this.storyActor?.getArchetypeAspect(this);
		}
	}
	
	get isChosen() {
		
	}
	
	get quantityValue() {
		if (this.isGear) {
			return this.system.quantity.value ?? this.system.quantity.max;
		}
	}
	
	get quantityMax() {
		if (this.isGear) {
			return this.system.quantity.max ?? Infinity;
		}
	}
	
	get hasQuantityMax() {
		if (this.isGear) {
			return this.quantityMax < Infinity;
		}
	}

	async changeQuantity(change) {
		if (this.isGear) {
			console.log(change);
			return this.update({system : {quantity : {value : Math.min(Math.max(0, this.quantityValue + change), this.quantityMax)}}});
		}
	}
	
	async breakGear() {
		if (this.isGear) {
			return this.changeQuantity(-1);
		}
	}
	
	async repairGear() {
		if (this.isGear) {
			return this.changeQuantity(1);
		}
	}
	
	async completelyBroken() {
		if (this.isGear) {
			return this.quantityValue <= 0;
		}
	}
	
	async markAsGuaranteedGear(id) {
		if (this.isArchetype) {
			if (this.hasGear(id)) {
				return this.update({system : {guaranteedgear : {[id] : true}}})
			}
		}
	}
	
	async removeFromGuaranteedGear(id) {
		if (this.isArchetype) {
			if (this.hasGear(id)) {
				return this.update({system : {guaranteedgear : {[id] : _del}}})
			}
		}
	}
	
	isGuaranteedGear(id) {
		if (this.isArchetype) {
			if (this.hasGear(id)) {
				return this.system.guaranteedgear[id];
			}
		}
	}
	
	async toggleGuaranteedGear(id) {
		if (this.isArchetype) {
			if (this.hasGear(id)) {
				if (this.isGuaranteedGear(id)) {
					return this.removeFromGuaranteedGear(id);
				}
				else {
					return this.markAsGuaranteedGear(id);
				}
			}
		}
	}
	
	get guaranteedGear() {
		if (this.isArchetype) {
			return Object.fromEntries(Object.keys(this.system.gear).filter(id => this.isGuaranteedGear(id)).map(id => [id, this.system.gear[id]]));
		}
	}
	
	get unguaranteedGear() {
		if (this.isArchetype) {
			return Object.fromEntries(Object.keys(this.system.gear).filter(id => !this.isGuaranteedGear(id)).map(id => [id, this.system.gear[id]]));
		}
	}
	
	get selectableGearCount() {
		if (this.isArchetype) {
			return this.system.selectablegearcount
		}
	}
	
	isFromArchetype(archetype) {
		if (this.isPerk && this.isGear) {
			return this.system.origin.parentArchetype == archetype?.id;
		}
	}
}

export class o13ItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
	static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
		classes: ["13omens", "item-sheet"],
		tag: "form",
		form: {
			closeOnSubmit: false,
			submitOnChange: true
		},
		window: {
			resizable: true
		},
		actions: {
			choosePortrait: o13ItemSheet.choosePortrait,
			createNewPerk : o13ItemSheet.createNewPerk,
			removePerk : o13ItemSheet.removePerk,
			openPerk : o13ItemSheet.openPerk,
			createNewGear : o13ItemSheet.createNewGear,
			removeGear : o13ItemSheet.removeGear,
			openGear : o13ItemSheet.openGear
		}
	});

	async _processSubmitData(event, form, formData) {
        if (this.item.hasParentAchetype && !this.item.parent) {
			await this.item.update(formData);
			
            return;
        }
		
		return super._processSubmitData(event, form, formData);
    }

	_configureRenderParts(options) {
		return {
			main: {
				template: `systems/13omens/templates/items/${this.item.type}.hbs`
			}
		};
	}
	
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		context.item = this.item;
		
		context.editable = true;

        context.enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            this.item.system.description ?? "",
            {
                secrets: this.item.isOwner,
                async: true,
                relativeTo: this.item
            }
        );
		
		return context;
	}
	
	async _onDrop(event) {
		event.preventDefault();
		
		const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
		
		if (!data) return;
		
		const object = await fromUuid(data.uuid);
		
		const dropZone = event.target.closest("[drop-zone]");
		
		if (dropZone) {
			if (this.item.type == "archetype") {
				if (data.parentArchetype == this.item.uuid) {
					switch(dropZone.getAttribute("drop-zone")) {
						case "guaranteedGear":
							return this.item.markAsGuaranteedGear(data.gearID);
							break;
						case "selectableGear":
							return this.item.removeFromGuaranteedGear(data.gearID);
							break;
					}
				}
			}
		}
		else {
			//Default sheet drop
			if (!object) return;

			if (this.item.type == "archetype") {
				if(data.type == "Item") {
					this.item.addSubItem(object);
				}
			}
		}
	}
	
	_onDragStart(event) {
		const element = event.currentTarget;

		if (this.item.type == "archetype") {
			if (element.hasAttribute("gear-id")) {
				const dragData = {
					parentArchetype : this.item.uuid,
					gearID : element.getAttribute("gear-id")
				};
				
				event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
				
				return;
			}
		}
	}
	
	static async choosePortrait(event, target) {
		const picker = new foundry.applications.apps.FilePicker.implementation({
			type: "image",
			current: this.item.img,
			callback: async (path) => {
				await this.item.update({img : path})
			}
		}).render(true);
	}
	
	static async createNewPerk(event, target) {
		if (this.item.type == "archetype") {
			this.item.createNewPerk();
		}
	}
	
	static async removePerk(event, target) {
		if (this.item.type == "archetype") {
			const perkID = target.getAttribute("perk-id");

			if (perkID) {
				this.item.removeSubItem(perkID);
			}
		}
	}
	
	static async openPerk(event, target) {
		if (this.item.type == "archetype") {
			const perkID = target.getAttribute("perk-id");
			
			if (perkID) {
				const perk = await this.item.getPerkItem(perkID);
				
				if (perk) {
					perk.sheet.render(true);
				}
			}
		}
	}
	
	static async createNewGear(event, target) {
		if (this.item.type == "archetype") {
			this.item.createNewGear();
		}
	}
	
	static async removeGear(event, target) {
		if (this.item.type == "archetype") {
			const gearID = target.getAttribute("gear-id");

			if (gearID) {
				this.item.removeSubItem(gearID);
			}
		}
	}
	
	static async openGear(event, target) {
		if (this.item.type == "archetype") {
			const gearID = target.getAttribute("gear-id");
			
			if (gearID) {
				if (event.shiftKey) return this.item.toggleGuaranteedGear(gearID)
				else {
					const gear = await this.item.getGearItem(gearID);
					
					if (gear) {
						gear.sheet.render(true);
					}
				}
			}
		}
	}
}

class archetypeDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			description: new HTMLField({ required: true, initial: ""}),
			
			perks: new ObjectField({}),
			
			gear: new ObjectField({}),
			
			guaranteedgear: new ObjectField({}), //only refer to id
			
			selectablegearcount: new NumberField({ required: true, integer: true, nullable: false, min: 1, initial: 4 })
		};
	}
	
	prepareDerivedData() {
		return {
			
		}
	}
}

class perkDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			description: new HTMLField({ required: true, initial: ""}),
			
			usesper:  new SchemaField({
				filled : new StringField({ required: true, nullable: true, initial: "passive", choices: ["passive", "act", "story"]}),
				max : new NumberField({ required: true, integer: true, nullable: true, min: 1, initial: null }),
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

class gearDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			description: new HTMLField({ required: true, initial: ""}),
			
			quantity: new SchemaField({
				max : new NumberField({ required: true, integer: true, nullable: true, min: 0, initial: 1 }),
				value : new NumberField({ required: true, integer: true, nullable: true, min: 0, initial: null })
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

export const itemDMs = {archetype : archetypeDataModel, perk : perkDataModel, gear : gearDataModel}