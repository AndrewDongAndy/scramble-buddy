/*
Module to manage all actions related to timing.

TODO: rework using Redis?
*/

import { Message, Snowflake, TextBasedChannels, User } from "discord.js";

import { logSolve } from "./database";

// map<userId, map<channelId, startTime>>
const startTimes = new Map<Snowflake, Map<Snowflake, number>>();

// map from user id to scramble string
const curScramble = new Map<Snowflake, string>();

/**
 * Starts a timer for a user in a channel.
 * @param userId the id of the user to start a timer for
 * @param channelId the channel the timer is bound to
 */
export const startTimer = (userId: Snowflake, channelId: Snowflake): void => {
  if (!startTimes.has(userId)) {
    startTimes.set(userId, new Map());
  }
  startTimes.get(userId)!.set(channelId, Date.now());
};

/**
 * Returns whether there is a timer for a user in a channel.
 * @param userId the id of the user to check
 * @param channelId the id of the channel to check
 * @returns whether there is a timer with the given parameters
 */
export const hasTimer = (userId: Snowflake, channelId: Snowflake): boolean => {
  return startTimes.has(userId) && startTimes.get(userId)!.has(channelId);
};

const _getStartTime = (
  userId: Snowflake,
  channelId: Snowflake
): number | never => {
  const res = startTimes.get(userId)?.get(channelId);
  if (res == undefined) {
    throw "tried to get the start time of a non-existent timer";
  }
  return res;
};

/**
 * Stops the timer and returns the solve time of the user. If a scramble was
 * selected, logs the solve in the database.
 * @param user the user to check
 * @param channel the channel to check
 * @returns the solve time, or its negative if no scramble was selected
 */
const _stopTimer = async (
  user: User,
  channel: TextBasedChannels
): Promise<number> | never => {
  if (!hasTimer(user.id, channel.id)) {
    throw "tried to stop a timer for a user without an ongoing timer";
  }
  const time = Date.now() - _getStartTime(user.id, channel.id);
  startTimes.get(user.id)!.delete(channel.id);
  const scramble = curScramble.get(user.id);
  if (scramble == undefined) {
    return -time; // nothing to log or delete
  }
  await logSolve(user.id, time, scramble);
  curScramble.delete(user.id);
  return time;
};

/**
 * Stops the timer and returns the solve time of the user. If a scramble was
 * selected, logs the solve in the database.
 * @param message the message to check
 * @returns the solve time, or its negative if no scramble was selected
 */
export const stopTimer = async (message: Message): Promise<number> => {
  return _stopTimer(message.author, message.channel);
};

export const setScramble = (
  userId: Snowflake,
  scrambleString: string
): void => {
  curScramble.set(userId, scrambleString);
};

export const deleteScramble = (userId: Snowflake): boolean => {
  return curScramble.delete(userId);
};
