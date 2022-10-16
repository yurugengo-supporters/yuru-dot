require('dotenv').config();
//discord.js
const { Client, GatewayIntentBits, Partials, InteractionType } = require("discord.js");
const { ApplicationCommandOptionType, ModalBuilder, TextInputBuilder, ActionRowBuilder, TextInputStyle} = require("discord.js");
//const { SelectMenuBuilder, SelectMenuOptionBuilder} = require("discord.js");
const { DiscordAPIError } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds], partials: [Partials.Channel] });
//viz
const Viz = require('viz.js');
const { Module, render } = require('viz.js/full.render.js');
//sharp
const sharp = require("sharp");
//fs
const fs = require('fs');

async function set_command(guild) {
	const commands=[
		{
			name: "dot2img",
			description: "dot言語で有向グラフや無向グラフを描画",
			options:[
				{
					type:ApplicationCommandOptionType.String,
					name:"template",
					description:"テンプレート",
					required:false,
					choices:[
						{name:"有向グラフ", value:"digraph"},
						{name:"無向グラフ", value:"graph"},
					]
				}
			],
		},
		{
			name: "help",
			description: "ヘルプ",
		},
	];
	console.log("コマンドを登録しました:" + guild.id + "(" + guild.name + ")" );
	await client.application.commands.set(commands, guild.id);
}

function _createModal(phrase) {
	const modal = new ModalBuilder()
	.setCustomId("form")
	.setTitle('Yuru-Dot');
	const row1 = new ActionRowBuilder().addComponents(
		new TextInputBuilder()
		.setCustomId('phrase')
		.setLabel("入力文字列（DOT言語）")
		.setValue(phrase)
		.setStyle(TextInputStyle.Paragraph)
	);
	const row2 = new ActionRowBuilder().addComponents(
		new TextInputBuilder()
		.setCustomId('showtext')
		.setLabel("入力文字列を表示[1 | 0]")
		.setValue("0")
		.setStyle(TextInputStyle.Short)
		.setMaxLength(1)
	);
	modal.addComponents(row1,row2);
	return modal;
}
client.on("interactionCreate", async function (interaction) {
	if (interaction.type == InteractionType.ApplicationCommand){
		const { commandName } = interaction;
		switch (commandName) {
			case "dot2img":
				{
					const template = interaction.options.getString("template",false);
					let dottxt="";
					if (template == "digraph") {
						dottxt = fs.readFileSync("digraph.txt", "utf-8");
					}
					if (template =="graph"){
						dottxt = fs.readFileSync("graph.txt", "utf-8");
					}
					interaction.showModal(_createModal(dottxt));
				}
				break;
			case "help":
				await _on_cmd_help(interaction);
				break;
		}
	}
	if (interaction.type == InteractionType.ModalSubmit) {
		if (interaction.customId=="form") {
			const phrase = interaction.fields.getTextInputValue('phrase');
			const showtext = interaction.fields.getTextInputValue('showtext');
			const b_showtext = showtext == "1" ? true :false;
			await _on_cmd_dot(interaction, phrase, b_showtext);
		}
	}
})

client.once("ready", async () => {
	for (let guild of client.guilds.cache.values()) {
		await set_command(guild);
	}
	console.log("ready");
});

client.on("guildCreate", async guild=>{
	await set_command(guild);
	console.log("guildCreate:" + guild.name);
});

async function _on_cmd_dot(interaction, phrase, b_showtext) {
	await interaction.deferReply();
	try {
		const viz = new Viz({ Module, render });
		const svg = await viz.renderString(phrase);
		const imgbuffer = await sharp(Buffer.from(svg, "utf8")).png().toBuffer();
		interaction.followUp(
			{
				content: b_showtext ?  "```" + phrase + "```" :  "",
				files:[{ attachment: imgbuffer }],
			}
		);
	} catch (err) {
		console.log(err);
		if (err instanceof DiscordAPIError) {
			interaction.followUp("通信に失敗したけど心配しないで続けてください");
		} else {
			interaction.followUp("何か失敗したけど心配しないで続けてください");
		}
	}
}

async function _on_cmd_help(interaction) {
	const help = fs.readFileSync("help.txt", "utf-8");
	interaction.reply({content:help});
}

client.login(process.env.BOT_TOKEN);