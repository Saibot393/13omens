import {utils} from "../utils.js";

import {o13quantityQuery} from "../dialogues/quantityQuery.js";

export function inventoryActorMixin(base) {
	return class inventoryActor extends base {
		get isInventoryActor() {
			return true;
		}
		
		async removeGear(id) {
			let gear = this.items.get(id);
			
			if (gear?.isGear) {
				return this.deleteEmbeddedDocuments("Item", [id]);
			}
		}
		
		get gear() {
			let gear = this.items.filter(item => item.isGear).sort((a,b) => a.sort - b.sort);
			
			return Object.fromEntries(gear.map(item => [item.id, item]));
		}
		
		async createNewGear(data) {
			const gear = {name : game.i18n.localize("13omens.titles.gear"), ...data, type : "gear"};
			
			return this.createEmbeddedDocuments("Item", [gear]);
		}
		
		async geartoChatMessage(id, messageData = {}) {
			const gear = this.items.get(id);
			
			if (gear?.isGear) {
				gear.toChatMessage(messageData);
			}
		}
		
		async transferGear(gear, quantity = undefined) {
			if (gear.parent?.isInventoryActor && gear.parent != this) {
				await inventoryActor.startGearTransfer(gear.parent, this, gear, {quantity : quantity});
			}
			return false;
		}
		
		//drag n drop
		async handleDrop(data, event, prepared) {
			let handled = false;
			
			const object = prepared.object;
			if (!object || prepared.selfOrigin) return handled;
			
			if (object.isGear) {
				if (object.parent?.isInventoryActor) {
					await this.transferGear(object, event.shiftKey ? Infinity : undefined);
				}
				else {
					await this.createEmbeddedDocuments("Item", [object.toObject()]);
				}
				handled = true;
			}
			
			return handled;
		}
		
		prepareDragData(data, event) {
			if (data.gearID) {
				const item = this.items.get(data.gearID);
				
				if (item.isGear) {
					data.type = "Item",
					data.uuid = item.uuid;
				}
			}
		}
		
		//transfer
		static async startGearTransfer(sourceActor, targetActor, transferGear, options = {quantity : undefined}) {
			if (transferGear.parent == sourceActor && transferGear.isGear && sourceActor.isInventoryActor && targetActor.isInventoryActor) {
				if (options.quantity == undefined) {
					if (transferGear.quantityMax == 1) {
						options.quantity = 1;
					}
					else {
						options.quantity = await new o13quantityQuery({
							max : transferGear.quantityValue, 
							query : game.i18n.format("13omens.dialogues.transferGearQuery", {gear : transferGear.name, sourceActor : sourceActor.name, targetActor : targetActor.name})
						}).wait(true);
					}
				}

				if (!(options.quantity >= 0)) return;
				
				if (!(await inventoryActor.handleGearTransfer(sourceActor, targetActor, transferGear, options))) {
					if (utils.primeGM()) {
						game.system.callSocket("handleGearTransfer", [sourceActor, targetActor, transferGear, options], {onlyPrimeGM : true});
					}
					else {
						ui.notifications.warn(game.i18n.localize("13omens.warnings.actionRequiresGM"), {console : false});
					}
				}
			}
		}
		
		static async handleGearTransfer(sourceActor, targetActor, transferGear, options = {quantity : 0}) {
			if (sourceActor.isOwner && targetActor.isOwner && transferGear.parent == sourceActor && transferGear.isGear && sourceActor.isInventoryActor && targetActor.isInventoryActor) {
				const quantity = Math.min(transferGear.quantityValue, options.quantity);
				
				await transferGear.changeQuantity(-quantity);
				
				const transferObject = transferGear.toObject();
				transferObject.system.quantity.value = quantity;
				
				await targetActor.createNewGear(transferObject);
				
				return true;
			}
			return false;
		}
	}
}

export class inventoryActor extends inventoryActorMixin(class {}) {} //for statics