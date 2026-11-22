import {utils} from '../utils.js';

function creditBlocksfromStory(story) {
    const blocks = [];

    if (!story) return blocks;

    const creditData = story.creditData;

    if (creditData?.writers) {
        blocks.push({
            title : game.i18n.localize('13omens.credits.writtenBy'),
            entries : []
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
            title : game.i18n.localize('13omens.credits.contentBy'),
            entries : creditData.artists.map(artist => (artist.includes("-") ? {name : artist.split("-")[0], title : artist.split("-")[1]} : artist))
        });
    }

    if (creditData?.thanks)
    blocks.push({
        title : game.i18n.localize('13omens.credits.thanksTo'),
        entries : creditData.thanks.map(thank => (thank.includes("-") ? {name : thank.split("-")[0], title : thank.split("-")[1]} : thank))
    });

    return blocks;
}

export async function showCredits(data = {content : {title : ""}, story : undefined, duration : null}) {
    data.content = data.content || {};
    data.content.blocks = data.content?.blocks || creditBlocksfromStory(data.story);
    data.content.title = data.content?.title || data.story?.name;

    if (!data.content.blocks) return false;

    if (!data.skipSocketCall) game.system.callSocket("showCredits", {...data, skipSocketCall : true});

    const duration = (data.duration ?? 20);

    const content = await foundry.applications.handlebars.renderTemplate("systems/13omens/templates/overlay/credits.hbs", data.content);

    document.querySelector(".o13-credits")?.remove();

    const template = document.createElement("template");
    template.innerHTML = content;
    const credits = template.content.firstChild;

    credits.style.setProperty("--credits-duration", `${duration}s`);

    document.body.appendChild(credits);

    credits.addEventListener("animationend", (event) => {
        if (event.target === credits && event.animationName == "creditScreenFadeOut") {
            credits.remove();
        }
    });

    return credits;
}