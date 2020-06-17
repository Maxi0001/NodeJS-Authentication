// *************************************************
// 
//       Basic Bot Authentication Example
//             Made By: Max.#0069
//      Please do not remove credits. Thanks!
//
// *************************************************
const express = require("express");
const fs = require("fs");
const sha256 = require("sha256");
const Discord = require("discord.js");
const config = require("./config.json");
const client = new Discord.Client()
const app = express();

let blue = "\x1b[36m";
let white = "\x1b[37m";
let arrow = "\u00BB";
let color = "3371FF";
let port = 8080;
let value = 1;

let valid = false;
let logged = [];
let failed = [];

/*
    Normal Functions
     Used Throughout
*/
function generate() {
    let gen = "";
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let x = 0; x < 6; x++) {
        gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return gen;
}

/*
    Express Functions
     (Online Aspect)
*/
app.get("/auth", function (req, res) {
    fs.readFile("./data.json", "utf8", function (err, data) {
        let fileData = JSON.parse(data);
        if (!req.query.token || !req.query.hwid || !req.query.product) return res.send("Failed");
        let token = sha256(req.query.token);
        let hwid = sha256(req.query.hwid);
        let product = req.query.product;

        for (let x in fileData) {
            if (fileData[x].tokens.some(tokens => tokens[token])) {
                fileData[x].tokens.forEach(t => {
                    for (let i in t) {
                        if (i == token) {
                            if (t[i].hwid == "none" && t[i].product == product) {
                                logged.push(hwid + " : " + token);
                                valid = true;
                                t[i].hwid = hwid;
                                const toWrite = JSON.stringify(fileData, null, 2)
                                fs.writeFileSync('./data.json', toWrite);
                                return res.send("Success");
                            } else {
                                if (t[i].hwid == hwid && t[i].product == product) {
                                    logged.push(hwid + " : " + token);
                                    valid = true;
                                    return res.send("Success");
                                } else {
                                    failed.push(hwid + " : " + token);
                                }
                            }
                        }
                    }
                })
            }
        }

        if (valid == true) {
            valid = false;
        } else {
            failed.push(hwid + " : " + token);
            return res.send("Failed")
        }

    })
});

app.listen(port, async () => {
    console.log(`${blue}${arrow} Listener: ${white}Listening to requests on ${blue}localhost:${port}${white}`);
});


/*
    Discord Functionality
         (Auth Bot)
*/
client.on("ready", async () => {
    console.log(`${blue}${arrow} Discord: ${white}Discord bot logged in.`)
})

