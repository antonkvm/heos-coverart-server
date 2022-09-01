# Heos Cover Art Server

A simple nodeJS server delivering a webpage showing albumart and trackinfo of the song currently playing on your HEOS device. I created this application with the intention of running it on a Raspberry Pi Zero with a Pimeroni Hyperpixel Square display attached.

## Dependencies

Because Denon/Heos APIs are accessed via Telnet, and I didn't want to bother figuring that out, I made use of the very well-made [heos-api package](https://www.npmjs.com/package/heos-api) by [juliuscc](https://github.com/juliuscc). Basically, this package took care of what would probably have been the most challenging part of this project. Thanks!

Besides that, this project also uses [express](https://www.npmjs.com/package/express) to serve the static HTML/CSS webpage, as well as creating the event stream that updates said webpage with the info received from the AVR via the heos-api package.

I used to use the [express-sse](https://www.npmjs.com/package/express-sse) package to handle the event stream stuff, but as it's not well maintained, it eventually stopped working and broke my application. Luckily, this forced me to learn that event streams and server-sent events aren't that hard to set up yourself, which I did (in express) after removing the package.

## How it works, briefly

The nodeJS server makes a connection to the Heos device and gets notified in the event of the currently playing track changing, or the play state changing (play/pause/stop). This information gets relayed to the client (the browser window), along with the metadata when necessary. The client extracts the song name, artist name, and cover art url from this metadata and displays it on the screen. In the event of the play state changing to 'play' or 'stop' (as opposed to just 'pause'), the server starts or stops a sleep timer. During the countdown, the server sends the progress of the counter to the client, which then displays the remaining seconds. When the timer runs out, the server turns of the Pimeroni display. If at any point during or after the counter has started music playback resumes, the countdown will either abort or reactivate the display, notifying the client that it should show cover art and trackinfo again. 

## Installation
1. To do

## Usage
- To do

## Notes
- To Do

## Known issues
- To Do
