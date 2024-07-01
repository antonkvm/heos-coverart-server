# Heos Cover Art Server

This project allows me to display the song (and its cover art) currently playing on my Denon AV receiver on a small square Pimeroni display powered by a Raspberry Pi Zero.

Works with via Spotify, Apple Music, Airplay, etc.

## How it works

The backend is a nodeJS server running express that communicates with the receiver on my local network via API and serves a simple web page as a front end with the title, artist and cover art of the currently playing song. When the song changes, the web page is updated via server-sent events (SSE). When the receiver is turned off, a sleep timer is activated and displayed.
