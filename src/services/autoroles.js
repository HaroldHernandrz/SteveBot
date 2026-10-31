const fs = require("fs");
const path = require("path");
const {
    ChannelType,
    EmbedBuilder,
    Events,
    PermissionFlagsBits,
    SlashCommandBuilder,
    parseEmoji,
} = require("discord.js");
const logger = require("../utils/logger");

const DATA_DIR = path.join(process.cwd(), "data");
const CONFIG_FILE = path.join(DATA_DIR, "autoroles.json");
const MAX_ROLE_MAPPINGS = 20;
const UNICODE_EMOJI_PATTERN =
    /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Regional_Indicator}]|^[#*0-9]\uFE0F?\u20E3$/u;
let panelsCache;
const roleOperationLocks = new Map();

const command = new SlashCommandBuilder()
    .setName("autoroles")
    .setDescription("Publica un panel para que los miembros elijan sus roles")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
        option
            .setName("canal")
            .setDescription("Canal donde se publicará el panel")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("titulo")
            .setDescription("Título del panel de autoroles")
            .setMaxLength(256)
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("asociaciones")
            .setDescription("Una asociación por línea: emoji = @rol o ID del rol")
            .setMaxLength(1000)
            .setRequired(true)
    )
    .addStringOption((option) =>
        option
            .setName("texto")
            .setDescription("Texto explicativo que aparecerá debajo de los roles")
            .setMaxLength(3500)
            .setRequired(false)
    );

function readPanels() {
    if (panelsCache) {
        return panelsCache;
    }

    if (!fs.existsSync(CONFIG_FILE)) {
        panelsCache = [];
        return panelsCache;
    }

    panelsCache = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    return panelsCache;
}

function savePanels(panels) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(panels, null, 2));
    panelsCache = panels;
}

function parseMappings(input, guild) {
    const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

    if (lines.length === 0 || lines.length > MAX_ROLE_MAPPINGS) {
        throw new Error(`Debes indicar entre 1 y ${MAX_ROLE_MAPPINGS} asociaciones.`);
    }

    const seenEmojis = new Set();
    return lines.map((line, index) => {
        const separator = line.indexOf("=");
        if (separator <= 0 || separator === line.length - 1) {
            throw new Error(`Formato inválido en la línea ${index + 1}. Usa: emoji = @rol`);
        }

        const emojiInput = line.slice(0, separator).trim();
        let roleInput = line.slice(separator + 1).trim();
        const emoji = parseEmoji(emojiInput);

        if (
            !emoji?.name ||
            (emoji.id && !/^<a?:[\w~]+:\d{17,20}>$/.test(emojiInput)) ||
            (!emoji.id && !UNICODE_EMOJI_PATTERN.test(emojiInput))
        ) {
            throw new Error(`Emoji inválido en la línea ${index + 1}: ${emojiInput}`);
        }

        const emojiKey = emoji.id ? `custom:${emoji.id}` : `unicode:${emoji.name}`;
        if (seenEmojis.has(emojiKey)) {
            throw new Error(`El emoji ${emojiInput} está repetido.`);
        }
        seenEmojis.add(emojiKey);

        const roleMention = roleInput.match(/^<@&(\d+)>$/);
        if (roleMention) {
            roleInput = roleMention[1];
        } else if (roleInput.startsWith("@")) {
            roleInput = roleInput.slice(1).trim();
        }

        const role = /^\d{17,20}$/.test(roleInput)
            ? guild.roles.cache.get(roleInput)
            : guild.roles.cache.find((candidate) => candidate.name === roleInput);

        if (!role) {
            throw new Error(`No encontré el rol "${roleInput}" en este servidor.`);
        }
        if (role.id === guild.id || role.managed) {
            throw new Error(`El rol "${role.name}" no se puede asignar manualmente.`);
        }

        return {
            emoji: emojiInput,
            emojiKey,
            roleId: role.id,
            roleName: role.name,
        };
    });
}

async function validateBotPermissions(interaction, channel, mappings) {
    const botMember = await interaction.guild.members.fetchMe();
    const channelPermissions = channel.permissionsFor(botMember);
    const requiredChannelPermissions = [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AddReactions,
        PermissionFlagsBits.ReadMessageHistory,
    ];

    if (!channelPermissions?.has(requiredChannelPermissions)) {
        throw new Error("No tengo permisos para publicar el embed y añadir reacciones en ese canal.");
    }
    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
        throw new Error("Necesito el permiso Administrar roles para asignar los autoroles.");
    }

    for (const mapping of mappings) {
        const role = interaction.guild.roles.cache.get(mapping.roleId);
        if (!role || role.position >= botMember.roles.highest.position) {
            throw new Error(`Mi rol más alto debe estar por encima de @${mapping.roleName}.`);
        }
    }
}

