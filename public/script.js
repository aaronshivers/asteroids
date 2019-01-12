const FPS = 30 // frames per second
const FRICTION = 0.7 // friction coefficient of space (0 = no friction, 1 = max friction)
const GAME_LIVES = 3 // starting lives
const LASER_DIST = 0.6 // max laser distance as fraction of screen width
const LASER_EXPLODE_DUR = 0.1 // duration of laser explosion
const LASER_MAX = 10 // max number of lasers on screen at once
const LASER_SPD = 500 // speed of lasers in pixels per second
const ROIDS_JAG = 0.25 // jaggedness of asteroids (0 = none, 1 = many)
const ROIDS_PTS_LGE = 20 // points scored for large asteroid
const ROIDS_PTS_MED = 50 // points scored for medium asteroid
const ROIDS_PTS_SML = 100 // points scored for small asteroid
const ROID_NUM = 1 // starting number of asteroids
const ROID_SIZE = 100 // starting size of asteroids in pixels
const ROIDS_SPD = 50 // max starting speed of asteroids
const ROIDS_VERT = 10 // avg number of vertices on each asteroid
const SAVE_KEY_SCORE = 'highscore' // save key for local storage of high score
const SHIP_SIZE = 30 // ship height in pixels
const SHIP_BLINK_DUR = 0.1 // duration of ship's blink during invisibility duration in seconds
const SHIP_EXPLODE_DUR = 0.3 // duration of ship explosion
const SHIP_INV_DUR = 3 // duration of ship invincibility in seconds
const SHIP_THRUST = 5 // acceleration of the ship in pixels per second
const TURN_SPEED = 360 // turn speed in degrees per second
const SHOW_BOUNDING = false // show or hide collision bounding
const SHOW_CENTER_DOT = false // show or hide ship's center dot
const SOUND_ON = true // turns sound on
const MUSIC_ON = true // turns music on
const TEXT_FADE_TIME = 2.5 // text fade time in seconds
const TEXT_SIZE = 40 // text font height in pixels

/** @type {HTMLCanvasElement} */
const canv = document.getElementById('gameCanvas')
const ctx = canv.getContext('2d')

// setup sound effects
const fxLaser = new Sound('sounds/laser.m4a', 5, 0.5)
const fxExplode = new Sound('sounds/explode.m4a')
const fxHit = new Sound('sounds/hit.m4a', 5, 0.5)
const fxThrust = new Sound('sounds/thrust.m4a')

// set up music
const music = new Music('sounds/music-low.m4a', 'sounds/music-high.m4a')
let roidsLeft, roidsTotal

// setup game parameters
let level, lives, roids, score, scoreHigh, ship, text, textAlpha
newGame()

// set event handlers
document.addEventListener('keydown', keyDown)
document.addEventListener('keyup', keyUp)

// set up the game loop
setInterval(update, 1000 / FPS)

function createAsteroidBelt() {
	roids = []
	roidsTotal = (ROID_NUM + level) * 7
	roidsLeft = roidsTotal
	let x, y
	for (let i = 0; i < ROID_NUM + level; i++) {
		do {
			x = Math.floor(Math.random() * canv.width)
			y = Math.floor(Math.random() * canv.height)
		} while (distBetweenPoints(ship.x, ship.y, x, y) < ROID_SIZE * 2 + ship.r)
		roids.push(newAsteroid(x, y, Math.ceil(ROID_SIZE / 2)))
	}
}

function destroyAsteroid(index) {
	const x = roids[index].x
	const y = roids[index].y
	const r = roids[index].r

	// split asteroid in two if necessary
	if (r == Math.ceil(ROID_SIZE / 2)) {
		roids.push(newAsteroid(x, y, Math.ceil(ROID_SIZE / 4)))
		roids.push(newAsteroid(x, y, Math.ceil(ROID_SIZE / 4)))
		score += ROIDS_PTS_LGE
	} else if (r == Math.ceil(ROID_SIZE / 4)) {
		roids.push(newAsteroid(x, y, Math.ceil(ROID_SIZE / 8)))
		roids.push(newAsteroid(x, y, Math.ceil(ROID_SIZE / 8)))
		score += ROIDS_PTS_MED
	} else {
		score += ROIDS_PTS_SML	
	}

	// check high score
	if (score > scoreHigh) {
		scoreHigh = score
		localStorage.setItem(SAVE_KEY_SCORE, scoreHigh)
	}

	// destroy original asteroid
	roids.splice(index, 1)
	fxHit.play()

	// calculate ratio of remaining asteroids to determine music tempo
	roidsLeft--
	music.setAsteroidRatio(roidsLeft == 0 ? 1 : roidsLeft / roidsTotal)

	// start new level when all astroids are destroyed
	if (roids.length == 0) {
		level++
		newLevel()
	}
}

