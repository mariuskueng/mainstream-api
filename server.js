const express = require('express');
const request = require('request');
const mongoose = require('mongoose');
const moment = require('moment');
require('moment-timezone');
const Concert = require('./models/concert');

const parser = require('./parser');

const config = process.argv[2] === '--production' ? require('./config.prod.js') : require('./config.dev.js');
const app = express();
moment.locale('de');

const port = config.port;
const mongoURL = config.mongoURL;
const timezone = 'Europe/Zurich';

mongoose.connect(mongoURL, function (err, res) {
  if (err) {
    console.log('ERROR connecting to: ' + mongoURL + '. ' + err);
  } else {
    console.log('Succeeded connected to: ' + mongoURL);
  }
});

app.get('/parse', (req, res) => {
  // The URL we will scrape from
  const url = 'http://mainstream.radiox.ch/konzerte';
  request(url, (err, response, html) => {
    if (err) {
      res.send(`Error: ${err}`);
    } else {
      // Remove collection first
      mongoose.connection.db.dropCollection('concerts');
      // parse the data
      parser(html, () => {
        res.send('Data successfully saved!');
      });
    }
  });
});

app.get('/', (req, res) => {
  const now = moment().tz(timezone);
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
      concerts,
    });
  });
});

app.listen(port);

console.log(`Server running on port ${port}`);

exports = module.exports = app;
