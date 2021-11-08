import { setMessageBody, setMessageTitle } from "./script.js";

export let timer
export const secondsToSleep = 20
export let count = 0
export let remaining
export let isSleeping = false


export function start() {
	remaining = secondsToSleep - count
	setMessageTitle("Sleeping in... " + remaining)
	count++
	if (remaining == 0) {
		sleep()
	} else {
		// with parantheses after timedCount, everything happens immediately and not after timeout.
		timer = setTimeout(start, 1000)
	}
}

export function stop() {
	console.log("Sleep timer stopped and reset.")
	clearTimeout(timer)
	count = 0
	if (!isSleeping) {
		setMessageTitle()
		setMessageBody()
	}
}

export function sleep() {
	isSleeping = true
	setMessageTitle("😴")
	setMessageBody()
	count = 0
}

export function wakeUp() {
	console.log("Waking up...")
	isSleeping = false
	setMessageTitle()
	count = 0
}
export function isCounting() {
	return count != 0
}

