'use strict';

const express = require('express');
const fs = require('fs');
const request = require('request');
const cheerio = require('cheerio');
const app     = express();
const moment = require('moment');

moment.locale('de');
let json = { lastUpdated: Date.now(), concerts : [], cities : [] };

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

      let concertsData = lines.map(function (line) {
        return line.split(",");
      });
      // console.log(concertsData);

      for (var i = 0; i < concertsData.length; i++) {
        if (concertsData[i].length > 1) {
          // console.log(concertsData[i]);
          let dateAndArtist = concertsData[i][0].split(/\s(.+)?/);
          // console.log(dateAndArtist);
          let concert = new Concert(
            dateAndArtist[0],
            (dateAndArtist[1] ? dateAndArtist[1].trim() : ''),
            (concertsData[i][1] ? concertsData[i][1].trim() : ''),
            (concertsData[i][2] ? concertsData[i][2].trim() : '')
          );

          if (!concert.date.isValid()) {
            console.log('Invalid Date');
            continue;
          }

          json.concerts.push(concert);
        }
      }

    }
  });

});

app.listen('3000')

console.log('Magic happens on port 3000');

exports = module.exports = app;