function distBetweenPoints(x1, y1, x2, y2) {
	return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

function drawShip(x, y, a, color = 'white') {
	ctx.strokeStyle = color
	ctx.lineWidth = SHIP_SIZE / 20
	ctx.beginPath()
	ctx.moveTo( // nose of the ship
		x + 6 / 3 * ship.r * Math.cos(a),
		y - 6 / 3 * ship.r * Math.sin(a)
	)
	ctx.lineTo( // rear left
		x - ship.r * (2 / 3 * Math.cos(a) + Math.sin(a)),
		y + ship.r * (2 / 3 * Math.sin(a) - Math.cos(a))
	)
	ctx.lineTo( // rear right
		x - ship.r * (2 / 3 * Math.cos(a) - Math.sin(a)),
		y + ship.r * (2 / 3 * Math.sin(a) + Math.cos(a))
	)
	ctx.closePath()
	ctx.stroke()	
}

function explodeShip() {
	ship.explodeTime = Math.ceil(SHIP_EXPLODE_DUR * FPS)
	fxExplode.play()
}

function gameOver() {
	ship.dead = true
	text = 'Game Over'
	textAlpha = 1.0
}

function keyDown(/** @type {KeyboardEvent} */ ev) {
	if (ship.dead) {
		return
	}

	switch(ev.keyCode) {
		case 32: // spacebar (shoot laser)
			shootLaser()
			break
		case 37: // left arrow (rotate ship counterclockwise)
			ship.rot = TURN_SPEED / 180 * Math.PI / FPS
			break
		case 38: // up arrow (move ship forward)
			ship.thrusting = true
			break
		case 39: // right arrow (rotate ship clockwise)
			ship.rot = -TURN_SPEED / 180 * Math.PI / FPS
			break
	}
}

function keyUp(/** @type {KeyboardEvent} */ ev) {
	if (ship.dead) {
		return
	}
		switch(ev.keyCode) {
		case 32: // spacebar (allow another shot)
			ship.canShoot = true
			break
		case 37: // left arrow (stop counterclockwise rotation)
			ship.rot = 0
			break
		case 38: // up arrow (stop moving ship forward)
			ship.thrusting = false
			break
		case 39: // right arrow (stop clockwise rotation)
			ship.rot = 0
			break
	}
}

function newAsteroid(x, y, r) {
	const lvlMult = 1 + 0.1 * level
	const roid = {
		x: x,
		y: y,
		xv: Math.random() * ROIDS_SPD * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
		yv: Math.random() * ROIDS_SPD * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
		r: r,
		a: Math.random() * Math.PI * 2, // in radians
		vert: Math.floor(Math.random() * (ROIDS_VERT + 1) + ROIDS_VERT / 2),
		offs: []
	}

	// create vertex offset array
	for (let i = 0; i < roid.vert; i++) {
		roid.offs.push(Math.random() * ROIDS_JAG * 2 + 1 - ROIDS_JAG)
	}

	return roid
}

function newGame() {
	level = 0
	lives = GAME_LIVES
	score = 0
	ship = newShip()

	// get high score from local storage
	const scoreStr = localStorage.getItem(SAVE_KEY_SCORE)
	if (scoreStr == null) {
		scoreHigh = 0
	} else {
		scoreHigh = parseInt(scoreStr)
	}

	newLevel()
}

function newLevel() {
	text = `Level ${level + 1}`
	textAlpha = 1.0
	createAsteroidBelt()
}

function newShip() {
	return {
		x: canv.width / 2,
		y: canv.height / 2,
		r: SHIP_SIZE / 2,
		a: 90 / 180 * Math.PI, // convert to radians
		blinkNum: Math.ceil(SHIP_INV_DUR / SHIP_BLINK_DUR),
		blinkTime: Math.ceil(SHIP_BLINK_DUR * FPS),
		canShoot: true,
		dead: false,
		lasers: [],
		explodeTime: 0,
		rot: 0,
		thrusting: false,
		thrust: {
			x: 0,
			y: 0
		}
	}
}

function shootLaser() {
	// create laser object
	if (ship.canShoot && ship.lasers.length < LASER_MAX) {
		ship.lasers.push({ // from the nose of ship
			x: ship.x + 6 / 3 * ship.r * Math.cos(ship.a),
			y: ship.y - 6 / 3 * ship.r * Math.sin(ship.a),
			xv: LASER_SPD * Math.cos(ship.a) / FPS,
			yv: -LASER_SPD * Math.sin(ship.a) / FPS,
			dist: 0,
			explodeTime: 0
		})
		fxLaser.play()
	}
	// prevent further shooting
	ship.canShoot = false
}

function toggleMusic() {
	if (MUSIC_ON = false) {
		MUSIC_ON = true
	} else {
		MUSIC_ON = false
	}
}		

function Music(srcLow, srcHigh) {
	this.soundLow = new Audio(srcLow)
	this.soundHigh = new Audio(srcHigh)
	this.low = true
	this.tempo = 1.0 // seconds per beat
	this.beatTime = 0 // frames left until newt beat

	this.play = function() {
		if (MUSIC_ON) {
			if (this.low) {
				this.soundLow.play()
			} else {
				this.soundHigh.play()
			}
			this.low = !this.low
		}
	}

	this.setAsteroidRatio = function(ratio) {
		this.tempo = 1.0 - 0.75 * (1.0 - ratio)
	}

	this.tick = function() {
		if (this.beatTime == 0) {
			this.play()
			this.beatTime = Math.ceil(this.tempo * FPS)
		} else {
			this.beatTime--
		}
	}
}

function Sound(src, maxStreams = 1, vol = 1.0) {
	this.streamNum = 0
	this.streams = []
	for (let i = 0; i < maxStreams; i++) {
		this.streams.push(new Audio(src))
		this.streams[i].volume = vol
	}

	this.play = function() {
		if (SOUND_ON) {
			this.streamNum = (this.streamNum + 1) % maxStreams
			this.streams[this.streamNum].play()
		}
	}

	this.stop = function() {
		this.streams[this.streamNum].pause()
		this.streams[this.streamNum].currentTime = 0
	}
}

function update() {
	const blinkOn = ship.blinkNum % 2 == 0
	const exploding = ship.explodeTime > 0

	// tick the music
	music.tick()

	// draw space
	ctx.fillStyle = 'black'
	ctx.fillRect(0, 0, canv.width, canv.height)

	// thrust the ship
	if (ship.thrusting && !ship.dead) {
		ship.thrust.x += SHIP_THRUST * Math.cos(ship.a) / FPS
		ship.thrust.y -= SHIP_THRUST * Math.sin(ship.a) / FPS
		fxThrust.play()

		// draw thruster
		if (!exploding && blinkOn) {
			ctx.fillStyle = 'red'
			ctx.strokeStyle = 'yellow'
			ctx.lineWidth = SHIP_SIZE / 10
			ctx.beginPath()
			ctx.moveTo( // rear left
				ship.x - ship.r * (2 / 3 * Math.cos(ship.a) + 0.5 * Math.sin(ship.a)),
				ship.y + ship.r * (2 / 3 * Math.sin(ship.a) - 0.5 * Math.cos(ship.a))
				)
			ctx.lineTo( // rear center behind ship
				ship.x - ship.r * (6 / 3 * Math.cos(ship.a)),
				ship.y + ship.r * (6 / 3 * Math.sin(ship.a))
				)
			ctx.lineTo( // rear right
				ship.x - ship.r * (2 / 3 * Math.cos(ship.a) - 0.5 * Math.sin(ship.a)),
				ship.y + ship.r * (2 / 3 * Math.sin(ship.a) + 0.5 * Math.cos(ship.a))
				)
			ctx.closePath()
			ctx.fill()
			ctx.stroke()			
		}
	} else {
		// apply friction to slow ship when not thrusting
		ship.thrust.x -= FRICTION * ship.thrust.x / FPS
		ship.thrust.y -= FRICTION * ship.thrust.y / FPS
		fxThrust.stop()
	}

	// draw triangular ship
	if (!exploding) {
		if (blinkOn && !ship.dead) {
			drawShip(ship.x, ship.y, ship.a)
		}

		// handle blinking
		if (ship.blinkNum > 0) {
			// reduce blink time
			ship.blinkTime--
			// reduce blink num
			if (ship.blinkTime == 0){
				ship.blinkTime = Math.ceil(SHIP_BLINK_DUR * FPS)
				ship.blinkNum--
			}
		}
	} else {
		// draw explosion
		ctx.fillStyle = 'darkred'
		ctx.beginPath()
		ctx.arc(ship.x, ship.y, ship.r * 1.7, Math.PI * 2, false)
		ctx.fill()
		ctx.fillStyle = 'red'
		ctx.beginPath()
		ctx.arc(ship.x, ship.y, ship.r * 1.4, Math.PI * 2, false)
		ctx.fill()
		ctx.fillStyle = 'orange'
		ctx.beginPath()
		ctx.arc(ship.x, ship.y, ship.r * 1.1, Math.PI * 2, false)
		ctx.fill()
		ctx.fillStyle = 'yellow'
		ctx.beginPath()
		ctx.arc(ship.x, ship.y, ship.r * 0.8, Math.PI * 2, false)
		ctx.fill()
		ctx.fillStyle = 'white'
		ctx.beginPath()
		ctx.arc(ship.x, ship.y, ship.r * 0.5, Math.PI * 2, false)
		ctx.fill()
	}

	// show ship bounding
	if (SHOW_BOUNDING) {
		ctx.strokeStyle = 'lime'
		ctx.beginPath()
		ctx.arc(ship.x, ship.y, ship.r, 0, Math.PI * 2, false)
		ctx.stroke()
	}

	// draw asteroids
	let x, y, r, a, vert, offs
	for (let i = 0; i < roids.length; i++) {
		ctx.strokeStyle = 'slategray'
		ctx.lineWidth = SHIP_SIZE / 20

		// get asteroids properties
		x = roids[i].x
		y = roids[i].y
		r = roids[i].r
		a = roids[i].a
		vert = roids[i].vert
		offs = roids[i].offs

		// draw path
		ctx.beginPath()
		ctx.moveTo(
			x + r * offs[0] * Math.cos(a),
			y + r * offs[0] * Math.sin(a))

		// draw polygon
		for (let j = 1; j < vert; j++) {
			ctx.lineTo(
				x + r * offs[j] * Math.cos(a + j * Math.PI * 2 / vert),
				y + r * offs[j] * Math.sin(a + j * Math.PI * 2 / vert)
				)
		}
		ctx.closePath()
		ctx.stroke()

		// show asteroid bounding
		if (SHOW_BOUNDING) {
			ctx.strokeStyle = 'lime'
			ctx.beginPath()
			ctx.arc(x, y, r, 0, Math.PI * 2, false)
			ctx.stroke()
		}	
	}

	// center dot
	if (SHOW_CENTER_DOT) {
		ctx.fillStyle = 'red'
		ctx.fillRect(ship.x - 1, ship.y -1, 2, 2)	
	}

	// draw lasers and laser explosions
	for (let i = 0; i < ship.lasers.length; i++) {
		if (ship.lasers[i].explodeTime == 0) {
			// draw laser
			ctx.fillStyle = 'salmon'
			ctx.beginPath()
			ctx.arc(ship.lasers[i].x, ship.lasers[i].y, SHIP_SIZE / 15, 0, Math.PI * 2, false)
			ctx.fill()			
		} else {
			// draw explosion
			ctx.fillStyle = 'orangered'
			ctx.beginPath()
			ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.75, 0, Math.PI * 2, false)
			ctx.fill()			
			ctx.fillStyle = 'salmon'
			ctx.beginPath()
			ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.5, 0, Math.PI * 2, false)
			ctx.fill()			
			ctx.fillStyle = 'pink'
			ctx.beginPath()
			ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.25, 0, Math.PI * 2, false)
			ctx.fill()		
		}
	}

	// draw game text
	if (textAlpha >= 0) {
		ctx.textAlign = `center`
		ctx.textBaseAlign = `middle`
		ctx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`
		ctx.font = `small-caps ${TEXT_SIZE}px dejavu sans mono`
		ctx.fillText(text, canv.width / 2, canv.height * 0.75)
		textAlpha -= (1.0 / TEXT_FADE_TIME / FPS)
	} else if (ship.dead) {
		newGame()
	}

	// draw lives
	let lifeColor
	for (let i = 0; i < lives; i++) {
		lifeColor = exploding && i == lives -1 ? 'red' : 'white'
		drawShip(SHIP_SIZE + i * SHIP_SIZE * 1.2, SHIP_SIZE, 0.5 * Math.PI, lifeColor)
	}

	// draw score
	ctx.textAlign = 'right'
	ctx.textBaseAlign = 'middle'
	ctx.fillStyle = 'white'
	ctx.font = `${TEXT_SIZE}px dejavu sans mono`
	ctx.fillText(score, canv.width - SHIP_SIZE / 2, SHIP_SIZE * 1.2)	

	// draw high score
	ctx.textAlign = 'center'
	ctx.textBaseAlign = 'middle'
	ctx.fillStyle = 'white'
	ctx.font = `${TEXT_SIZE * 0.75}px dejavu sans mono`
	ctx.fillText(`TOP: ${scoreHigh}`, canv.width / 2, SHIP_SIZE * 1.2)	

	// detect laser hits on asteroids
	let ax, ay, ar, lx, ly
	for (let i = roids.length -1; i >= 0; i--) {

		// grab asteroid properties
		ax = roids[i].x
		ay = roids[i].y
		ar = roids[i].r

		// loop over lasers
		for (let j = ship.lasers.length -1; j >= 0; j--) {

			// grab laser properties
			lx = ship.lasers[j].x
			ly = ship.lasers[j].y

			// detect hits
			if (ship.lasers[j].explodeTime == 0 && distBetweenPoints(ax, ay, lx, ly) < ar) {

				// remove asteroid and activate laser explosion
				destroyAsteroid(i)
				ship.lasers[j].explodeTime = Math.ceil(LASER_EXPLODE_DUR * FPS)
				break
			}
		}
	}

	// check for asteroid collisions (when not exploding)
	if (!exploding) {

		// only check when not blinking
		if (ship.blinkNum == 0 && !ship.dead) {
			for (let i = 0; i < roids.length; i++) {
				if (distBetweenPoints(ship.x, ship.y, roids[i].x, roids[i].y) < ship.r + roids[i].r) {
					explodeShip()
					destroyAsteroid(i)
					break
				}
			}
		}
		// rotate ship
		ship.a += ship.rot

		// thrust ship
		ship.x += ship.thrust.x
		ship.y += ship.thrust.y			
	} else {
		ship.explodeTime--

		// reset ship after explosion
		if (ship.explodeTime == 0) {
			lives--
			if (lives == 0) {
				gameOver()
			} else {
				ship = newShip()
			}
		}
	}

	// move the lasers
	for (let i = ship.lasers.length -1; i >= 0; i--) {

		// check distance traveled
		if (ship.lasers[i].dist > LASER_DIST * canv.width) {
			ship.lasers.splice(i, 1)
			continue
		}

		// handle explosion
		if (ship.lasers[i].explodeTime > 0) {
			ship.lasers[i].explodeTime--

			// destroy laser after duration ends
			if (ship.lasers[i].explodeTime == 0) {
				ship.lasers.splice(i, 1)
				continue
			}
		} else {
			// move the laser
			ship.lasers[i].x += ship.lasers[i].xv
			ship.lasers[i].y += ship.lasers[i].yv

			// calulate laser travel distance
			ship.lasers[i].dist += Math.sqrt(Math.pow(ship.lasers[i].xv, 2) + Math.pow(ship.lasers[i].yv, 2))
		}


		// handle edge of screen
		if (ship.lasers[i].x < 0) {
			ship.lasers[i].x = canv.width
		} else if (ship.lasers[i].x > canv.width) {
			ship.lasers[i].x = 0
		}
		if (ship.lasers[i].y < 0) {
			ship.lasers[i].y = canv.height
		} else if (ship.lasers[i].y > canv.height) {
			ship.lasers[i].y = 0
		}
	}

	
	// handle edge of screen 
	if (ship.x < 0 - ship.r) {
		ship.x = canv.width + ship.r
	} else if (ship.x > canv.width + ship.r) {
		ship.x = 0 - ship.r
	}
	if (ship.y < 0 - ship.r) {
		ship.y = canv.height + ship.r
	} else if (ship.y > canv.height + ship.r) {
		ship.y = 0 - ship.r
	}

	// move asteroids
	for (let i = 0; i < roids.length; i++) {
		roids[i].x += roids[i].xv
		roids[i].y += roids[i].yv

		// handle edge of screen
		if (roids[i].x < 0 - roids[i].r) {
			roids[i].x = canv.width + roids[i].r
		} else if (roids[i].x > canv.width + roids[i].r) {
			roids[i].x = 0 - roids[i].r
		}
		if (roids[i].y < 0 - roids[i].r) {
			roids[i].y = canv.height + roids[i].r
		} else if (roids[i].y > canv.height + roids[i].r) {
			roids[i].y = 0 - roids[i].r
		}		
	}
}
