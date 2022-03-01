const discord = require('discord.js');
const cron = require('cron');
const request = require('request');

require('dotenv').config();

const client = new discord.Client();

const date = new Date();

const commands = [
    [
        'toggle-dad-jokes',
        'toggle-dad-joke',
        'toggle-jokes',
        'toggle-joke',
        'toggle-dad',
        'toggle-dads'
    ],
    [
        'joke',
        'dad-joke',
        'getjoke',
        'getdadjoke'
    ]
]


client.login(process.env.BOTTOKEN);
client.on('ready', readyDiscord);
process.env.TZ = 'Europe/Zurich'

let channelIds = [];

const time = new Date();

function readyDiscord() {
    console.log(date.toLocaleTimeString() + ": Discord bot is ready");
    // let scheduledMessage = new cron.CronJob('10 36 10 * * *', async () => {
    let scheduledMessage = new cron.CronJob('00 00 00 * * *', async () => {
        for (let i = 0; i < channelIds.length; i++) {
            let channelId = channelIds[i];

            let currChan = client.channels.fetch(channelId)
                .then(channel => sendDadJoke(channel))
                .catch(console.error);
        }
        console.log(date.toLocaleTimeString() + ': Sent dad jokes to ' + channelIds.length + ' channels');
    }, undefined, true, 'Europe/Zurich');

    // scheduledMessage.start();
}

function sendDadJoke(channel) {
    request('https://icanhazdadjoke.com/slack', { json: true }, (err, res, body) => {
        if (err) return console.error(err);
        channel.send(body.attachments[0].text);
    });
}

function replyDadJoke(msg) {
    request('https://icanhazdadjoke.com/slack', { json: true }, (err, res, body) => {
        if (err) return console.error(err);
        msg.reply(body.attachments[0].text);
    });
}


client.on('message', async (msg) => {
    if (msg.author.bot) return;
    if (msg.content[0] !== '!') return;
    let channelId = msg.channel.id;

    let message = msg.content.slice(1, msg.content.length);
    if (commands[0].includes(message)) {
        if (channelIds.includes(channelId)) {
            for (let i = 0; i < channelIds.length; i++) {
                if (channelId === channelIds[i]) {
                    channelIds.splice(i, 1);
                }
            }
            msg.reply("✅ Channel won't recieve dad jokes anymore.");
            console.log(date.toLocaleTimeString() + ': Removed channel with id: ' + channelId);
        } else {
            channelIds.push(channelId);
            msg.reply('✅ Channel will recieve a dad joke every day at 00:00:00.');
            console.log(date.toLocaleTimeString() + ': Added channel with id: ' + channelId);
        }
    } else if (commands[1].includes(message)) {
        console.log(date.toLocaleTimeString() + ': Sent a joke to user with id: ' + msg.author.id);
        replyDadJoke(msg);
    }
});
