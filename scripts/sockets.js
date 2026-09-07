import {utils} from "./utils.js";

import {showBanner} from "./components/banner.js";
import {o13rollConfig} from "./roll.js";
import {inventoryActor} from "./actors/inventoryActor.js";

const ACTIONS = {
	showBanner,
	updateRemoteRollConfig : o13rollConfig.updateRemote,
	handleGearTransfer : inventoryActor.handleGearTransfer
}

export function callSocket(action, data, recipients = {onlyPrimeGM : false}) {
	if (!Object.keys(ACTIONS).includes(action)) {
		console.error(`13 Omens Socket action "${action}" is unknown and will be skipped. Called with data:`, data);
		return false;
	}
	else {
		const payload = Array.isArray(data) ? data : [data];
		for (const i in payload) {
			if (payload[i] instanceof foundry.abstract.Document && typeof payload[i].uuid == "string") {
				payload[i] = {
					__documentUuid : payload[i].uuid
				}
			}
		}
		
		game.socket.emit("system.13omens", {
			action : action,
			userid : game.user.id,
			payload : payload,
			recipients : recipients
		})
		if (CONFIG.debug.o13?.sockets) console.warn(`13 Omens socket call sent:`, action, data);
		return true;
	}
}

export function onO13Sockets() {
	Hooks.once("ready", () => {
		console.log("13OMENS SOCKETS ON");
		game.socket.on("system.13omens", data => {
			if (CONFIG.debug.o13?.sockets) console.warn(`13 Omens socket call received:`, data);
			
			const notSender = game.user.id != data.userid;
			const matchingPrimeGM = !data.recipients?.onlyPrimeGM || utils.primeGM() == game.user;

			if (notSender && matchingPrimeGM) {
				const action = ACTIONS[data.action];

				if (typeof action == "function") {
					const payload = data.payload
					
					for (const i in payload) {
						if (typeof payload[i].__documentUuid == "string") {
							const uuidDocument = fromUuidSync(payload[i].__documentUuid);
							
							if (uuidDocument) payload[i] = uuidDocument;
						}
					}
					
					action(...payload);
				}
			}
		});
	});
	
	game.system.callSocket = callSocket;
}