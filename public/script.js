import * as sleepTimer from './sleepTimer.js';
let serverEvents = new EventSource('http://localhost:5555/stream')
const body = document.querySelector('body')
const container = document.getElementById('container')
var firstConnection = true
var currentMetadataJSON

serverEvents.onopen = (event) => {
	if (firstConnection) {
		console.log('SSE Verbindung wurde erfolgreich hergestellt.')
		// "Welcome" screen:
		setMessageTitle("HEOS COVER ART SERVER")
		setMessageBody("Connection successful!\nTo start showing cover art, play a song.")
		firstConnection = false
	} else {
		console.log('SSE Verbindung wurde erfolgreich wiederhergestellt.')
		// "Reconnect successful" screen:
		setMessageTitle("Successfully reconnected to nodeJS server!")
		setMessageBody("To show cover art again, press play on any song.")
	}
	// hide lil speck of devider line:
	$('hr').hide()
}

// "disconnected from nodeJS server" screen:
serverEvents.onerror = (error) => {
	console.log("SSE error detected.")
	console.log(error)
	sleepTimer.stop()
	setMessageTitle('Connection to nodeJS server lost!')
	setMessageBody('Trying to reconnect...')
	updateScreen()
	clearTrackInfo()
}

serverEvents.onmessage = (event) => {
	console.log("Event received! Message:")
	let message = JSON.parse(event.data)
	console.log(message)

	// if message contains valid data:
	if (('artist' in message) && message.artist != '') {
		processValidSSE(message, sleepTimer.isCounting(), sleepTimer.isSleeping)
	}
	else if ('stopped' in message) {
		// Awake, non-counting client gets message that AVR turned off, starts sleeptimer:
		if (!sleepTimer.isSleeping && !sleepTimer.isCounting()) {
			updateScreen()
			setMessageBody()
			sleepTimer.start()
			setMessageBody('Music playback was stopped.')
			clearTrackInfo()
		}
	} 
	// if server lost connection to HEOS device:
	else if ('disconnected' in message) {
		updateScreen()
		setMessageTitle()
		clearTrackInfo()
		sleepTimer.start()
		if (message.disconnected == 'closedWithError') {
			setMessageBody('Connection to HEOS device was closed with transmission error.')
		} else if (message.disconnected == 'closedWithoutError') {
			setMessageBody('Connection to HEOS device was closed without transmission error.')
		}
	}
	// no heos device found on network:
	else if ('noHEOSFoundOnNetwork' in message) {
		updateScreen()
		clearTrackInfo()
		setMessageTitle('No HEOS device found on network!')
		setMessageBody('Check if the device is plugged into power and connected with the network, then restart the server via SSH.')
	}
}

export function setMessageTitle(someText = '') {
	$('#msg-title').text(someText)
	// document.getElementById('msg-title').innerText = someText
}
export function setMessageBody(someText = '') {
	$('#msg-body').text(someText)
}

/**
 * Change the song and artist displayed on screen.
 * @param {object} metadata The metadata as JSON containing song and artist.
 */
function setTrackInfo(metadata) {
	$('#song').text(metadata.song)
	$('#artist').text(metadata.artist)
	$('hr').show()
}

/** Clears any text currently shown in trackinfo div. */
function clearTrackInfo() {
	$('#song').text('')
	$('#artist').text('')
	$('hr').hide()
}

/**
 * Update the screen with new album art and trackinfo.
 * If no parameter is passed into the function or the parameter is undefined, the screen will go black.
 * @param {object} metadataJSON JSON object containing the metadata of the new song, as HEOS supplies it.
 */
function updateScreen(metadataJSON) {

	// go to black screen when no parameter passed into function:
	if (typeof metadataJSON === 'undefined') {
		container.style.backgroundColor = 'black'
	} 
	else {
		
		// when metadataJSON is not empty, remove black screen:
		container.style.removeProperty('background-color')

		// update image and trackinfo if it's the first OR a new album:
		if (typeof currentMetadataJSON === 'undefined' || metadataJSON.album != currentMetadataJSON.album) {

			// save current metadata:
			currentMetadataJSON = metadataJSON

			let oldElem = document.querySelector('img')
			let newElem = document.createElement('img')
			
			// new image initially hidden by js-hide class:
			newElem.classList.add('js-hide')
			
			// Set Eventlistener: new image load -> then remove old image, reveal new image, and update trackinfo.
			// Seting this event listener before setting the src attribute so it actually works.
			newElem.onload = () => {
				oldElem.remove()
				newElem.classList.remove('js-hide')
				setTrackInfo(metadataJSON)
			}

			// insert before message container:
			body.insertBefore(newElem, container)
			
			/* 
			 * Set img src attribute to image_url, with timestamp appended as dummy query:
			 * The dummy query makes the url always unique, which avoids a bug on some browsers when using airplay.
			 * The image url with airplay never changes, it's always '<avr-ip>/airplay/albumart', only  the image
			 * behind it changes. Some browsers don't reload the image if the url doesn't change, so we make the url
			 * unique without changing where it actually points to.
			*/
			newElem.src = metadataJSON.image_url + '?t=' + new Date().getTime()


			// flush unnecessary img elements if need be:
			if (document.querySelectorAll('img').length > 2) {
				let deletable = Array.from(document.querySelectorAll('img'))
				deletable.pop()
				deletable.map(node => node.remove())
			}
		}
		else {
			// Update trackinfo, but not image, even if metadata is not new.
			// Necessary bc sleepTimer clears trackinfo while not changing currentMetadata (-> above if not triggered).
			setTrackInfo(metadataJSON)
		}
	}
}

/**
 * Takes a valid SSE message and decides how to react to it, depending on the servers current state (e.g. sleeping / awake).
 * Function needs isCounting and isSleeping as arguments to correctly decide on an action.
 * @param {object} message [object] The SSE message as JSON.
 * @param {boolean} isCounting [boolean] Should be set to true if the counter is counting (count is not zero).
 * @param {boolean} isSleeping [boolean] Please write the current isSleeping boolean value into this parameter.
 */
function processValidSSE(message, isCounting, isSleeping) {

	// Awake, non-counting client gets new album art, updates background:
	if (!isSleeping && !isCounting) {
		updateScreen(message)
		// clear welcome message:
		setMessageTitle()
		setMessageBody()
	}
	// Client counting down to sleep, but gets any (new or not) album art, stops timer and updates background:
	if (!isSleeping && isCounting) {
		updateScreen(message)
		sleepTimer.stop()
	}
	// Sleeping client gets woken up by any (new or not) album art:
	if (isSleeping && !isCounting) {
		updateScreen(message)
		sleepTimer.wakeUp()
	}
}