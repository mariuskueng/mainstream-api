'use strict';

const express = require('express');
const request = require('request');
const cheerio = require('cheerio');
const app = express();
const moment = require('moment');
const mongoose = require('mongoose');

moment.locale('de');
const mongoURL =
  process.env.MONGOLAB_URI ||
  process.env.MONGOHQ_URL ||
  'mongodb://localhost/mainstream_api';

const port = process.env.PORT || 3000;
mongoose.connect(mongoURL);

const ConcertSchema = mongoose.Schema({
  date: {
    type: Number,
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


function parseData(res, html) {
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
    const date = moment(dateAndArtist[0], 'DD.MM.YY');
    const artist = dateAndArtist[1];
    const venue = line[1];
    const city = line[2];

    if (!date.isValid()) {
      // skip current iteration if date is invalid, hence broken concert
      continue;
    }

    Concert.create({
      date: date.unix(),
      artist: artist,
      venue: venue,
      city: city,
    });
  }

  res.send('Data successfully saved!');
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
      parseData(res, html);
    }
  });
});

app.get('/', (req, res) => {
  // let json = { lastUpdated: moment(), concerts : {}, cities : [] };
  Concert.find((err, concerts) => {
    if (err) {
      res.send(err);
    }
    res.json(concerts);
  });
});

app.listen(port);

console.log(`Magic happens on port ${port}`);

exports = module.exports = app;
