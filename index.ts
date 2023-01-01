import discord from "discord.js";
import cron from "cron";
import dotenv from "dotenv";
import fs from "fs/promises";
import fetch from "node-fetch";
// import { RequestInfo, RequestInit } from "node-fetch";
//
// const fetch = (url: RequestInfo, init?: RequestInit) =>
//     import("node-fetch").then(({ default: fetch }) => fetch(url, init));

// Overwrite log function for logging
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const log = (data: any) => {
    const currentDate = "[" + new Date().toUTCString() + "] ";
    console.log(currentDate, data);

};

const commands = [
    [
        "toggle-dad-jokes",
        "toggle-dad-joke",
        "toggle-jokes",
        "toggle-joke",
        "toggle-dad",
        "toggle-dads"
    ],
    [
        "joke",
        "dad-joke",
        "getjoke",
        "getdadjoke"
    ]
];

let data: { channelIds: string[] } = {
    channelIds: [],
};

const readData = async () => {
    try {
        const dataFile = await fs.readFile("./data.json");
        const dataJson = JSON.parse(dataFile.toString());
        data = dataJson;
    } catch {
        return;
    }
};

const setupDiscord = (client: discord.Client): void => {
    if (!client.user) {
        log("No client user detected");
    } else {
        client.user.setActivity("waiting for midnight");
    }
    new cron.CronJob("00 00 00 * * *", async () => {
        for (const channelId of data.channelIds) {
            client.channels.fetch(channelId)
                .then(channel => sendDadJoke(channel as discord.TextChannel))
                .catch(console.error);
        }
        log("Sent dad jokes to " + data.channelIds.length + " channels");
    }, undefined, true, "Europe/Zurich");
    log("Discord bot is ready");
};

const toggleChannel = (channelId: string, msg: discord.Message): void => {
    if (data.channelIds.includes(channelId)) {
        for (let i = 0; i < data.channelIds.length; i++) {
            if (channelId === data.channelIds[i]) {
                data.channelIds.splice(i, 1);
                break;
            }
        }
        msg.reply("✅ Channel won't recieve dad jokes anymore.");
        log("Removed channel with id: " + channelId);
    } else {
        data.channelIds.push(channelId);
        msg.reply("✅ Channel will recieve a dad joke every day at 00:00:00.");
        log("Added channel with id: " + channelId);
    }
};

const getRandomJoke = async () => {
    const res = await fetch("https://dad-jokes.p.rapidapi.com/random/joke", {
        headers: {
            "X-RapidAPI-Key": process.env.RAPID_API_KEY || "",
            "X-RapidAPI-Host": "dad-jokes.p.rapidapi.com",
            // useQueryString: true
        }
    });
    if (res.status !== 200) {
        throw new Error("Could not fetch dad joke");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;
    const jokeData = data.body[0];
    const joke = `${jokeData.setup}\n${jokeData.punchline}`;
    return joke;
};


const sendDadJoke = async (channel: discord.TextChannel): Promise<void> => {
    const joke = await getRandomJoke();
    channel.send(joke);
};

const replyDadJoke = async (msg: discord.Message): Promise<void> => {
    const joke = await getRandomJoke();
    msg.reply(joke);
};

const writeData = async () => {
    await fs.writeFile("./data.json", JSON.stringify(data));
};


const main = async () => {
    dotenv.config();
    readData();
    const client = new discord.Client();
    if (!client) {
        log("Discord bot could not be created");
        return;
    }
    client.login(process.env.BOTTOKEN);
    client.on("ready", () => {
        setupDiscord(client);
    });
    process.env.TZ = "Europe/Zurich";
    client.on("message", async (msg) => {
        if (msg.author.bot) return;
        if (msg.content[0] !== "!") return;
        const channelId = msg.channel.id;

        const message = msg.content.slice(1, msg.content.length);
        if (commands[0].includes(message)) {
            toggleChannel(channelId, msg);
            await writeData();
        } else if (commands[1].includes(message)) {
            log("Sent a joke to user with id: " + msg.author.id);
            replyDadJoke(msg);
        }
    });
};
main();

