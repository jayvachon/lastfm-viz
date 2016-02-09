//https://github.com/mbostock/d3/wiki/Stack-Layout
// stack-layout

var config = require('./config');
var LastFmNode = require('lastfm').LastFmNode;
var _ = require('underscore');
var strftime = require('strftime');

var lastfm = new LastFmNode({
	api_key: config.api_key,
	secret: config.secret
});

/*getDateRange(function(f, a) {
	console.log(f);
	console.log(a);
});*/

getLayers(function(layers) {
	for (var i = 0; i < layers.length; i++) {
		console.log(layers[i].name);
	};
	// console.log(layers.length);
});

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

		if (layers.length == artists.length) {
			callback(layers);
		}
	});
}

function getLayers(callback) {

	getArtists(1, [], function(artists) {

		artists = _.flatten(artists);
		var layers = [];

		for (var i = 0; i < artists.length; i++) {

			var name = artists[i]['name'];
			
		}
	});
}

function getArtists(index, artists, callback) {

	var pageLimit = 1;

	lastfm.request('library.getArtists', {
		user: config.user,
		page: index,
		handlers: {
			success: function(data) {
				var pgArtists = data['artists']['artist'];
				artists.push(pgArtists);
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

function getArtistPlayDates(name, index, dates, callback) {

	var pageLimit = 1;

	lastfm.request('user.getArtistTracks', {
		user: config.user,
		artist: name,
		handlers: {
			success: function(data) {
				var pgDates = data['artisttracks']['track'];
				dates.push(_.map(pgDates, function(d) { return d['date']['uts'] }));
				if (pgDates.length > 0 && index+1 < pageLimit) {
					// callback(dates);
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
