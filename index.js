const heos = require('heos-api')
const heosPort = 1255
const heosIP = '192.168.178.97'
const express = require('express')
const app = express()
const xPort = 5555
const SSE = require('express-sse')
const sse = new SSE()
app.get('/stream', sse.init)
var media

heos.discoverOneDevice()
	.then(address => heos.connect(address))
	.then(connection =>
		connection
			.write('system', 'register_for_change_events', {enable: 'on'})
			.write('player', 'get_now_playing_media', {pid: 781222528})
			.on({	
					commandGroup: 'event',
					command: 'player_now_playing_changed'
				},
				response => {
					console.log("--------------------------------")
					console.log("Event: now playing media changed")
					connection.write('player', 'get_now_playing_media', {pid: 781222528})
				}
			)
			.on({
					commandGroup: 'player',
					command: 'get_now_playing_media'
				},
				response => {
					console.log(response.payload)
					// Some actions from the Spotify app (e.g. scrubbing, skipping) cause a 
					// brief transitory flush of now_playing media.
					// This causes two change events: the flush and the repopulating.
					// The following code prevents the server from sending an SSE when the 
					// payload.image_url would be empty.
					if (response.payload.image_url != "") {
						media = response.payload
						sse.send(media.image_url)
					}
				}
			)
	)

app.use('/', (req, res, next) => {
	console.log("Received a " + req.method + " request at " + req.url)
	next()
})
app.get('/', (req, res) => {
	res.set('Content-Type', 'text/html')
	res.sendFile(__dirname + '/index.html')
})

app.listen(xPort, () => console.log("Server is now listening to port %d.", xPort))

// to do:
// - handle edge cases: no media playing, receiver off, source is not spotify/applemusic/etc


// Ceaveat
// Reason:
// Starting the server, heos-api does its thing, the sse thing gets ready.
// Then, the client makes a GET request for '/', the html file is sent and gets parsed.
// During parsing, the SSE connection gets established. But no album cover is shown,
// because no event has been sent from the server since.
// The event has to be sent after the html has been parsed, BUT the sendFile function ends the get request,
// I think.
// Idea: try using bi-directional web sockets instead, with package express-ws.
// That way the html can notify the server when its done rendering and request an image_url
// Bug: Scrubbing through a song on spotify triggers now_playing_media_changed event