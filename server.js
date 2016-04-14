'use strict';

const express = require('express');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const app     = express();
const moment = require('moment');

moment.locale('de');
let json = { lastUpdated: moment(), concerts : {}, cities : [] };

class Concert {
  constructor(date, artist, venue, city) {
    this.date = moment(date.trim(), 'DD.MM.YY');
    this.artist = artist;
    this.venue = venue;
    this.city = this.setCity(city);
  }

  setCity (city) {
    let index = json.cities.indexOf(city);
    if (index > -1) {
      return json.cities[index];
    }
    else {
      json.cities.push(city);
      return city;
    }
  }
}

app.get('/scrape', function(req, res){

  // The URL we will scrape from - in our example Anchorman 2.

  const url = 'http://mainstream.radiox.ch/konzerte';

  // The structure of our request call
  // The first parameter is our URL
  // The callback function takes 3 parameters, an error, response status code and the html

  request(url, function(error, response, html){

    // First we'll check to make sure no errors occurred when making the request

    if(!error){
      // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality

      let $ = cheerio.load(html);
      let dataRaw = $('#content').text();

      let lines = dataRaw.split('\n');
      // remove unnessary lines
      lines.splice(lines.length - 9, 9);

      // split text of lines to get separate data
      let concertsData = lines.map(function (line) {
        return line.split(",");
      });

      for (var i = 0; i < concertsData.length; i++) {
        let dateAndArtist = concertsData[i][0].split(/\s(.+)?/);

        let concert = new Concert(
          dateAndArtist[0],
          (dateAndArtist[1] ? dateAndArtist[1].trim() : ''),
          (concertsData[i][1] ? concertsData[i][1].trim() : ''),
          (concertsData[i][2] ? concertsData[i][2].trim() : '')
        );

        if (!concert.date.isValid()) {
          // skip current iteration if date is invalid, hence broken concert
          continue;
        }

        let date = concert.date.unix();
        // Add new date key
        if (!json.concerts[date]) {
          json.concerts[date] = [];
        }
        concert.date = concert.date.unix();
        json.concerts[date].push(concert);
      }

    }

    fs.writeFile('concerts.json', JSON.stringify(json, null, 4), function(err){
      if (err) throw err;
      console.log('File successfully written! - Check your project directory for the output.json file');
    });

    // Finally, we'll just send out a message to the browser reminding you that this app does not have a UI.
    res.send('File successfully written! - Check your project directory for the output.json file!')
  });
});

app.get('/', function(req, res){
  let json = JSON.parse(fs.readFileSync('concerts.json'));
  res.setHeader('Content-Type', 'application/json');
  res.send(json);
});

app.listen('3000')

console.log('Magic happens on port 3000');

exports = module.exports = app;
