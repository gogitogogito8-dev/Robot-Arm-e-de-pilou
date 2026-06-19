const express = require('express');
const app = express();

app.get('/', (req, res) => res.send('Bot is alive'));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log('Keep alive server running');
});

const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Events
} = require('discord.js');

const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// 🔧 CONFIG
const TOKEN = process.env.TOKEN;
const CLIENT_ID = '1517631063894003942';
const VERIFIED_ROLE_ID = '1517635726018347130';
const GUILD_ID = '1517144087508287589';

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// 📌 READY
client.once('ready', async () => {
    console.log(`Connecté en tant que ${client.user.tag}`);

    try {
        const channel = await client.channels.fetch('1517649783051784283');

        if (channel) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_button')
                    .setLabel('Se vérifier')
                    .setStyle(ButtonStyle.Success)
            );

            await channel.send({
                content: "🔐 Clique sur le bouton pour être vérifié !",
                components: [row]
            });
        }
    } catch (err) {
        console.error("Erreur envoi bouton:", err);
    }
});

// 📌 INTERACTIONS
client.on(Events.InteractionCreate, async interaction => {

    // 🔘 BOUTON VERIFY
    if (interaction.isButton()) {

        if (interaction.customId === 'verify_button') {

            const role = interaction.guild.roles.cache.get(VERIFIED_ROLE_ID);

            if (!role) {
                return interaction.reply({ content: "❌ Rôle introuvable", ephemeral: true });
            }

            try {
                await interaction.member.roles.add(role);
                return interaction.reply({ content: "✅ Tu es vérifié !", ephemeral: true });
            } catch (err) {
                console.error(err);
                return interaction.reply({ content: "❌ Erreur permissions", ephemeral: true });
            }
        }
    }

    // 🤖 SLASH COMMANDS
    if (interaction.isChatInputCommand()) {

        // VERIFY
        if (interaction.commandName === 'verify') {
            return interaction.reply({ content: "Utilise le bouton 👍", ephemeral: true });
        }

        // ASK (IA)
        if (interaction.commandName === 'ask') {

            const question = interaction.options.getString('question');

            await interaction.reply("🤖 Je réfléchis...");

            try {
                const response = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "Tu es un assistant utile et clair."
                        },
                        {
                            role: "user",
                            content: question
                        }
                    ]
                });

                let answer = response.choices[0].message.content;

                if (answer.length > 1900) {
                    answer = answer.slice(0, 1900) + "...";
                }

                return interaction.editReply(answer);

            } catch (err) {
                console.error("OPENAI ERROR:", err);
                return interaction.editReply("❌ Erreur IA");
            }
        }
    }
});

// 📌 Slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Se faire vérifier')
        .toJSON(),

    new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Poser une question à l’IA')
        .addStringOption(option =>
            option.setName('question')
                .setDescription('Ta question')
                .setRequired(true)
        )
        .toJSON()
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log("🔄 Enregistrement des commandes...");

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log("✅ Commandes enregistrées");
    } catch (err) {
        console.error("❌ Erreur commandes :", err);
    }
})();

client.login(TOKEN);