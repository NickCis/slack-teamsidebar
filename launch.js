#!/usr/bin/env node

const chromeLaunch = require('chrome-launch');
const { resolve } = require('path');

const EXTENSION_PATH = resolve('.');
const START_URL = 'https://app.slack.com/client/';

chromeLaunch(START_URL, {
  args: [`--load-extension=${EXTENSION_PATH}`],
});
