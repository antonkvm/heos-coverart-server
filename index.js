const heos = require('heos-api')
const heosPort = 1255
const heosIP = '192.168.178.97'
const express = require('express')
const app = express()
const xPort = 5555
var media
var message = ""

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
					console.log("Retrieving new media info...")
					connection.write('player', 'get_now_playing_media', {pid: 781222528})
				}
			)
			.on({
					commandGroup: 'player',
					command: 'get_now_playing_media'
				},
				response => {
					media = response.payload // update media object with new metadata
					console.log("Current song playing: \"%s\" by %s", media.song, media.artist)
					emitEvent()
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
function emitEvent() {
	app.get('/events', (req, res) => {
		res.status(200)
		res.set({
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Access-Control-Allow-Origin': '*'
		})
		setTimeout(() => {
			message = 'data: ' + media.image_url
			res.write(message + '\n\n')
		}, 500)
	})
}

app.listen(xPort, () => console.log("Server is now listening to port %d.", xPort))

// to do:
// - auto refresh image with websocket, or client-side autorefresh
// - handle edge cases: no media playing, receiver off, source is not spotify/applemusic/etc
// - make the get response wait for heos to finish retrieving metadata