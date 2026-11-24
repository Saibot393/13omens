import {utils} from '../utils.js';

function creditBlocksfromStory(story) {
    const blocks = [];

    const entryLayout = function (entries) {
        return entries.map(entry => (entry.includes("-") ? {name : entry.split("-")[0], title : entry.split("-")[1]} : entry))
    }

    if (!story) return blocks;

    const creditData = story.creditData;

    if (creditData?.writers) {
        blocks.push({
            title : game.i18n.localize('13omens.credits.writers'),
            entries : entryLayout(creditData.writers)
        });
    }

    blocks.push({
        title : game.i18n.localize('13omens.credits.hostedBy'),
        entries : game.users.filter(user => user.isGM).map(user => user.name)
    });


    blocks.push({
        title : game.i18n.localize('13omens.credits.starring'),
        entries : game.users.filter(user => user.isGM).map(user => ({name : user.name, title : game.i18n.localize('13omens.credits.host')})).concat(
            story.pcActors.map(pc => ({name : pc.primePlayer?.name || "???", title : pc.name + (pc.archetype ? `, ${pc.archetype.name}`: "")}))
        )
    });

    if (creditData?.artists) {
        blocks.push({
            title : game.i18n.localize('13omens.credits.artists'),
            entries : entryLayout(creditData.artists)
        });
    }

    if (creditData?.thanks)
    blocks.push({
        title : game.i18n.localize('13omens.credits.thanks'),
        entries : entryLayout(creditData.thanks)
    });

    return blocks;
}

export async function showCredits(data = {content : {title : ""}, story : undefined, duration : null}) {
    //prep
    data.content = data.content || {};
    data.content.blocks = data.content?.blocks || creditBlocksfromStory(data.story);
    data.content.title = data.content?.title || data.story?.name;
    data.duration = data.duration || data.story?.creditDuration || 30;
    data.music = data.music || data.story?.creditsMusic || "";

    if (!data.content.blocks) return false;

    //call
    if (!data.skipSocketCall) game.system.callSocket("showCredits", {...data, skipSocketCall : true});

    //create
    const duration = (data.duration);

    const content = await foundry.applications.handlebars.renderTemplate("systems/13omens/templates/overlay/credits.hbs", data.content);

    document.querySelector(".o13-credits")?.remove();

    const template = document.createElement("template");
    template.innerHTML = content;
    const credits = template.content.firstChild;

    credits.style.setProperty("--credits-duration", `${duration}s`);

    credits.querySelector(".o13-credit-close-button")?.addEventListener("click", () => {credits.remove();});

    //music
    if (data.music) {
        try {
            const music = await game.audio.play(data.music, {loop : false});

            credits.addEventListener("creditsClosed", () => {music.stop()})
        }
        catch (error) {
            console.error("Failed to play credits music:", error);
        }
    }

    //connect
    const observer = new MutationObserver(() => {
        if (!credits.isConnected) {
            console.info("Credits were closed");

            credits.dispatchEvent(new CustomEvent("creditsClosed"));

            observer.disconnect();
        }
    })

    document.body.appendChild(credits);

    observer.observe(credits.parentNode, {childList: true});

    credits.addEventListener("animationend", (event) => {
        if (event.target === credits && event.animationName == "creditsScreenFadeOut") {
            credits.remove();
        }
    });

    return credits;
}