var serverEvents = new EventSource('http://localhost:5555/stream')
const body = document.getElementById('changeMe')

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
		// start sleep timer if no album art is shown on start up:
		if (!body.style.backgroundImage.includes("http")) {
			sleepTimer()
		}
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
	} else if (!isSleeping && count != 0) {
		console.log("Event contains valid url, sleep countdown interrupted.")
		stopCount()
	} else if (isSleeping) {
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
	body.innerHTML = "Sleeping in... " + countdown
	count++
	if (count == secondsToSleep) {
		sleep()
	} else {
		// with parantheses after timedCount, everything happens immediately and not once every second...
		timer = setTimeout(sleepTimer, 1000)
	}
}
function stopCount() {
	clearTimeout(timer)
	count = 0
	console.log("Sleep timer stopped and reset.")
	if (!isSleeping) {
		body.innerHTML = ""
	}
}
function sleep() {
	isSleeping = true
	console.log(`Counter has reached ${secondsToSleep} seconds, going to sleep now...`)
	console.log("Sleeping... 😴")
	body.innerHTML = "zzzzzzzzzzzzzzz"
	stopCount()
}
function wakeUp() {
	isSleeping = false
	console.log("Waking up...")
	body.innerHTML = ""
}