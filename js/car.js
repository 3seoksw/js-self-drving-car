const ACCELERATION = 0.2
const MAX_SPEED = 8
const FRICTION = 0.05 
const ANGLE_DIF = 0.03

class Car {
    constructor(x, y, width, height, controlType, maxSpeed = 3, rayCount = 5) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height

        this.speed = 0
        this.acceleration = ACCELERATION 
        this.maxSpeed = maxSpeed 
        this.friction = FRICTION
        this.angle = 0
        this.damaged = false
        this.laneDetection = false

        this.distance = 0
        this.score = 0
        this.onLane = false
        this.onLaneCount = 0

        this.useBrain = controlType == "AI"

        if (controlType != "DUMMY") {
            this.sensor = new Sensor(this, rayCount)
            this.brain = new NeuralNetwork([6, 7, 4])
        }
        this.controls = new Controls(controlType)
    }

    update(roadBorders, traffic, lanes, laneDetection = false) {
        if (!this.damaged) {
            this.#move()
            this.polygon = this.#createPolygon()
            this.damaged = this.#assessDamage(roadBorders, traffic)
        }
        else {
            this.score = -1
        }

        if (this.sensor) {
            this.sensor.update(roadBorders, traffic, lanes)
            const offsets = this.sensor.readings.map((s) => s == null ? 0 : 1 - s.offset)

            if (laneDetection) {
                this.laneDetection = laneDetection
                let detection = 0

                if (Object.keys(this.sensor.detecting).length !== 0) {
                    detection = 2 * this.sensor.detecting.offset - 1
                    if (detection < 0) {
                        detection = -detection
                    }
                }

                offsets.push(detection)
            }
            const outputs = NeuralNetwork.feedForward(offsets, this.brain)

            if (this.useBrain) {
                this.controls.forward = outputs[0]
                this.controls.left = outputs[1]
                this.controls.right = outputs[2]
                this.controls.reverse = outputs[3]
            }
        }
    }

    #assessDamage(roadBorders, traffic) {
        for (let i = 0; i < roadBorders.length; i++) {
            if (polyIntersect(this.polygon, roadBorders[i])) {
                return true
            }
        }

        for (let i = 0; i < traffic.length; i++) {
            if (polyIntersect(this.polygon, traffic[i].polygon)) {
                return true
            }
        }

        return false
    }

    #createPolygon() {
        const points = []
        const rad = Math.hypot(this.width, this.height) / 2
        const theta = Math.atan2(this.width, this.height)
        points.push({
            x: this.x - Math.sin(this.angle - theta) * rad,
            y: this.y - Math.cos(this.angle - theta)* rad
        }) // top right point
        points.push({
            x: this.x - Math.sin(this.angle + theta) * rad,
            y: this.y - Math.cos(this.angle + theta)* rad
        }) // top left
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle - theta) * rad,
            y: this.y - Math.cos(Math.PI + this.angle - theta)* rad
        }) // bottom left
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle + theta) * rad,
            y: this.y - Math.cos(Math.PI + this.angle + theta)* rad
        }) // bottom right

        return points
    }

    #move() {
        if (this.controls.forward) {
            this.speed += this.acceleration
        }
        if (this.controls.reverse) {
            this.speed -= this.acceleration
        }

        if (this.speed > this.maxSpeed) {
            this.speed = this.maxSpeed
        }
        if (this.speed < -this.maxSpeed) {
            this.speed = -this.maxSpeed
        }

        if (this.speed > 0) {
            this.speed -= this.friction
        }
        if (this.speed < 0) {
            this.speed += this.friction
        }
        if (Math.abs(this.speed) < this.friction) {
            this.speed = 0
        }

        if (this.speed != 0) {
            const flip = this.speed > 0 ? 1 : -1

            if (this.controls.left) {
                this.angle += ANGLE_DIF * flip
            }
            if (this.controls.right) {
                this.angle -= ANGLE_DIF * flip
            }
        }
        this.x -= Math.sin(this.angle) * this.speed
        this.y -= Math.cos(this.angle) * this.speed
        this.distance += Math.hypot(this.x, this.y)

    }

    draw(ctx, colour, drawSensor = false) {
        if (this.damaged) {
            ctx.fillStyle = "gray"
        }
        else {
            ctx.fillStyle = colour
        }
        ctx.beginPath()
        ctx.moveTo(this.polygon[0].x, this.polygon[0].y)
        for (let i = 1; i < this.polygon.length; i++) {
            ctx.lineTo(this.polygon[i].x, this.polygon[i].y)
        }
        ctx.fill()

        if (this.sensor && drawSensor) {
            this.sensor.draw(ctx)
        }
    }
}
