var serverEvents = new EventSource('http://localhost:5555/stream')
const body = document.querySelector('body')
const msg = document.querySelector('h1')
const image = document.getElementById('daImage')

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
		// show friendly welcome message:
		setMsgText("HEOS COVER ART SERVER\n\nConnection successful!\nTo start showing cover art, play or skip to a song.")
})

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
		setImageSrc(message.image_url)
		// clear welcome message:
		setMsgText()
	}
	// Awake, non-counting client gets message that AVR turned off and starts sleeptimer:
	if (!isSleeping && !isCounting && msgSaysStop) {
		setImageSrc()
		startTimer()
	}
	// Client counting down to sleep, but gets new album art, stops timer and updates background:
	if (!isSleeping && isCounting && msgHasValidData) {
		setImageSrc(message.image_url)
		stopTimer()
	}
	// Sleeping client gets woken up by new album art:
	if (isSleeping && !isCounting && msgHasValidData) {
		setImageSrc(message.image_url)
		wakeUp()
	}
}

var timer
const secondsToSleep = 20
var count = 0
var remaining
var isSleeping = false

function startTimer() {
	remaining = secondsToSleep - count
	console.log("Sleeping in... " + remaining)
	setMsgText("Sleeping in... " + remaining)
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
	if (!isSleeping) setMsgText()
}
function sleep() {
	console.log(`Counter has reached ${secondsToSleep} seconds, going to sleep now...`)
	console.log("Sleeping... 😴")
	isSleeping = true
	setMsgText("😴")
	count = 0
}
function wakeUp() {
	console.log("Waking up...")
	isSleeping = false
	setMsgText("")
	count = 0
}

// default parameter value is empty string:
function setMsgText(someText = '') {
	msg.innerText = someText
}

function setImageSrc(imageUrl) {
	// body.style.backgroundImage = `url(${imageUrl})`
	image.style.backgroundImage = `url(${imageUrl})`
}