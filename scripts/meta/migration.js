//currently not in use as migrations have not be necessary

export function initMigration() {
	game.settings.register("13omens", "migratedSystemVersion", {
		name : "",
		scope : "world",
		config : false,
		type : String,
		default : "0.0.0"
	});
		
	Hooks.once("ready", async() => {
		await MigrationManager.testForMigration();
	})
}

class MigrationManager {
	static async testForMigration() {
		if (game.user.activeGM != game.user) return;
		
		const lastMigration = game.settings.get("13omens", "migratedSystemVersion");
		
		const currentVersion = game.system.version;
		
		if (foundry.utils.isNewerVersion(currentVersion, lastMigration)) {
			try {
				const runningInfo = ui.notifications.info(`Starting system migration from v${lastMigration} to v${currentVersion}, please do not close Foundry`, { permanent: true });
				const progressInfo = ui.notifications.info(``, { permanent: true });
				
				await MigrationManager.startMigration(lastMigration, currentVersion, progressInfo);
				
				ui.notifications.remove(progressInfo);
				ui.notifications.remove(runningInfo);
				ui.notifications.info(`Finished system migration`)
				
				await game.settings.set("13omens", "migratedSystemVersion", currentVersion);
			} catch(error) {
				console.error(`13omens | System migration from v${lastMigration} to v${currentVersion} failed:`, error);
				ui.notifications.error(`System migration failed. See console for details`, { permanent: true });
			}
		}
	}
	
	static async startMigration(lastVersion, currentVersion, progressInfo) {
		const setProgress = (step, percent) => {
			ui.notifications.update(progressInfo, {message : `Migrating ${step} , progress: ${percent}%`})
		}
	}
}