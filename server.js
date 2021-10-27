const heos = require('heos-api')
const express = require('express')
const app = express()
const PORT = 5555
const SSE = require('express-sse')
const sse = new SSE()
app.get('/stream', sse.init)
const { exec } = require('child_process')
var myPid

HEOS = heos.discoverAndConnect()
HEOS.then(connection => connection
	.write('system', 'register_for_change_events', {enable: 'on'})
	.write('system', 'prettify_json_response', {enable: 'on'})
	.write('player', 'get_players')
	.once({
			commandGroup: 'player',
			command: 'get_players'
		},
		res => {
			if (res.heos.result == 'success') {
				myPid = res.payload[0].pid
				console.log('HEOS device found! Here is its pid: ' + myPid)
			} else {
				sse.send({noHEOSFoundOnNetwork: true})
			}
		}
	)
	.on({	
			commandGroup: 'event',
			command: 'player_now_playing_changed'
		},
		res => {
			console.log("Event: now playing media changed")
			connection.write('player', 'get_now_playing_media', {pid: myPid})
		}
	)
	.on({
			commandGroup: 'player',
			command: 'get_now_playing_media'
		},
		res => {
			let metadata = res.payload
			// only send metadata if non-empty:
			if (metadata.artist != '') {
				sse.send(metadata)
				// stop any sleep timer and set backlight to 'on'
				stopCounting()
				beWoke()
			}
		}
	)
	.on({
			commandGroup: 'event',
			command: 'player_state_changed'
		},
		res => {
			let state = res.heos.message.parsed.state
			console.log(state)
			if (state == 'stop') {
				sse.send({stopped: 'stopped'})
				// start screen blanking countdown here
				startSleepTimer()
			}
			// if music starts playing, request metadata and send it to client:
			if (state == 'play') {
				connection.write('player', 'get_now_playing_media', {pid: myPid})
				// stop any sleep timer and set backlight to 'on'
				stopCounting()
				beWoke()
			}
		}
	)
	.onClose(hadError => {
		// --start screen blanking countdown here--
		if (hadError) {
			sse.send({disconnected: 'closedWithError'})
		} else {
			sse.send({disconnected: 'closedWithoutError'})
		}
	})
)

app.use(express.static('public'))

app.listen(PORT, () => console.log("Server is now listening to port %d.", PORT))

// Sleep timer:
const secondsToSleep = 22
let count = 0
let timer
let remaining

function startSleepTimer() {
	remaining = secondsToSleep - count
	count++
	if (remaining == 0) {
		exec("su -c 'echo 0 > /sys/class/backlight/rpi_backlight/brightness'")
		count = 0
	} else {
		timer = setTimeout(startSleepTimer, 1000)
	}
}
function stopCounting() {
	clearTimeout(timer)
	count = 0
}
function beWoke() {
	exec("su -c 'echo 1 > /sys/class/backlight/rpi_backlight/brightness'")
}