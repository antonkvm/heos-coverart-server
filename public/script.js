var serverEvents = new EventSource('http://localhost:5555/stream')
const body = document.getElementById('changeMe')
const msg = document.getElementById('heading')

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
		// show friendly start up message:
		setMsgText("HEOS Cover Art Server started!\n\n To start showing cover art, play or skip to a song.")
})

serverEvents.onmessage = (event) => {
	console.log("Event received!")
	console.log('Event data: ' + event.data)
	
	body.style.backgroundImage = 'url(' + event.data + ')'
	
	// note: empty event.data isn't actually empty, it contains two quotes: ""
	if (event.data == "\"\"" && !isSleeping && count == 0) {
		console.log("Event contains no url, starting sleep timer...")
		sleepTimer()
	} else if (event.data == "\"\"" && !isSleeping && count != 0) {
		console.log("Event contains no url, sleep timer continueing...")
	} else if (event.data == "\"\"" && isSleeping) {
		console.log("Event contains no url, staying asleep...")
	} else if (!isSleeping && count == 0) {
		console.log("Event contains valid url, updating cover art...")
		setMsgText("")
	} else if (!isSleeping && count != 0) {
		console.log("Event contains valid url, sleep countdown interrupted.")
		stopCounter()
	} else if (isSleeping) {
		console.log("Event contains valid url, waking up...")
		wakeUp()
	}
}

var count = 0
var timer
const secondsToSleep = 20
var isSleeping = false

function sleepTimer() {
	let countdown = secondsToSleep - count
	console.log("Sleeping in... " + countdown)
	setMsgText("Sleeping in... " + countdown)
	count++
	if (count == secondsToSleep) {
		sleep()
	} else {
		// with parantheses after timedCount, everything happens immediately and not once every second...
		timer = setTimeout(sleepTimer, 1000)
	}
}
function stopCounter() {
	clearTimeout(timer)
	count = 0
	console.log("Sleep timer stopped and reset.")
	if (!isSleeping) {
		setMsgText("")
		// body.innerHTML = ""
	}
}
function sleep() {
	isSleeping = true
	console.log(`Counter has reached ${secondsToSleep} seconds, going to sleep now...`)
	console.log("Sleeping... 😴")
	setMsgText("zzzzz")
	stopCounter()
}
function wakeUp() {
	isSleeping = false
	console.log("Waking up...")
	setMsgText("")
}

function setMsgText(someText) {
	msg.innerText = someText
}