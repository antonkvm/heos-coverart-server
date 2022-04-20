const heos = require('heos-api')
const express = require('express')
const app = express()
const PORT = 5555
const { exec } = require('child_process')

let prevMetadata = null
let xResponse

// turn this off when testing locally:
const backlightControlActive = false

// serve index.html statically:
app.use(express.static('public'))

// initialize SSE server:
app.get('/stream', (req, res) => {
	res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush the headers to establish SSE with client

	// save response object globally bc the timer cant pass it into itself with setTimeout
	xResponse = res

	sendSSE({event: 'init'}, res)
	connectToHEOS(res)
	
})

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
	sendSSE({event: 'getting sleepy', remaining: remaining}, xResponse)
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
	if (backlightControlActive) exec('sudo su -c "echo 1 > /sys/class/backlight/rpi_backlight/brightness"')
	else console.log('Pi backlight turned on')
}
function turnOffBacklight() {
	if (backlightControlActive) exec('sudo su -c "echo 0 > /sys/class/backlight/rpi_backlight/brightness"')
	else console.log('Pi backlight turned off')
}
/**
 * Connects to HEOS device on network and listens. Receives events from HEOS device and sends it out as SSE message.
 * For this to work this function need the express response object as an argument.
 * @param {object} xRes The response object from the express middleware in which this function is called.
 * @todo xRes Parameter is sort of redundant as I was forced to save the express res object in a global variable for the sleeptimer anyways.
 */
function connectToHEOS(xRes) {
	var myPid
	heos.discoverAndConnect().then(connection => connection
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
			// restart connection to HEOS:
			// todo: reexaming this. Seems like multiple HEOS instances get started
			// connectToHEOS()
		})
	)
}