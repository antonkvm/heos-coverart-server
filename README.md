# Heos Cover Art Server

A simple nodeJS server delivering a webpage showing albumart and trackinfo of the song currently playing on your HEOS device. Tested with Spotify and AirPlay. Webpage optimized for 720x720 square display.

## Dependencies
This project makes use of the [heos-api package by juliuscc](https://www.npmjs.com/package/heos-api) to communicate with the HEOS device, which made creating this project way simpler on my end, because I didn't have to worry at all about how to make a telnet connection work. Other than that is uses [express](https://www.npmjs.com/package/express) to answer GET-requests, and [express-sse](https://www.npmjs.com/package/express-sse) to send updates as [server-send events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) to the client aka the browser window that you'd see on the screen in the end.

## How it works, briefly
The nodeJS server makes a connection to the HEOS device. Through this connection, the server gets the metadata of the currently streaming song, which it then sends to the client (the browser window). On the client side, this metadata is used to fetch the album art via the internet as well as display the song title and artist. The nodeJS server also receives information about the play state of the HEOS device, allowing it to power off the display backlight after a delay when music playback was stopped.
## Installation
1. To do

## Usage
- To do

## Notes
- To Do

## Known issues
- Sometimes, the trackinfo text updates faster than the album art. I tried waiting for the 'onload' event of the image before updating the text, but that did not solve the issue on my pi zero setup.