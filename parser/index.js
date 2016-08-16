const mongoose = require('mongoose');
const cheerio = require('cheerio');
const moment = require('moment');
require('moment-timezone');
const Concert = require('../models/concert');

const timezone = 'Europe/Zurich';

function parser(html, callback) {
  const today = moment().tz(timezone).startOf('day');
  const $ = cheerio.load(html);
  const dataRaw = $('#content').text();

  const lines = dataRaw.split('\n');
  // remove unnessary lines
  lines.splice(lines.length - 9, 9);

  // split text of lines to get separate data
  const concertsData = lines.map((line) => line.split(','));

  for (const line of concertsData) {
    const dateAndArtist = line[0].split(/\s(.+)?/);
    const date = moment(dateAndArtist[0], 'DD.MM.YY').tz(timezone);
    const artist = dateAndArtist[1];
    const venue = line[1];
    const city = line[2];

    if (!date.isValid() || date.unix() < today.unix()) {
      // skip current iteration if date is invalid, hence broken concert
      // or if older than today
      continue;
    }

    Concert.create({
      date: date.toDate(),
      artist,
      venue,
      city,
    }, (err) => {
      if (err) return console.error(err);
      // saved!
    });
  }

  if (callback) {
    callback();
  }
}

module.exports = parser;
