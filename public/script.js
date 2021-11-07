var serverEvents = new EventSource('http://localhost:5555/stream')
const body = document.querySelector('body')
const container = document.getElementById('container')
const msgTitle = document.querySelector('h1')
const msgBody = document.querySelector('p')
var firstConnection = true
var currentMetadataJSON
// set this to true if you want a fading transition between cover art images:

serverEvents.addEventListener('open', (event) => {
	console.log('SSE Verbindung wurde erfolgreich hergestellt.');
	if (firstConnection) {
		// "Welcome" screen:
		setMessageTitle("HEOS COVER ART SERVER")
		setMessageBody("Connection successful!\nTo start showing cover art, play a song.")
	} else {
		// "Reconnect successful" screen:
		setMessageTitle("Successfully reconnected to nodeJS server!")
		setMessageBody("To show cover art again, press play on any song.")
	}
	firstConnection = false
})
// "disconnected from nodeJS server" screen:
serverEvents.onerror = (error) => {
	stopTimer()
	setMessageTitle('Connection to nodeJS server lost!')
	setMessageBody('Trying to reconnect...')
	updateImage()
	clearTrackInfo()
}

serverEvents.onmessage = (event) => {
	console.log("Event received! Message:")
	let message = JSON.parse(event.data)
	console.log(message)

	var isCounting = count != 0

	// if message contains valid data:
	if (('artist' in message) && message.artist != '') {
		goThruStateEventMatrix(message, isCounting)

	}
	else if ('stopped' in message) {
		// Awake, non-counting client gets message that AVR turned off, starts sleeptimer:
		if (!isSleeping && !isCounting) {
			updateImage()
			setMessageBody()
			startTimer()
			setMessageBody('Music playback was stopped.')
			clearTrackInfo()
		}
	} 
	// if server lost connection to HEOS device:
	else if ('disconnected' in message) {
		updateImage()
		setMessageTitle()
		clearTrackInfo()
		startTimer()
		if (message.disconnected == 'closedWithError') {
			setMessageBody('Connection to HEOS device was closed with transmission error.')
		} else if (message.disconnected == 'closedWithoutError') {
			setMessageBody('Connection to HEOS device was closed without transmission error.')
		}
	}
	// no heos device found on network:
	else if ('noHEOSFoundOnNetwork' in message) {
		updateImage()
		clearTrackInfo()
		setMessageTitle('No HEOS device found on network!')
		setMessageBody('Check if the device is plugged into power and connected with the network, then restart the server via SSH.')
	}
}

/**
 * SLEEP TIMER
 * The code below handles the sleep timer functionality
 */

var timer
const secondsToSleep = 20
var count = 0
var remaining
var isSleeping = false

function startTimer() {
	remaining = secondsToSleep - count
	setMessageTitle("Sleeping in... " + remaining)
	count++
	if (remaining == 0) {
		sleep()
	} else {
		// with parantheses after timedCount, everything happens immediately and not once every second...
		timer = setTimeout(startTimer, 1000)
	}
}
function stopTimer() {
	console.log("Sleep timer stopped and reset.")
	clearTimeout(timer)
	count = 0
	if (!isSleeping) {
		setMessageTitle()
		setMessageBody()
	}
}
function sleep() {
	isSleeping = true
	setMessageTitle("😴")
	setMessageBody()
	count = 0
}
function wakeUp() {
	console.log("Waking up...")
	isSleeping = false
	setMessageTitle()
	count = 0
}

// default parameter value is empty string:
function setMessageTitle(someText = '') {
	msgTitle.innerText = someText
}
function setMessageBody(someText = '') {
	msgBody.innerText = someText
}
/**
 * Change the song and artist displayed on screen.
 * @param {object} metadata The metadata as JSON containing song and artist.
 */
function setTrackInfo(metadata) {
	// $('#trackinfo').html(`${metadata.song} &ndash; ${metadata.artist}`)
	$('#song').text(metadata.song)
	$('#artist').text(metadata.artist)
}
function clearTrackInfo() {
	// $('#trackinfo').html('')
	$('#song').text('')
	$('#artist').text('')
}

/**
 * Replaces the current cover art image with a new one.
 * If the passed URL is empty, screen goes black. If not, any black overlay is removed.
 * If the passed URL is the same as the one currently shown, no DOM changes are made.
 * @param {object} metadataJSON JSON containing the metadata of the new song, as HEOS supplies it.
 */
function updateImage(metadataJSON) {

	// go to black screen when no parameter passed into function:
	if (typeof metadataJSON === 'undefined') {
		container.style.backgroundColor = 'black'
	} else {
		
		// when metadataJSON is not empty, remove black screen:
		container.style.removeProperty('background-color')

		// only update image if it's the first OR a new album:
		if (typeof currentMetadataJSON === 'undefined' || metadataJSON.album != currentMetadataJSON.album) {

			// save current metadata:
			currentMetadataJSON = metadataJSON

			let oldElem = document.querySelector('img')
			let newElem = document.createElement('img')
			
			// new image initially hidden by js-hide class:
			newElem.classList.add('js-hide')

			// set image url as source of new image:
			newElem.setAttribute('src', metadataJSON.image_url)
			// insert before message container:
			body.insertBefore(newElem, container)
			
			// Wait for new image to load, then remove old image and reveal new image.
			newElem.onload = () => {
				oldElem.remove()
				newElem.classList.remove('js-hide')
				setTrackInfo(metadataJSON)
			}
			// flush unnecessary img elements if need be:
			if (document.querySelectorAll('img').length > 2) {
				let deletable = Array.from(document.querySelectorAll('img'))
				deletable.pop()
				deletable.map(node => node.remove())
			}
		
		}
	}
}

/**
 * Go through the state event matrix and trigger desired actions accordingly.
 * Check PDF for more info.
 * @param message The SSE message as JSON.
 * @param isCounting Boolean. Should be set to true when the counter is counting.
 */
function goThruStateEventMatrix(message, isCounting) {
	// let isCounting = count != 0

	// Awake, non-counting client gets new album art, updates background:
	if (!isSleeping && !isCounting) {
		updateImage(message)
		// clear welcome message:
		setMessageTitle()
		setMessageBody()
	}
	// Client counting down to sleep, but gets any (new or not) album art, stops timer and updates background:
	if (!isSleeping && isCounting) {
		updateImage(message)
		stopTimer()
	}
	// Sleeping client gets woken up by any (new or not) album art:
	if (isSleeping && !isCounting) {
		updateImage(message)
		wakeUp()
	}
}