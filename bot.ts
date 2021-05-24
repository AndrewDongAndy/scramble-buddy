/*
The driver for the bot.
*/


import Discord = require('discord.js');
import { Message, TextChannel, User } from 'discord.js';
import pkg = require('./package.json');

// config and parameters
import config from './config';

import actionsTroll = require('./modules/actions_troll');
import commands = require('./modules/commands');
import db = require('./modules/database');
import { REACTION_ADD_ACTIONS } from './modules/reactions';
import solves = require('./modules/solves');
import timer = require('./modules/timer');

const bot = new Discord.Client();

bot.on('ready', async () => {
  bot.user!.setActivity(`type '${config.prefix} help' for help`); // set bot status
  // bot.user.setAvatar('./assets/avatar.png');
  await actionsTroll.loadJokes();

  // load past solves
  let dataChannel = (await bot.channels.fetch(config.DATA_CHANNEL_ID)) as TextChannel;
  await db.loadSolves(dataChannel);

  // ready to go
  console.log(`${pkg.name}, v${pkg.version} is now up and running.`);
});

/**
 * Checks if this message stops a timer.
 * @param message the message to check
 */
async function checkTimer(message: Message) {
  if (timer.hasTimer(message.author.id, message.channel.id)) {
    let time = await timer.stopTimer(message);
    let hadScramble = true;
    if (time < 0) { // kind of a hack
      time = -time;
      hadScramble = false;
    }
    let s = `Timer stopped for ${message.author.username}. **${timer.formatTime(time, false)}**`;
    if (!hadScramble) {
      s += '\nTo track your solves, generate a scramble using `cube get` and'
          + ' react to it. Then, your next time will be logged on your profile.';
    } else if (solves.getSolver(message.author.id).lastSolveWasPb()) {
      s += `\nThat is a new personal best. Congratulations!`;
    }
    // message.reply(s);
    message.channel.send(s);
  }
}

// when a message is sent
bot.on('message', async message => {
  const userId = message.author.id;
  if (userId == bot.user!.id || (message.author.bot && config.IGNORE_BOTS)) {
    // ignore message if sent by self, or sender is bot and IGNORE_BOTS is on
    return;
  }
  if (message.channel.id == config.DATA_CHANNEL_ID) {
    // delete messages sent in the logs to avoid parsing errors
    message.delete({ reason: 'not supposed to send messages in the data channel' });
    return;
  }
  await actionsTroll.handleTroll(message); // do troll responses
  await checkTimer(message);
  await commands.handleCommand(message);
});

// when a reaction is added to an existing message
bot.on('messageReactionAdd', async (messageReaction, user) => {
  // console.log('someone reacted to: ' + messageReaction.message.content);
  if (messageReaction.message.author.id != bot.user!.id) {
    return; // only handle reactions to messages sent by this bot
  }
  if (user.id == bot.user!.id || (user.bot && config.IGNORE_BOTS)) {
    return; // ignore reacts by irrelevant users
  }
  for (const raa of REACTION_ADD_ACTIONS) {
    if (messageReaction.emoji.name == raa.emoji && raa.appliesTo(messageReaction.message)) {
      raa.do(messageReaction, user as User);
    }
  }
});

// when a reaction is removed from an existing message
bot.on('messageReactionRemove', async (messageReaction, user) => {
  if (user.id == bot.user!.id || (user.bot && config.IGNORE_BOTS)) {
    return;
  }
  if (messageReaction.emoji.name == REACTION_ADD_ACTIONS[0].emoji) {
    REACTION_ADD_ACTIONS[1].do(messageReaction, user as User);  // hack but whatever
  }
  // REACTION_REMOVE_ACTIONS.forEach(rda => {
  //   if (messageReaction.emoji.name == rda.emoji) {
  //     rda.do(messageReaction, user);
  //   }
  // });
});

require('dotenv').config();  // log in using environment variable
bot.login(process.env.TOKEN);