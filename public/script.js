let serverEvents = new EventSource('http://localhost:5555/stream')
const body = document.querySelector('body')
const container = document.getElementById('container')
var firstConnection = true
var currentMetadata

serverEvents.onopen = (event) => {
	container.classList.add('js-gradientBackdrop')
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
	if (typeof newMetadata === 'undefined') {
		// container.style.backgroundColor = 'black'
		container.classList.add('js-gradientBackdrop')
		$('#shadow-overlay').hide()
	} else {
		container.style.removeProperty('background-color')
		container.classList.remove('js-gradientBackdrop')
		$('#shadow-overlay').show()
		// if new or first song:
		if (typeof currentMetadata === 'undefined' || newMetadata.album != currentMetadata.album) {
			currentMetadata = newMetadata
			// wait 2 seconds bc with airplay, img_src can be slow to update. Avoids img load errors.
			setTimeout(() => {
				$('img').attr('src', newMetadata.image_url + '?t=' + new Date().getTime())
				setTrackInfo(newMetadata)
			}, 2*1000);
		}
		// if same song, only remove black screen (above) and show trackinfo again. Needed after sleep timer.
		else {
			setTrackInfo(newMetadata)
		}
	}
}

/** Makes the background go black.  */
function clearScreen() {
	updateScreen()
}