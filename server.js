'use strict';

const express = require('express');
const request = require('request');
const cheerio = require('cheerio');
const app = express();
const moment = require('moment');
const mongoose = require('mongoose');
require('moment-timezone');

moment.locale('de');

const port = process.env.PORT || 3000;
const mongoURL =
  process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  process.env.MONGODB_URI ||
  'mongodb://localhost/mainstream_api';

mongoose.connect(mongoURL, function (err, res) {
  if (err) {
    console.log ('ERROR connecting to: ' + mongoURL + '. ' + err);
  } else {
    console.log ('Succeeded connected to: ' + mongoURL);
  }
});

const ConcertSchema = mongoose.Schema({
  date: {
    type: Date,
  },
  artist: {
    type: String,
    trim: true,
  },
  venue: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    trim: true,
  },
});

const Concert = mongoose.model('Concert', ConcertSchema);

const TIMEZONE = "Europe/Zurich";
const today = moment().tz(TIMEZONE).startOf('day');
const now = moment().tz(TIMEZONE);

function parseData(html, callback) {
  const $ = cheerio.load(html);
  const dataRaw = $('#content').text();

  const lines = dataRaw.split('\n');
  // remove unnessary lines
  lines.splice(lines.length - 9, 9);

  // split text of lines to get separate data
  const concertsData = lines.map((line) => {
    return line.split(',');
  });

  for (const line of concertsData) {
    const dateAndArtist = line[0].split(/\s(.+)?/);
    const date = moment(dateAndArtist[0], 'DD.MM.YY').tz(TIMEZONE);
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
    });
  }

  if (callback) {
    callback();
  }
}

app.get('/scrape', (req, res) => {
  // The URL we will scrape from
  const url = 'http://mainstream.radiox.ch/konzerte';
  request(url, (err, response, html) => {
    if (err) {
      res.send(`Error: ${err}`);
    } else {
      // Remove collection first
      mongoose.connection.db.dropCollection('concerts');
      // parse the data
      parseData(html, () => {
        res.send('Data successfully saved!');
      });
    }
  });
});

app.get('/', (req, res) => {
  // Group, filter and sort concerts by date
  Concert.aggregate([
    // filter out concerts older than today
    {
      $match: {
        date: { $gte: now.toDate() },
      },
    },
    {
    // group concerts by day
      $group: {
        _id: '$date',
        concerts: {
          $push: {
            artist: '$artist',
            city: '$city',
            venue: '$venue',
          },
        },
      },
    },
    // sort desc
    {
      $sort: {
        _id: 1,
      },
    },
  ], (err, concerts) => {
    if (err) {
      res.send(err);
    }

    res.json({
      lastModified: now,
      concerts: concerts,
    });
  });
});

app.listen(port);

console.log(`Server running on port ${port}`);

exports = module.exports = app;
