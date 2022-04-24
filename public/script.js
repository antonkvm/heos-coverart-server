let serverEvents = new EventSource('http://localhost:5555/stream')
var firstConnection = true
var currentMetadata

// shorthand for $(document).ready( () => {...} )
$(()=>{

	serverEvents.onopen = (event) => {
		$('#container').addClass('js-gradientBackdrop')
		if (firstConnection) {
			console.log('SSE Verbindung wurde erfolgreich hergestellt.')
			$('#msg-title').text('HEOS COVER ART SERVER')
			$('#msg-body').text('Connection successful!\nTo start showing cover art, press play on a song.')
			firstConnection = false
		} else {
			console.log('SSE Verbindung wurde erfolgreich wiederhergestellt.')
			$('#msg-title').text('Successfully reconnected to nodeJS server!')
			$('#msg-body').text('To show cover art again, press play on any song.')
		}
		// hide lil speck of devider line:
		$('hr').hide()
	}
	
	serverEvents.onmessage = (event) => {
		let data = JSON.parse(event.data)
		switch (data.event) {
			case 'init':
				console.log('Received initialization SSE from server.')
				break
			case 'noHeosFound':
				clearScreen()
				clearTrackInfo()
				$('#msg-title').text('No HEOS device found on network :(')
				$('#msg-body').text('Check if the device is plugged into power and connected with the network.')
				break
			case 'new metadata':
				updateScreen(data.payload)
				$('#msg-title, #msg-body, #sleep1, #sleep2, #sleep3').text('')
				break
			case 'getting sleepy':
				clearScreen()
				clearTrackInfo()
				$('#msg-title, #msg-body').text('')
				$('#sleep1').text('Sleeping in')
				$('#sleep2').text(data.remaining)
				$('#sleep3').text('seconds')
				break
			default:
				break
		}
	}
	
	// "disconnected from nodeJS server" screen:
	serverEvents.onerror = (error) => {
		console.log('SSE error detected!')
		$('#msg-title').text('SSE error :(')
		$('#msg-body').text('Trying to reconnect...') // fun fact: firefox doesn't auto-reconnect, but needs a page refresh.
		updateScreen()
		clearTrackInfo()
	}
	
	
	
	
	
	
	/* --------------------------------------------- FUNCTIONS: --------------------------------------------- */
	
	/**
	 * Change the song and artist displayed on screen.
	 * @param {object} metadata The metadata as JSON containing song and artist.
	 */
	function setTrackInfo(metadata) {
		$('#song').text(metadata.song)
		$('#artist').text(metadata.artist)
		$('hr').show()
	}
	
	/** Clears any text currently shown in trackinfo div. */
	function clearTrackInfo() {
		$('#song').text('')
		$('#artist').text('')
		$('hr').hide()
	}
	
	/**
	 * Update the screen with new album art and trackinfo.
	 * If no parameter is passed into the function or the parameter is undefined, the screen will go blank.
	 * @param {object} newMetadata Object containing the metadata of the new song, as HEOS supplies it.
	 */
	function updateScreen(newMetadata) {
		if (typeof newMetadata === 'undefined') {
			$('#container').addClass('js-gradientBackdrop')
			$('#shadow-overlay').hide()
		} else {
			$('#container').removeClass('js-gradientBackdrop')
			$('#shadow-overlay').show()
			// if new or first song:
			if (typeof currentMetadata === 'undefined' || newMetadata.album != currentMetadata.album) {
				currentMetadata = newMetadata
				// wait 2 seconds bc with airplay, img_src can be slow to update. Avoids img load errors.
				setTimeout(() => {
					$('img').attr('src', newMetadata.image_url + '?t=' + new Date().getTime())
					setTrackInfo(newMetadata)
				}, 2*1000);
			}
			// if same song, only remove black screen (above) and show trackinfo again. Needed after sleep timer.
			else {
				setTrackInfo(newMetadata)
			}
		}
	}
	
	/** Makes the background go blank.  */
	function clearScreen() {
		updateScreen()
	}

})
