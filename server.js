const heos = require('heos-api')
const express = require('express')
const app = express()
const PORT = 5555
const SSE = require('express-sse')
const sse = new SSE()
app.get('/stream', sse.init)
const { exec } = require('child_process')
var myPid

// maybe turn this off when testing stuff:
const backlightControlActive = true

connectToHEOS()

app.use(express.static('public'))

app.get('/', (req, res) => {
	res.set({
		'Cache-Control': 'no-cache, no-store, must-revalidate',
		'Pragma': 'no-cache',
		'Expires': 0
	})
})

app.listen(PORT, () => console.log("Server is now listening to port %d.", PORT))

// Sleep timer:
const secondsToSleep = 21
let count = 0
let timer = null
let remaining
let timerRunning = false

function startSleepTimer() {
	timerRunning = true
	remaining = secondsToSleep - count
	count++
	if (remaining == 0) {
		if (backlightControlActive) turnOffBacklight()
		count = 0
	} else {
		timer = setTimeout(startSleepTimer, 1000)
	}
}
function stopTimer() {
	clearTimeout(timer)
	timerRunning = false
	count = 0
}
function turnOnBacklight() {
	if (backlightControlActive) exec('sudo su -c "echo 1 > /sys/class/backlight/rpi_backlight/brightness"')
	console.log('Pi backlight turned on')
}
function turnOffBacklight() {
	if (backlightControlActive) exec('sudo su -c "echo 0 > /sys/class/backlight/rpi_backlight/brightness"')
	console.log('Pi backlight turned off')
}

function connectToHEOS() {
	heos.discoverAndConnect().then(connection => connection
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
					if (timerRunning) stopTimer()
					turnOnBacklight()
					sse.send(metadata)
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
					// start screen blanking countdown:
					if(!timerRunning) startSleepTimer()
					sse.send({stopped: 'stopped'})
				}
				// if music starts playing, request metadata and send it to client:
				if (state == 'play') {
					if (timerRunning) stopTimer()
					turnOnBacklight()
					connection.write('player', 'get_now_playing_media', {pid: myPid})
				}
			}
		)
		.onClose(hadError => {
			// start screen blanking countdown here
			if (!timerRunning) startSleepTimer()
			if (hadError) {
				sse.send({disconnected: 'closedWithError'})
			} else {
				sse.send({disconnected: 'closedWithoutError'})
			}
			// restart connection to HEOS here
			connectToHEOS()
		})
	)
}