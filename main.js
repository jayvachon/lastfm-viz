// https://github.com/mbostock/d3/wiki/Stack-Layout
// stack-layout

var config = require('./config');
var LastFmNode = require('lastfm').LastFmNode;
var _ = require('underscore');
var strftime = require('strftime');
var express = require('express');
var app = express();

var lastfm = new LastFmNode({
	api_key: config.api_key,
	secret: config.secret
});

app.use(express.static('public'));
app.set('views', './views')
app.set('view engine', 'jade')

app.get('/', function (req, res) {
	getLayers(function(layers) {
		// console.log(layers);
		// console.log(layers.length);
		res.render('index', { message: layers.length, users: layers });
	});
});

app.listen(3000, function () {
	console.log('Listening at localhost:3000');
});

function getLayers(callback) {

	getArtists(1, [], function(artists) {

		artists = _.flatten(artists);
		artists = _.map(artists, function(a) { return a['name']; });

		var layers = [];

		for (var i = 0; i < artists.length; i++) {

			createLayer(artists[i], function(layer) {
				layers.push(layer);
				if (layers.length == artists.length)
					callback(layers);
			});
		}
	});
}

function createLayer(name, callback) {

	var layer = { name: name, values: [] };

	getArtistPlayDates(name, 1, [], function(dates) {
		
		dates = _.flatten(dates);
		dates = _.countBy(dates, function(d) { 
			var d2 = strftime('%D', new Date(d*1000));
			return d2;
		});

		var vals = _.map(dates, function(count, date) {
			return { x: date, y: count };
		});

		layer.values.push(vals);

		callback(layer);
	});
}

// Gets a list of all artists listened to
function getArtists(index, artists, callback) {

	var pageLimit = 2;

	lastfm.request('library.getArtists', {
		user: config.user,
		page: index,
		handlers: {
			success: function(data) {
				var pgArtists = data['artists']['artist'];
				artists.push(pgArtists);
				artists = _.flatten(artists);
				if (pgArtists.length > 0 && index+1 < pageLimit) {
					// callback(artists);
					getArtists(index+1, artists, callback);
				} else {
					callback(artists);
				}
			},
			error: function(err) {
				console.log("error: " + err.message);
			}
		}
	});
}

// Gets the dates the artist had tracks played
function getArtistPlayDates(name, index, dates, callback) {

	var pageLimit = 2;

	lastfm.request('user.getArtistTracks', {
		user: config.user,
		artist: name,
		page: index,
		handlers: {
			success: function(data) {
				var pgDates = data['artisttracks']['track'];
				// var totalPages = data['artisttracks']['totalPages'];
				dates.push(_.map(pgDates, function(d) { return d['date']['uts'] }));
				if (pgDates.length > 0 && index+1 < pageLimit) {
					// callback(dates);
					// console.log(index + "/" + totalPages);
					getArtistPlayDates(name, index+1, dates, callback);
				} else {
					callback(dates);
				}	
			},
			error: function(err) {
				console.log("error: " + err.message);
			}
		}
	});
}

// unneeded?
function getDateRange(callback) {
	lastfm.request('user.getInfo', {
		user: config.user,
		handlers: {
			success: function(data) {
				callback(data['user']['registered']['#text'], Date.now());
			},
			error: function(err) {
				console.log("error: " + err.message);
			}
		}
	});
}
