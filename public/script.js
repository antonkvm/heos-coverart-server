let serverEvents = new EventSource('http://localhost:5555/stream')
const body = document.querySelector('body')
const container = document.getElementById('container')
var firstConnection = true
var currentMetadata

serverEvents.onopen = (event) => {
	if (firstConnection) {
		console.log('SSE Verbindung wurde erfolgreich hergestellt.')
		setMessageTitle("HEOS COVER ART SERVER")
		setMessageBody("Connection successful!\nTo start showing cover art, press play on a song.")
		firstConnection = false
	} else {
		console.log('SSE Verbindung wurde erfolgreich wiederhergestellt.')
		setMessageTitle("Successfully reconnected to nodeJS server!")
		setMessageBody("To show cover art again, press play on any song.")
	}
	// hide lil speck of devider line:
	$('hr').hide()
}

serverEvents.onmessage = (event) => {
	let data = JSON.parse(event.data)
	switch (data.event) {
		case 'init':
			console.log('Received initialization SSE from server.')
			break
		case 'noHeosFound':
			clearScreen()
			clearTrackInfo()
			setMessageTitle('No HEOS device found on network :(')
			setMessageBody('Check if the device is plugged into power and connected with the network')
			break
		case 'new metadata':
			updateScreen(data.payload)
			clearMessageTitle()
			clearMessageBody()
			break
		case 'getting sleepy':
			clearScreen()
			clearTrackInfo()
			setMessageTitle('Sleeping in ' + data.remaining)
			setMessageBody('Music playback has been stopped.')
			break
		default:
			break
	}
}

// "disconnected from nodeJS server" screen:
serverEvents.onerror = (error) => {
	console.log('SSE error detected!')
	setMessageTitle('SSE error :(')
	setMessageBody('Trying to reconnect...') // fun fact: firefox doesn't auto-reconnect, but needs a page refresh.
	updateScreen()
	clearTrackInfo()
}






/* --------------------------------------------- FUNCTIONS: --------------------------------------------- */

/**
 * Set the screen title message to a given string. Defaults to clearing the message if no string is passed.
 * @param {string} someText 
 */
function setMessageTitle(someText = '') {
	$('#msg-title').text(someText)
	// document.getElementById('msg-title').innerText = someText
}
/**
 * Set the screen body message to a given string. Defaults to clearing the message if no string is passed.
 * @param {string} someText 
 */
function setMessageBody(someText = '') {
	$('#msg-body').text(someText)
}
function clearMessageTitle() {
	setMessageTitle()
}
function clearMessageBody() {
	setMessageBody()
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
 * @param {object} newMetadata Object containing the metadata of the new song, as HEOS supplies it.
 */
function updateScreen(newMetadata) {
	if (typeof newMetadata === 'undefined') container.style.backgroundColor = 'black'
	else {
		container.style.removeProperty('background-color')
		if (typeof currentMetadata === 'undefined' || newMetadata.album != currentMetadata.album) {
			currentMetadata = newMetadata
			let oldElem = document.querySelector('img')
			let newElem = document.createElement('img')
			newElem.classList.add('js-hide')
			newElem.onload = () => {
				oldElem.remove()
				newElem.classList.remove('js-hide')
				setTrackInfo(newMetadata)
			}
			body.insertBefore(newElem, container)
			// make src url always unique bc some browsers won't reload otherwise:
			newElem.src = newMetadata.image_url + '?t=' + new Date().getTime()
			// flush unnecessary img elements if need be:
			if (document.querySelectorAll('img').length > 2) {
				let deletable = Array.from(document.querySelectorAll('img'))
				deletable.pop()
				deletable.map(node => node.remove())
			}
		}
		else {
			// Update trackinfo, but not image, even if metadata is not new.
			// Necessary bc sleepTimer clears trackinfo while not changing currentMetadata (-> above IF not triggered).
			setTrackInfo(newMetadata)
		}
	}
}

/** Makes the background go black.  */
function clearScreen() {
	updateScreen()
}