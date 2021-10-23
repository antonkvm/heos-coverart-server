var serverEvents = new EventSource('http://localhost:5555/stream')
const body = document.querySelector('body')
const msgContainer = document.getElementById('messageContainer')
const msgTitle = document.querySelector('h1')
const msgBody = document.querySelector('p')
var firstConnection = true

// show/hide cursor on user click
body.addEventListener('click', (e) => {
	if (body.style.cursor == 'none') {
		body.style.cursor = 'default'
	} else {
		body.style.cursor = 'none'
	}
})

serverEvents.addEventListener('open', (event) => {
	console.log('SSE Verbindung wurde erfolgreich hergestellt.');
	// show friendly welcome message on first visit (only initial img elem won't have src attribute)
	if (firstConnection) {
		setMessageTitle("HEOS COVER ART SERVER")
		setMessageBody("Connection successful!\nTo start showing cover art, play or skip to a song")
	} else {
		setMessageTitle("Reconnect successfull!")
		setMessageBody("Play a new song to show cover art again.")
	}
	firstConnection = false
	firstErrorSinceLastConnect = true
})
serverEvents.onerror = (error) => {
	setMessageTitle('Connection to server lost')
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

	// *** States/events matrix and desired results (see PDF for more info) ***
	// Awake, non-counting client gets new album art, updates background:
	if (!isSleeping && !isCounting && msgHasValidData) {
		setImageUrl(message.image_url)
		// clear welcome message:
		setMessageTitle()
		setMessageBody()
	}
	// Awake, non-counting client gets message that AVR turned off and starts sleeptimer:
	if (!isSleeping && !isCounting && msgSaysStop) {
		setImageUrl()
		startTimer()
	}
	// Client counting down to sleep, but gets new album art, stops timer and updates background:
	if (!isSleeping && isCounting && msgHasValidData) {
		setImageUrl(message.image_url)
		stopTimer()
	}
	// Sleeping client gets woken up by new album art:
	if (isSleeping && !isCounting && msgHasValidData) {
		setImageUrl(message.image_url)
		wakeUp()
	}
}

/**
 * SLEEP TIMER
 * The code below handles the sleep timer functionality
 * @todo Modularize this functionality. Will probably also streamline code and expose some dumb shit
 * @todo Still some bugs in here with edge cases i think
 */

var timer
const secondsToSleep = 20
var count = 0
var remaining
var isSleeping = false

function startTimer() {
	setImageUrl()
	remaining = secondsToSleep - count
	console.log("Sleeping in... " + remaining)
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
	console.log(`Counter has reached ${secondsToSleep} seconds, going to sleep now...`)
	console.log("Sleeping... 😴")
	isSleeping = true
	setMessageTitle("😴")
	count = 0
}
function wakeUp() {
	console.log("Waking up...")
	isSleeping = false
	setMessageTitle("")
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
 * @param imageUrl The url to the new cover art image. Defaults to empty string.
 * @todo If url param is empty, image should immediately go to black, instead of on next img iteration
 */
function setImageUrl(imageUrl = '') {

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
function getImageUrl() {
	return Array.from(document.querySelectorAll('img')).pop().getAttribute('src')
}