client.on("message", async msg => {
    fs.readFile("./data.json", "utf8", function (err, data) {
        let fileData = JSON.parse(data);
        if (msg.channel.type === "dm") return;
        if (msg.guild.id !== config.guild) return;
        if (!msg.content.startsWith(config.prefix)) return;
        if (!msg.member.hasPermission("ADMINISTRATOR")) return;
        let args = msg.content.split(" ").slice(1);
        let command = msg.content.split(" ")[0];
        command = command.slice(config.prefix.length);

        if (command == "add") {
            let token = generate() + "-" + generate() + "-" + generate() + "-" + generate();
            let user = msg.guild.member(msg.mentions.users.first() || msg.guild.members.cache.get(args[0]));
            let product = args[1];
            if (!user || !product) return msg.channel.send(`**:warning: ${config.prefix}add <user> <product>**`);
            const embed = new Discord.MessageEmbed()
                .setTitle("Authentication Token")
                .setColor(color)
                .setDescription(`You have been given **1x** Auth Token for product: **${product}**. Do not lose this.\n\n**Your Token:** ${token}`)
                .setFooter(`Given by: ${msg.author.tag}`)
            user.send(embed);
            msg.react("✅")
            if (!fileData[user.id]) {
                fileData[user.id] = {
                    tokens: [{
                        [sha256(token)]: {
                            "hwid": "none",
                            "product": product
                        }
                    }]
                }
            } else {
                fileData[user.id].tokens.push({
                    [sha256(token)]: {
                        "hwid": "none",
                        "product": product
                    }
                })
            }
            const toWrite = JSON.stringify(fileData, null, 2)
            fs.writeFileSync('./data.json', toWrite)


        } else if (command == "tokens") {
            let tokens = [];
            let user = msg.guild.member(msg.mentions.users.first() || msg.guild.members.cache.get(args[0]));
            if (!user) return msg.channel.send(`:warning: **${config.prefix}tokens <@user>**`);
            if (!fileData[user.id]) return msg.channel.send(":warning: **User does not have any active tokens.**");
            fileData[user.id].tokens.forEach(t => {
                for (let i in t) {
                    let toSendHwid;
                    if (t[i].hwid == "none") {
                        toSendHwid = "false"
                    } else {
                        toSendHwid = "true"
                    }
                    tokens.push(`**Token #${value}**\n**Ran:** ${toSendHwid}\n**Product**: ${t[i].product}\n`)
                    value++
                }
            })
            const embed = new Discord.MessageEmbed()
                .setTitle(`${user.user.tag}'s Tokens`)
                .setDescription(tokens)
                .setColor(color)
                .setThumbnail(user.user.avatarURL())
            msg.channel.send(embed);
            tokens = [];
            value = 1;


        } else if (command == "help") {
            const embed = new Discord.MessageEmbed()
                .setDescription(`**${config.prefix}add <@user>** - Register a user with a license token.\n**${config.prefix}tokens <@user>** - View a users license tokens.\n**${config.prefix}reset <@user>** - Reset all of a users license tokens\n**${config.prefix}delete <@user>** - Remove all of a users license tokens\n**${config.prefix}help** - View this menu`)
                .setColor(color)
                .setThumbnail(msg.guild.iconURL())
                .setFooter("Made by: Max.#0069")
                .setTitle("Help Menu")
            msg.channel.send(embed)


        } else if (command == "reset") {
            let user = msg.guild.member(msg.mentions.users.first() || msg.guild.members.cache.get(args[0]));
            if (!user) return msg.channel.send(`:warning: **${config.prefix}reset <@user>**`);
            if (!fileData[user.id]) return msg.channel.send(":warning: **User does not have any active tokens.**");
            const embed = new Discord.MessageEmbed()
                .setTitle(":warning: Hwid's Cleared")
                .setDescription(`All of your license tokens have just been reset in **${msg.guild.name}**. You may now use run them on a new device.`)
                .setColor(color)
                .setFooter(`Reset by: ${msg.author.tag}`)

            fileData[user.id].tokens.forEach(t => {
                for (let i in t) {
                    t[i].hwid = "none"
                }
            })
            msg.react("✅")
            user.send(embed)
            const toWrite = JSON.stringify(fileData, null, 2)
            fs.writeFileSync('./data.json', toWrite)


        } else if (command == "delete") {
            let user = msg.guild.member(msg.mentions.users.first() || msg.guild.members.cache.get(args[0]));
            if (!user) return msg.channel.send(`:warning: **${config.prefix}delete <@user>**`);
            if (!fileData[user.id]) return msg.channel.send(":warning: **User does not have any active tokens.**");
            const embed = new Discord.MessageEmbed()
                .setTitle(":warning: License Deleted")
                .setDescription(`All of your license tokens have just been deleted in **${msg.guild.name}**.`)
                .setColor(color)
                .setFooter(`Deleted by: ${msg.author.tag}`)
            delete fileData[user.id]
            msg.react("✅")
            user.send(embed)
            const toWrite = JSON.stringify(fileData, null, 2)
            fs.writeFileSync('./data.json', toWrite)
        }
    })
})


client.login(config.token);
setInterval(() => {
    if (logged.length == 0 && failed.length == 0) return;
    const embed = new Discord.MessageEmbed()
        .setColor("3371FF")
        .setTitle("Auth Log")
        .addField("**Valid Attempts** ***(" + logged.length + ")***", logged.length + " users have **successfully** logged in in the last **" + config.alertinterval + "** seconds.")
        .addField("**In-Valid Attempts** ***(" + failed.length + ")***", failed.length + " users have **invalidly** logged in in the last **" + config.alertinterval + "** seconds.")
        .setThumbnail(client.guilds.cache.get(config.guild).iconURL())
    const channel = client.channels.cache.get(config.logschannel);
    if (!channel) return console.log(`${blue}${arrow} Warning: ${white}No logs channel found`);
    channel.send(embed);
    logged = [];
    failed = [];
}, config.alertinterval * 1000);