// https://github.com/mbostock/d3/wiki/Stack-Layout
// stack-layout

var config = require('./config');
var LastFmNode = require('lastfm').LastFmNode;
var _ = require('underscore');
var strftime = require('strftime');
var express = require('express');
var async = require('async');
var app = express();
// var fs = require('fs'); // TODO: cache

var lastfm = new LastFmNode({
	api_key: config.api_key,
	secret: config.secret
});

function daysSinceEpoch(date) {
	// actually "weeks since epoch"
	return Math.floor(new Date(date*1000)/8.64e7/7);
}

var allDatesArr = [];
var allDates = {
	get dates () {
		return allDatesArr;
	},
	set dates(dateRange) {
		if (allDatesArr.length === 0) {
			for (var i = dateRange.start; i < dateRange.end; i ++) {
				allDatesArr.push({x: i, y: 0});
			}
		}
		return allDatesArr;
	},
	start: function () { return allDatesArr[0].x; },
	end: function() { return allDatesArr[allDatesArr.length-1].x; }
}

app.use(express.static('public'));
app.set('views', './views')
app.set('view engine', 'jade')

app.get('/', function (req, res) {
	getLayers(5, -1, function(layers) {
		res.render('index', { message: layers.length + " artists", users: layers });
	});
});

app.get('/quick', function(req, res) {
	getLayers(1, 1, function(layers) {
		res.render('index', { message: layers.length + " artists", users: layers });
	});
});

app.listen(3000, function () {
	console.log('Listening at localhost:3000');
});

function getLayers(artistsLimit, tracksLimit, layersCallback) {

	getDateRange(function(dateRange) {

		getArtists(1, [], artistsLimit, function(artists) {

			artists = _.flatten(artists);
			artists = _.map(artists, function(a) { return a['name']; });

			var layers = [];

			async.each(artists, function(artist, callback) {
				createLayer(artist, dateRange, tracksLimit, function(layer) {
					layers.push(layer);
					callback();
				});
			}, function(err) {
				layersCallback(layers);
			});
		});
	});
}

function createLayer(name, dateRange, tracksLimit, callback) {

	var layer = { name: name, values: [] };

	getArtistPlayDates(name, 1, [], tracksLimit, function(dates) {

		allDates.dates = dateRange;
		var ad = _.map(allDates.dates, _.clone);

		dates = _.flatten(dates);
		dates = _.countBy(dates, function(d) { return daysSinceEpoch(d); });
		dates = _.map(dates, function(count, date) { return { x: parseInt(date), y: count }; });

		var vals = _.map(ad, function(d) {
			var counts = _.find(dates, function(c) { return c.x === d.x });
			if (counts != undefined) {
				d.y = counts.y;
			}
			return d;
		});

		layer.values = vals;
		callback(layer);
	});
}

// Gets a list of all artists listened to
function getArtists(index, artists, artistsLimit, callback) {

	var pageLimit = artistsLimit;

	lastfm.request('library.getArtists', {
		user: config.user,
		page: index,
		handlers: {
			success: function(data) {
				var pgArtists = data['artists']['artist'];
				artists.push(pgArtists);
				artists = _.flatten(artists);
				if (pgArtists.length > 0 && (pageLimit === -1 || index+1 < pageLimit)) {
					// callback(artists);
					getArtists(index+1, artists, artistsLimit, callback);
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
function getArtistPlayDates(name, index, dates, tracksLimit, callback) {

	var pageLimit = tracksLimit;

	lastfm.request('user.getArtistTracks', {
		user: config.user,
		artist: name,
		page: index,
		handlers: {
			success: function(data) {
				var pgDates = data['artisttracks']['track'];
				// var totalPages = data['artisttracks']['totalPages'];
				dates.push(_.map(pgDates, function(d) { return d['date']['uts'] }));
				if (pgDates.length > 0 && (pageLimit == -1 || index+1 < pageLimit)) {
					// callback(dates);
					// console.log(index + "/" + totalPages);
					getArtistPlayDates(name, index+1, dates, tracksLimit, callback);
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

function getDateRange(callback) {
	lastfm.request('user.getInfo', {
		user: config.user,
		handlers: {
			success: function(data) {
				callback({ 
					start: daysSinceEpoch(data['user']['registered']['#text']), 
					end: daysSinceEpoch(Date.now()/1000)
				});
			},
			error: function(err) {
				console.log("error: " + err.message);
			}
		}
	});
}
