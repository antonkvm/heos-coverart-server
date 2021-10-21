const heos = require('heos-api')
const express = require('express')
const app = express()
const PORT = 5555
const SSE = require('express-sse')
const sse = new SSE()
app.get('/stream', sse.init)
var media

HEOS = heos.discoverAndConnect()
HEOS.then(connection => connection
	.write('system', 'register_for_change_events', {enable: 'on'})
	// .write('player', 'get_now_playing_media', {pid: 781222528})
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
			// Some actions in the spotify app cause erroneous now_playing change events with empty urls.
			// The following code prevents these faulty events from triggering a server sent event.
			if (response.payload.image_url != "") {
				media = response.payload
				sse.send(media.image_url)
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
			if (state == 'stop') {
				sse.send('')
			}
		}
	)
)

app.use(express.static('public'))

// app.get('/', (req, res) => {
// 	res.set('Content-Type', 'text/html')
// 	res.sendFile(__dirname + '/index.html')
// })

app.listen(PORT, () => console.log("Server is now listening to port %d.", PORT))