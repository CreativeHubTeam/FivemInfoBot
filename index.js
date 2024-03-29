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

const TOKEN = process.env.TOKEN_BOT;
const CLIENT_ID = process.env.CLIENT_ID_BOT;

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
];

const rest = new REST({ version: "10" }).setToken(TOKEN);

try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });

    console.log("Successfully reloaded application (/) commands.");
} catch (error) {
    console.error(error);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

async function getPlayerInfo(query) {
    const searchUrl =
        "https://api.chub.pl/fivem/players/search?" +
        new URLSearchParams({ query: query });

    const res = await fetch(searchUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${process.env.TOKEN}` },
    });

    const players = await res.json();

    if (!players || players.length <= 0) return null;

    const res2 = await fetch(
        `https://api.chub.pl/fivem/players/${players[0].id}/servers`,
        {
            method: "GET",
            headers: { Authorization: `Bearer ${process.env.TOKEN}` },
        }
    );

    return { ...players[0], servers: await res2.json() };
}

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "info") {
        const info = await getPlayerInfo(
            interaction.options.getString("query")
        );

        if (!info) return interaction.reply("Nie znaleziono gracza.");

        info.servers.sort(
            (a, b) => new Date(b.last_seen) - new Date(a.last_seen)
        );

        const formattedServers = info.servers.map((server) => {
            const date = new Date(server.last_seen);
            const fd = date.toLocaleString("pl-PL", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });

            return {
                name: `Nazwa serwera: ${server.hostname.replaceAll(
                    /\^\d/g,
                    ""
                )}`,
                value: `Ostatni connect: ${fd}`,
            };
        });

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`[${info.id}] ${info.name}`)
                    .addFields([
                        {
                            name: "Identifiers",
                            value: `${info.discord}\n${info.steam}\n${info.license}`,
                        },
                        ...formattedServers,
                    ])
                    .setFooter({ text: "©️ CreativeHub hosted by Trujca.gg" })
                    .setTimestamp(),
            ],
        });
    }
});

client.login(TOKEN);
