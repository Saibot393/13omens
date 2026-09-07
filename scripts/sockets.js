import {showBanner} from "./components/banner.js";
import {o13rollConfig} from "./roll.js";

const ACTIONS = {
	showBanner,
	updateRemoteRollConfig : o13rollConfig.updateRemote
}

export function callSocket(action, data, recipients = {onlyPrimeGM : false}) {
	if (!Object.keys(ACTIONS).includes(action)) {
		console.error(`13 Omens Socket action "${action}" is unknown and will be skipped. Called with data:`, data);
		return false;
	}
	else {
		const payload = Array.isArray(data) ? data : [data];
		game.socket.emit("system.13omens", {
			action : action,
			userid : game.user.id,
			actiondata : payload,
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
			const matchingPrimeGM = !data.recipients?.onlyPrimeGM || [...game.users].find(user => user.isGM) == game.user;
			
			if (notSender && matchingPrimeGM) {
				const action = ACTIONS[data.action];
				
				if (typeof action == "function") {
					action(...data.actiondata);
				}
			}
		});
	});
	
	game.system.callSocket = callSocket;
}