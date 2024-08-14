import {
    Client,
    EmbedBuilder,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const commands = [
    new SlashCommandBuilder()
        .setName("info")
        .setDescription("Info about Fivem player")
        .addStringOption((option) =>
            option
                .setName("query")
                .setDescription("Player name/discord/steam")
                .setRequired(true)
        )
        .setDefaultMemberPermissions("0"),
    new SlashCommandBuilder()
        .setName("info2")
        .setDescription("Advance info about Fivem player")
        .addStringOption((option) =>
            option
                .setName("query")
                .setDescription("Player name/discord/steam")
                .setRequired(true)
        )
        .setDefaultMemberPermissions("0"),
];

const rest = new REST({ version: "10" }).setToken("");

try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands('1200914828022268025', '1216422989650984960'), { body: commands });

    console.log("Successfully reloaded application (/) commands.");
} catch (error) {
    console.error(error);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

/**
 * Execute an API request to a specified endpoint with query parameters and return the JSON response.
 *
 * @param {string} endpoint The API endpoint to request.
 * @param {Object} params Query parameters for the request.
 * @returns {Promise<any>} The JSON response from the API.
 */
async function apiRequest(endpoint, params) {
    const baseUrl = "https://api.chub.pl/fivem/players";
    const searchParams = new URLSearchParams(params);
    const url = `${baseUrl}/${endpoint}?${searchParams}`;

    const response = await fetch(url, {
        method: "GET",
        headers: { Authorization: `` },
    });

    return response.json();
}

/**
 * Retrieve basic player information and the first player's server details.
 *
 * @param {string} query Search query to find the player.
 * @returns {Promise<Object|null>} Basic player info along with server details, or null if not found.
 */
async function getPlayerInfo(query) {
    const players = await apiRequest("search", { query });
    if (!players || players.length === 0) return null;

    const servers = await apiRequest(`${players[0].id}/servers`, {});
    console.log(JSON.stringify(players[0]))
    return { ...players[0], servers };
}

/**
 * Retrieve advanced player information based on a search query.
 *
 * @param {string} query Search query to find the player.
 * @returns {Promise<Object>} Advanced player information.
 */
async function getPlayerAdvanceInfo(query) {
    const info = await apiRequest("advance", { query });

    if (info.identifiers) {
        info.identifiers = info.identifiers.map(identifier => {
            return identifier.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '***.***.***.***');
        });
    }

    return info;
}

client.on("interactionCreate", async (interaction) => {
    try {
    if (!interaction.isChatInputCommand() || !["info", "info2"].includes(interaction.commandName)) return;


        const info = await (interaction.commandName === "info" ? getPlayerInfo : getPlayerAdvanceInfo)(interaction.options.getString("query"));
        if (!info) return interaction.reply({ content: "Nie znaleziono gracza.", ephemeral: true });

        const embed = new EmbedBuilder()
            .setTimestamp()
            .setFooter({ text: "©️ CreativeHub hosted by Trujca.gg" });

        if (interaction.commandName === "info" && info.id && info.name) {
            embed.setTitle(`[${info.id}] ${info.name}`);
            ['steam', 'license', 'discord'].forEach(key => {
                if (info[key]) embed.addFields({ name: key.charAt(0).toUpperCase() + key.slice(1), value: info[key], inline: true });
            });
        } else if (interaction.commandName === "info2") {
            ['names', 'identifiers'].forEach(key => {
                if (info[key]?.length) embed.addFields({ name: key.charAt(0).toUpperCase() + key.slice(1), value: info[key].join('\n'), inline: false });
            });
        }

        const elements = (info.servers || info.activities)?.sort((a, b) => b.last_seen.localeCompare(a.last_seen)).slice(0, 20) || [];
        elements.forEach(({ hostname, last_seen }) => embed.addFields({
            name: `Nazwa serwera: ${hostname.replaceAll(/\^\d/g, "")}`,
            value: `Ostatni connect: ${new Date(last_seen).toLocaleString("pl-PL")}`,
            inline: false
        }));

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error("Error handling interaction:", error);
        await interaction.reply({ content: "Wystąpił błąd.", ephemeral: true });
    }
});



client.login("");




