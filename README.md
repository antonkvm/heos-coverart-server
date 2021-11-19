# Heos Cover Art Server

A simple nodeJS server delivering a webpage showing albumart and trackinfo of the song currently playing on your HEOS device. Tested with Spotify and AirPlay. Webpage optimized for 720x720 square display.

## Dependencies
This package makes use of the [heos-api package by juliuscc](https://www.npmjs.com/package/heos-api) to communicate with the HEOS device, which made creating this project way simpler on my end, because I didn't have to worry at all about how to make a telnet connection work. Other than that is uses [express](https://www.npmjs.com/package/express) to answer GET-requests, and [express-sse](https://www.npmjs.com/package/express-sse) to send updates as [server-send events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) to the client aka the browser window that you'd see on the screen in the end.

## Installation
1. To do

## Usage
- To do

## Notes
- To Do

## Known issues
- Sometimes, the trackinfo text updates faster than the album art. I tried waiting for the 'onload' event of the image before updating the text, but that did not solve the issue on my pi zero setup.