async function publishPanel(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("canal", true);
    const title = interaction.options.getString("titulo", true).trim();
    const mappings = parseMappings(interaction.options.getString("asociaciones", true), interaction.guild);
    const text = interaction.options.getString("texto")?.trim();

    if (!title) {
        throw new Error("El título no puede estar vacío.");
    }

    await validateBotPermissions(interaction, channel, mappings);

    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(title)
        .setDescription(
            [
                mappings.map(({ emoji, roleId }) => `${emoji}  <@&${roleId}>`).join("\n"),
                text,
            ].filter(Boolean).join("\n\n")
        )
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setFooter({ text: "Elige un solo rol. Quita tu reacción para perderlo." });

    const message = await channel.send({ embeds: [embed] });

    try {
        for (const mapping of mappings) {
            await message.react(mapping.emoji);
        }

        const panels = readPanels();
        panels.push({
            guildId: interaction.guildId,
            channelId: channel.id,
            messageId: message.id,
            mappings,
        });
        savePanels(panels);
    } catch (error) {
        try {
            await message.delete();
        } catch (deleteError) {
            logger.error(`No se pudo limpiar el panel incompleto ${message.id}: ${deleteError.message}`);
        }
        throw error;
    }

    await interaction.editReply(`Panel de autoroles publicado en ${channel}.`);
    logger.success(`Panel de autoroles publicado en ${channel.id} (${message.id})`);
}

function reactionKey(reaction) {
    return reaction.emoji.id
        ? `custom:${reaction.emoji.id}`
        : `unicode:${reaction.emoji.name}`;
}

function findConflictingRole(member, panel, selectedRoleId) {
    return panel.mappings.find(({ roleId }) =>
        roleId !== selectedRoleId && member.roles.cache.has(roleId)
    );
}

async function handleReaction(reaction, user, addRole) {
    if (user.bot) {
        return;
    }

    if (reaction.partial) {
        await reaction.fetch();
    }

    const panels = readPanels();
    const panel = panels.find((entry) => entry.messageId === reaction.message.id);
    if (!panel) {
        return;
    }

    const mapping = panel.mappings.find((entry) => entry.emojiKey === reactionKey(reaction));
    if (!mapping) {
        return;
    }

    const guild = reaction.message.guild;
    const role = guild?.roles.cache.get(mapping.roleId);
    if (!guild || !role) {
        logger.warn(`No se encontró el servidor o rol ${mapping.roleId} del panel ${panel.messageId}`);
        return;
    }

    const operationKey = `${guild.id}:${user.id}`;
    const previousOperation = roleOperationLocks.get(operationKey) || Promise.resolve();
    const operation = previousOperation.catch(() => {}).then(async () => {
        const member = await guild.members.fetch(user.id);

        if (addRole) {
            const conflictingRole = findConflictingRole(member, panel, role.id);
            if (conflictingRole) {
                try {
                    await user.send(
                        `Solo puedes tener un rol de este panel. Ya tienes **${conflictingRole.roleName}**, así que no te asigné **${role.name}**. Para elegir otro, quita primero la reacción de tu rol actual.`
                    );
                } catch (error) {
                    logger.warn(`No se pudo avisar por mensaje directo a ${user.tag}: ${error.message}`);
                }
                logger.info(`Rol ${role.name} rechazado para ${user.tag}; ya tiene ${conflictingRole.roleName}`);
                return;
            }

            await member.roles.add(role, "Autorol elegido mediante reacción");
            logger.info(`Rol ${role.name} asignado a ${user.tag}`);
        } else {
            await member.roles.remove(role, "Autorol retirado al quitar la reacción");
            logger.info(`Rol ${role.name} retirado a ${user.tag}`);
        }
    });

    roleOperationLocks.set(operationKey, operation);
    try {
        await operation;
    } finally {
        if (roleOperationLocks.get(operationKey) === operation) {
            roleOperationLocks.delete(operationKey);
        }
    }
}

async function registerCommand(client) {
    const commandData = command.toJSON();

    for (const guild of client.guilds.cache.values()) {
        const commands = await guild.commands.fetch();
        const existing = commands.find((entry) => entry.name === commandData.name);

        if (existing) {
            await existing.edit(commandData);
        } else {
            await guild.commands.create(commandData);
        }
        logger.info(`Comando /autoroles registrado en ${guild.name}`);
    }
}

function registerEvents(client) {
    client.on(Events.InteractionCreate, (interaction) => {
        if (!interaction.isChatInputCommand() || interaction.commandName !== "autoroles") {
            return;
        }

        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            interaction.reply({ content: "Solo los administradores pueden usar este comando.", ephemeral: true })
                .catch((error) => logger.error(`No se pudo responder al comando /autoroles: ${error.message}`));
            return;
        }

        publishPanel(interaction).catch(async (error) => {
            logger.error(`Error en /autoroles: ${error.message}`);
            const response = { content: `No pude crear el panel: ${error.message}`, ephemeral: true };
            try {
                if (interaction.deferred && !interaction.replied) {
                    await interaction.editReply(response.content);
                } else if (interaction.replied) {
                    await interaction.followUp(response);
                } else {
                    await interaction.reply(response);
                }
            } catch (replyError) {
                logger.error(`No se pudo responder al comando /autoroles: ${replyError.message}`);
            }
        });
    });

    client.on(Events.MessageReactionAdd, (reaction, user) => {
        handleReaction(reaction, user, true)
            .catch((error) => logger.error(`Error asignando autorol: ${error.message}`));
    });

    client.on(Events.MessageReactionRemove, (reaction, user) => {
        handleReaction(reaction, user, false)
            .catch((error) => logger.error(`Error retirando autorol: ${error.message}`));
    });
}

module.exports = {
    command,
    findConflictingRole,
    parseMappings,
    registerCommand,
    registerEvents,
};
