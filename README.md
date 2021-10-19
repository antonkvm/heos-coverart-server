# Heos Cover Art Server (README is currently kinda wrong)

A node JS server using heos-api, express, and SSEs (server-sent events) to display the coverart of the song currently playing on your heos device (e.g. an AV-Receiver) in a browser window.

## Installation
1. Pull the git repository.
2. Navigate into the directory and run `npm install` to install the dependencies.
3. Open `index.js` and edit the variable `xPort` to the port you want the server to be accessible at (default is 5555).
4. Open `index.html` and find the variable `var serverEvents`. Change the URL and port in `new EventSource('http://localhost:5555/stream')` respectively to the IP address of your server and the port you chose in the previous step. Like this: `new EventSource('http://<YOUR_SERVER_IP_HERE>:<YOUR_PORT>/stream)`. If you plan on running the server on the same device that will display the cover art, you may use `localhost` as IP address.
5. Run `node index.js` to start the server.

## Usage
- Access the server through a browser with `http://<YOUR_SERVER_IP_HERE>:<xPort>`.
- If you plan on using the server to make something like a digital picture frame, where the displaying browser window and server will run on the same device, you may use localhost as IP address in installation step 4.

## Notes
- The server will automatically connect to a single heos device on the network. Behavior with multiple heos devices is not tested.
- The server will be accessible throughout your local network at home. If you enable and set up the proper port forwarding on you router, the server will be accessible even outside your network.
- The server works best on a square display in fullscreen mode. If the browser viewport is not square, black bars will be visible.

## Known issues
- When you first connect with the server through your browser, no cover art is shown yet. Only after the first change event (e.g. skipping to next song)

## Possible improvements / ideas
- Provide a seperate file for setting user-specific variables, like IP address of heos device, port.
- Show more metadata on the display
- Enable on-screen controls (this would require two-way communication between server and browser. SSE would need to be replaced by a websocket or something)