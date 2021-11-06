var serverEvents = new EventSource('http://localhost:5555/stream')
const body = document.querySelector('body')
const container = document.getElementById('container')
const msgTitle = document.querySelector('h1')
const msgBody = document.querySelector('p')
var firstConnection = true
var currentImageURL = ''
// set this to true if you want a fading transition between cover art images:
const fadingOn = false

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
	setImageUrl()
}

serverEvents.onmessage = (event) => {
	console.log("Event received! Message:")
	let message = JSON.parse(event.data)
	console.log(message)

	// if message contains valid data:
	if (('artist' in message) && message.artist != '') {

		if (message.mid == 'Airplaysfsd') {
			// save artist/album and replace any whitespace with a plus (so it's ready for URI insertion)
			let artistParsed = message.artist.replace(/\s/g, '+')
			let albumParsed = message.album.replace(/\s/g, '+')
			let itunesSearchUrl = `https://itunes.apple.com/search?term=${artistParsed}+${albumParsed}&limit=1`
			let itunesImageUrl = 'https://a1.mzstatic.com/us/r1000/063/'
		
			// search for artist/album with itunes API, take first result, build proper itunesImageUrl
			$.getJSON(itunesSearchUrl, (data) => {
				itunesImageUrl += data.results[0].artworkUrl100.slice(41, -14)
				goThruStateEventMatrix(message, itunesImageUrl)
			})
		} else {
			goThruStateEventMatrix(message, message.image_url)
		}

	} 
	else if ('stopped' in message) {
		// Awake, non-counting client gets message that AVR turned off, starts sleeptimer:
		if (!isSleeping && !isCounting) {
			setImageUrl()
			setMessageBody()
			startTimer()
			setMessageBody('Music playback was stopped.')
		}
	} 
	// if server lost connection to HEOS device:
	else if ('disconnected' in message) {
		setImageUrl()
		startTimer()
		if (message.disconnected == 'closedWithError') {
			setMessageBody('Connection to HEOS device was closed with transmission error.')
		} else if (message.disconnected == 'closedWithoutError') {
			setMessageBody('Connection to HEOS device was closed without transmission error.')
		}
	}
	// no heos device found on network:
	else if ('noHEOSFoundOnNetwork' in message) {
		setImageUrl()
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
	if (!isSleeping) setMessageTitle()
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
 * Replaces the current cover art image with a new one.
 * If the passed URL is empty, screen goes black. If not, any black overlay is removed.
 * If the passed URL is the same as the one currently shown, no DOM changes are made.
 * @param imageUrl The url to the new cover art image. Defaults to empty string.
 */
function setImageUrl(imageUrl = '') {

	// go to black screen when imageUrl is empty (default behavior when no parameter provided):
	if (imageUrl == '') {
		container.style.backgroundColor = 'black'
	} else {
		// when imageUrl is not empty, remove black screen:
		container.style.removeProperty('background-color')

		// only update image if it's a new one:
		if (imageUrl != currentImageURL) {

			// save current image URL:
			currentImageURL = imageUrl

			// if fading is turned off -> no transition effect
			if (!fadingOn) {
				document.querySelector('img').setAttribute('src', imageUrl)				
			} else {
				let oldElem = document.querySelector('img')
				let newElem = document.createElement('img')
				
				// style new image, initially hidden by js-hide class:
				newElem.setAttribute('src', imageUrl)
				newElem.classList.add('js-hide')
			
				// insert before message container:
				body.insertBefore(newElem, container)
				
				/**
				 * Wait for new image to load, then start transition to reveal/hide new/old image.
				 * I was to lazy to test if the load event actually fires, but it sure seems like it.
				 */
				newElem.onload = () => {
					oldElem.classList.add('js-hide')
					newElem.classList.remove('js-hide')
			
					setTimeout(() => {
						oldElem.remove()
					}, 1000)
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
}

/**
 * Go through the state event matrix and trigger desired actions accordingly.
 * Check PDF for more info.
 * @param message The SSE message as JSON.
 * @param itunesImageURL The URL that points to the album art image.
 */
function goThruStateEventMatrix(message, itunesImageURL) {
	let isCounting = count != 0

	// Awake, non-counting client gets new album art, updates background:
	if (!isSleeping && !isCounting) {
		setImageUrl(itunesImageURL)
		// clear welcome message:
		setMessageTitle()
		setMessageBody()
	}
	// Client counting down to sleep, but gets any (new or not) album art, stops timer and updates background:
	if (!isSleeping && isCounting) {
		setImageUrl(itunesImageURL)
		stopTimer()
	}
	// Sleeping client gets woken up by any (new or not) album art:
	if (isSleeping && !isCounting) {
		setImageUrl(itunesImageURL)
		wakeUp()
	}
}