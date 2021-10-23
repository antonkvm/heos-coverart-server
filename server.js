const heos = require('heos-api')
const express = require('express')
const app = express()
const PORT = 5555
const SSE = require('express-sse')
const sse = new SSE()
app.get('/stream', sse.init)
var previous
var firstTime = true

HEOS = heos.discoverAndConnect()
HEOS.then(connection => connection
	.write('system', 'register_for_change_events', {enable: 'on'})
	.write('system', 'prettify_json_response', {enable: 'on'})
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
			let payload = response.payload
			// Some actions in the spotify app cause erroneous empty events being sent, preventing this with:
			// Also only send new metadata when it is different from the previous one, or the first one:
			if (payload.artist != '' && firstTime) {
				previous = payload
				firstTime = false
				console.log(payload)
				sse.send(payload)
			} else if (payload.artist != '' && !firstTime && payload.song != previous.song) {
				previous = payload
				console.log(payload)
				sse.send(payload)
			}
		}
	)
	.on({
			commandGroup: 'event',
			command: 'player_state_changed'
		},
		response => {
			let state = response.heos.message.parsed.state
			console.log(state)
			if (state == 'stop') sse.send({stopped: 'stopped'})
		}
	)
)

app.use(express.static('public'))

app.listen(PORT, () => console.log("Server is now listening to port %d.", PORT))