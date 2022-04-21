const heos = require('heos-api')
const express = require('express')
const app = express()
const PORT = 5555
const { exec } = require('child_process')

let prevMetadata = null
let xRes

// turn this off when testing locally:
const backlightControlActive = true

// make sure backlight is initially always on, so declaring backlightOn as true actually is true.
if (backlightControlActive) exec('sudo su -c "echo 1 > /sys/class/backlight/rpi_backlight/brightness"')
let backlightOn = true

app.use(express.static('public'))
connectToHeosAndCreateSSEConnection()
app.listen(PORT, () => console.log("Server is now listening to port %d.", PORT))






/* --------------------------------------------- FUNCTIONS: --------------------------------------------- */


/**
 * Takes an input, slaps the SSE notation stuff on it, and sends it off as a string.
 * @param {object} msg A message to be sent as SSE. Should be an object.
 * @param {object} res The response object of the express middleware. Needed to actually send the SSE message.
 * @throws Throws an error if input type is not an object or null.
 */
function sendSSE(msg, res) {
	let delimiter = '\n\n'
	if (typeof msg === 'object' && msg !== null) res.write('data: ' + JSON.stringify(msg) + delimiter)
	else throw TypeError
}

// Sleep timer:
const secondsToSleep = 21
let count = 0
let timer = null
let remaining
let timerRunning = false
function startSleepTimer() {
	timerRunning = true
	remaining = secondsToSleep - count
	sendSSE({event: 'getting sleepy', remaining: remaining}, xRes)
	count++
	if (remaining == 0) {
		// todo: send 'zzz' as SSE message?
		turnOffBacklight()
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
	if (!backlightOn) {
		if (backlightControlActive) exec('sudo su -c "echo 1 > /sys/class/backlight/rpi_backlight/brightness"')
		else console.log('Pi backlight turned on')
		backlightOn = true
	}
}
function turnOffBacklight() {
	if (backlightOn) {
		if (backlightControlActive) exec('sudo su -c "echo 0 > /sys/class/backlight/rpi_backlight/brightness"')
		else console.log('Pi backlight turned off')
		backlightOn = false
	}
}
/**
 * Connects to HEOS device on network and initializes an SSE connection if successful.
 * Listens on the HEOS device for relevant events and sends them to the client as SSE message.
 */
function connectToHeosAndCreateSSEConnection() {
	let myPid
	heos.discoverAndConnect().then(connection => {
		// initialize SSE server:
		app.get('/stream', (req, response) => {
			response.setHeader('Cache-Control', 'no-cache');
			response.setHeader('Content-Type', 'text/event-stream');
			response.setHeader('Access-Control-Allow-Origin', '*');
			response.setHeader('Connection', 'keep-alive');
			response.flushHeaders(); // flush the headers to establish SSE with client
			xRes = response
			sendSSE({event: 'init'}, response)
		})
		connection
			.write('system', 'register_for_change_events', {enable: 'on'})
			.write('system', 'prettify_json_response', {enable: 'on'})
			.write('player', 'get_players')
			.once({commandGroup: 'player', command: 'get_players'}, res => {
				if (res.heos.result == 'success') {
					myPid = res.payload[0].pid
					console.log("HEOS device found. Its PID is: " + myPid)
				} else {
					sendSSE({event: 'noHeosFound'}, xRes)
					console.log("no HEOS device found on network :(")
				}
			})
			.on({commandGroup: 'event', command: 'player_now_playing_changed'}, res => {
				connection.write('player', 'get_now_playing_media', {pid: myPid})
			})
			.on({commandGroup: 'player', command: 'get_now_playing_media'}, res => {
				let metadata = res.payload
				if (prevMetadata == null || (metadata.mid != prevMetadata.mid && metadata.artist != '') ) {
					prevMetadata = metadata
					if (timerRunning) stopTimer()
					turnOnBacklight()
					sendSSE({event: 'new metadata', payload: metadata}, xRes)
				}
			})
			.on({commandGroup: 'event',command: 'player_state_changed'}, res => {
				let state = res.heos.message.parsed.state
				console.log(state)
				if (state == 'stop' && !timerRunning) {
					startSleepTimer()
				}
				if (state == 'play') {
					if (timerRunning) {
						stopTimer()
						prevMetadata = null
					}
					turnOnBacklight()
					connection.write('player', 'get_now_playing_media', {pid: myPid})
				}
			})
			.onClose(hadError => {
				// start screen blanking countdown here
				if (!timerRunning) startSleepTimer()
				if (hadError) console.log('Closed Heos Connection with error.')
				else console.log('Closed Heos Connection without error.')
				// todo: reconnect to HEOS, close current event stream with res.end, bc new stream will be created?
				xRes.end()
				connectToHeosAndCreateSSEConnection()
			})
	})
}