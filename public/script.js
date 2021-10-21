var serverEvents = new EventSource('http://localhost:5555/stream')
const body = document.getElementById('changeMe')

serverEvents.addEventListener('open', (event) => {
		console.log('SSE Verbindung wurde erfolgreich hergestellt.');
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