var serverEvents = new EventSource('http://localhost:5555/stream')
const body = document.querySelector('body')
const msgContainer = document.getElementById('messageContainer')
const msgTitle = document.querySelector('h1')
const msgBody = document.querySelector('p')
var firstConnection = true
var currentImageURL = ''
const fadingOn = false

serverEvents.addEventListener('open', (event) => {
	console.log('SSE Verbindung wurde erfolgreich hergestellt.');
	// show friendly welcome message on first visit (only initial img elem won't have src attribute)
	if (firstConnection) {
		setMessageTitle("HEOS COVER ART SERVER")
		setMessageBody("Connection successful!\nTo start showing cover art, play a song.")
	} else {
		setMessageTitle("Reconnect successfull!")
		setMessageBody("To show cover art again, either press play on any song.")
	}
	firstConnection = false
	firstErrorSinceLastConnect = true
})
serverEvents.onerror = (error) => {
	setMessageTitle('Connection to node.js server lost')
	setMessageBody('Trying to reconnect...')
	setImageUrl()
}

serverEvents.onmessage = (event) => {
	console.log("Event received! Message:")
	let message = JSON.parse(event.data)
	console.log(message)

	let isCounting = count != 0
	let msgHasValidData = ('artist' in message) && message.artist != ''
	let msgSaysStop = 'stopped' in message

	/**  States/events matrix and desired results (see PDF for more info)  **/
	// Awake, non-counting client gets new album art, updates background:
	if (!isSleeping && !isCounting && msgHasValidData) {
		setImageUrl(message.image_url)
		// clear welcome message:
		setMessageTitle()
		setMessageBody()
	}
	// Awake, non-counting client gets message that AVR turned off, starts sleeptimer:
	if (!isSleeping && !isCounting && msgSaysStop) {
		setImageUrl()
		setMessageBody()
		startTimer()
	}
	// Client counting down to sleep, but gets any (new or not) album art, stops timer and updates background:
	if (!isSleeping && isCounting && msgHasValidData) {
		setImageUrl(message.image_url)
		stopTimer()
	}
	// Sleeping client gets woken up by any (new or not) album art:
	if (isSleeping && !isCounting && msgHasValidData) {
		setImageUrl(message.image_url)
		wakeUp()
	}
	// if server lost connection to HEOS device:
	if ('disconnected' in message) {
		setImageUrl()
		startTimer()
		if (message.disconnected == 'closedWithError') {
			setMessageBody('Connection to HEOS device was closed with transmission error.')
		} else if (message.disconnected == 'closedWithoutError') {
			setMessageBody('Connection to HEOS device was closed without transmission error.')
		}
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
	if (count == secondsToSleep) {
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

	// go to black screen when imageUrl is empty:
	if (imageUrl == '') {
		msgContainer.style.backgroundColor = 'black'
	} else {
		// when imageUrl is not empty, remove black screen:
		msgContainer.style.removeProperty('background-color')

		// if fading is turned off -> no transition effect
		if (fadingOn) {
			// only update image if it's a new one:
			if (imageUrl != currentImageURL) {
				// save current image URL:
				currentImageURL = imageUrl
	
				let oldElem = document.querySelector('img')
				let newElem = document.createElement('img')
				
				// style new image, initially hidden by js-hide class:
				newElem.setAttribute('src', imageUrl)
				newElem.classList.add('js-hide')
			
				// insert before message container:
				body.insertBefore(newElem, msgContainer)
				
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

		} else {
			document.querySelector('img').setAttribute('src', imageUrl)
		}

	}

}
function getImageUrl() {
	return Array.from(document.querySelectorAll('img')).pop().getAttribute('src')
}