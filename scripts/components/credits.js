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
    data.content = data.content || {};
    data.content.blocks = data.content?.blocks || creditBlocksfromStory(data.story);
    data.content.title = data.content?.title || data.story?.name;
    data.duration = data.duration || data.story?.creditDuration || 30;

    console.log(data.content);

    if (!data.content.blocks) return false;

    if (!data.skipSocketCall) game.system.callSocket("showCredits", {...data, skipSocketCall : true});

    const duration = (data.duration);

    const content = await foundry.applications.handlebars.renderTemplate("systems/13omens/templates/overlay/credits.hbs", data.content);

    document.querySelector(".o13-credits")?.remove();

    const template = document.createElement("template");
    template.innerHTML = content;
    const credits = template.content.firstChild;

    credits.style.setProperty("--credits-duration", `${duration}s`);

    credits.querySelector(".o13-credit-close-button")?.addEventListener("click", () => {credits.remove();})

    document.body.appendChild(credits);

    credits.addEventListener("animationend", (event) => {
        console.log(credits);
        console.log(event);
        if (event.target === credits && event.animationName == "creditsScreenFadeOut") {
            credits.remove();
        }
    });

    return credits;
}