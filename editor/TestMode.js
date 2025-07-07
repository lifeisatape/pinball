// Simplified Test Game for level testing
class TestMode {
    constructor(canvas, levelData) {
        this.running = true;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Calculate optimal canvas size for centering
        const maxWidth = window.innerWidth * 0.8;
        const maxHeight = window.innerHeight * 0.8;

        const scaleX = maxWidth / CONFIG.VIRTUAL_WIDTH;
        const scaleY = maxHeight / CONFIG.VIRTUAL_HEIGHT;
        this.scale = Math.min(scaleX, scaleY);

        this.canvas.width = CONFIG.VIRTUAL_WIDTH * this.scale;
        this.canvas.height = CONFIG.VIRTUAL_HEIGHT * this.scale;

        this.offsetX = 0;
        this.offsetY = 0;

        this.ball = {
            position: new Vector2D(CONFIG.VIRTUAL_WIDTH * 0.5, 50),
            velocity: new Vector2D(0, 0),
            radius: CONFIG.BALL_RADIUS
        };

        // Create flippers exactly like in original
        const flipperY = CONFIG.VIRTUAL_HEIGHT - 80;
        this.flippers = [
            new Flipper(CONFIG.VIRTUAL_WIDTH * 0.3, flipperY, true),
            new Flipper(CONFIG.VIRTUAL_WIDTH * 0.7, flipperY, false)
        ];

        // Store level data
        this.levelData = levelData || {
            walls: [],
            bumpers: [],
            spinners: [],
            dropTargets: [],
            tunnels: []
        };

        this.setupControls();
        this.gameLoop();
    }

    setupControls() {
        this.keyHandler = (e) => {
            // Prevent default arrow key behavior (scrolling)
            if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
                e.preventDefault();
            }

            if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                if (e.type === 'keydown') {
                    this.flippers[0].activate();
                } else {
                    this.flippers[0].deactivate();
                }
            }
            if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                if (e.type === 'keydown') {
                    this.flippers[1].activate();
                } else {
                    this.flippers[1].deactivate();
                }
            }
        };

        document.addEventListener('keydown', this.keyHandler);
        document.addEventListener('keyup', this.keyHandler);
    }

    stop() {
        this.running = false;
        document.removeEventListener('keydown', this.keyHandler);
        document.removeEventListener('keyup', this.keyHandler);
    }

    resetBall() {
        this.ball.position.x = CONFIG.VIRTUAL_WIDTH * 0.5;
        this.ball.position.y = 50;
        this.ball.velocity.x = 0;
        this.ball.velocity.y = 0;
    }

    checkWallCollision(wall) {
        if (wall.type === 'line' || !wall.type) {
            // Handle straight line walls
            const distance = distanceToLineSegment(this.ball.position, new Vector2D(wall.x1, wall.y1), new Vector2D(wall.x2, wall.y2));

            if (distance < this.ball.radius + wall.width / 2) {
                const normal = getNormalToLineSegment(this.ball.position, new Vector2D(wall.x1, wall.y1), new Vector2D(wall.x2, wall.y2));

                const requiredDistance = this.ball.radius + wall.width / 2;
                const separationNeeded = requiredDistance - distance;
                const safetyMargin = 0.5;
                
                const totalPush = separationNeeded + safetyMargin;
                this.ball.position.x += normal.x * totalPush;
                this.ball.position.y += normal.y * totalPush;

                // Reflect velocity only if moving towards wall
                const dotProduct = this.ball.velocity.dot(normal);
                if (dotProduct < 0) {
                    this.ball.velocity.x -= 2 * dotProduct * normal.x;
                    this.ball.velocity.y -= 2 * dotProduct * normal.y;
                    this.ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);
                }
            }
        } else if (wall.type === 'semicircle' || wall.type === 'quarter') {
            // Handle arc walls
            this.checkArcWallCollision(wall);
        }
    }

    checkArcWallCollision(wall) {
        const dx = this.ball.position.x - wall.centerX;
        const dy = this.ball.position.y - wall.centerY;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

        // Check if ball is near the arc
        const minDistance = wall.radius - wall.width / 2 - this.ball.radius;
        const maxDistance = wall.radius + wall.width / 2 + this.ball.radius;

        if (distanceFromCenter >= minDistance && distanceFromCenter <= maxDistance) {
            // Check if ball is within the arc's angle range
            let angle = Math.atan2(dy, dx);
            if (angle < 0) angle += Math.PI * 2;

            let startAngle = wall.startAngle;
            let endAngle = wall.endAngle;
            if (startAngle < 0) startAngle += Math.PI * 2;
            if (endAngle < 0) endAngle += Math.PI * 2;

            let withinArc = false;
            if (startAngle <= endAngle) {
                withinArc = angle >= startAngle && angle <= endAngle;
            } else {
                withinArc = angle >= startAngle || angle <= endAngle;
            }

            if (withinArc) {
                // Calculate collision based on whether ball is inside or outside the arc
                const targetRadius = wall.radius;
                const currentDistance = distanceFromCenter;

                if (Math.abs(currentDistance - targetRadius) < wall.width / 2 + this.ball.radius) {
                    // Collision detected
                    const normal = new Vector2D(dx / distanceFromCenter, dy / distanceFromCenter);

                    // Determine collision type and adjust normal
                    const isInside = currentDistance < targetRadius;
                    if (isInside) {
                        normal.x *= -1;
                        normal.y *= -1;
                    }

                    // Calculate required separation distance
                    const requiredDistance = isInside ? 
                        (targetRadius - wall.width / 2 - this.ball.radius) :
                        (targetRadius + wall.width / 2 + this.ball.radius);

                    const safetyMargin = 0.5;

                    // Push ball to safe position
                    if (isInside) {
                        const targetDistance = targetRadius - wall.width / 2 - this.ball.radius - safetyMargin;
                        this.ball.position.x = wall.centerX + normal.x * targetDistance;
                        this.ball.position.y = wall.centerY + normal.y * targetDistance;
                    } else {
                        const targetDistance = targetRadius + wall.width / 2 + this.ball.radius + safetyMargin;
                        this.ball.position.x = wall.centerX + normal.x * targetDistance;
                        this.ball.position.y = wall.centerY + normal.y * targetDistance;
                    }

                    // Reflect velocity only if moving towards surface
                    const dotProduct = this.ball.velocity.dot(normal);
                    if (dotProduct < 0) {
                        this.ball.velocity.x -= 2 * dotProduct * normal.x;
                        this.ball.velocity.y -= 2 * dotProduct * normal.y;
                        this.ball.velocity.multiply(CONFIG.BOUNCE_DAMPING);
                    }
                }
            }
        }
    }

    checkBumperCollision(bumper) {
        const dx = this.ball.position.x - bumper.x;
        const dy = this.ball.position.y - bumper.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.ball.radius + bumper.radius) {
            const normal = new Vector2D(dx / distance, dy / distance);

            const overlap = this.ball.radius + bumper.radius - distance + 2;
            this.ball.position.x += normal.x * overlap;
            this.ball.position.y += normal.y * overlap;

            this.ball.velocity.x = normal.x * CONFIG.BUMPER_BOUNCE_FORCE;
            this.ball.velocity.y = normal.y * CONFIG.BUMPER_BOUNCE_FORCE;

            // Add hit animation
            bumper.hitAnimation = 1;
            return true;
        }
        return false;
    }

    checkSpinnerCollision(spinner) {
        const cos = Math.cos(spinner.angle || 0);
        const sin = Math.sin(spinner.angle || 0);

        const dx = this.ball.position.x - spinner.x;
        const dy = this.ball.position.y - spinner.y;
        const localX = cos * dx + sin * dy;
        const localY = -sin * dx + cos * dy;

        if (Math.abs(localX) < spinner.width / 2 + this.ball.radius &&
            Math.abs(localY) < spinner.height / 2 + this.ball.radius) {

            const spinDirection = localX > 0 ? 1 : -1;
            spinner.angularVelocity = (spinner.angularVelocity || 0) + spinDirection * 0.3;

            const normal = new Vector2D(
                Math.abs(localX) > Math.abs(localY) ? Math.sign(localX) : 0,
                Math.abs(localY) > Math.abs(localX) ? Math.sign(localY) : 0
            );

            const worldNormalX = cos * normal.x - sin * normal.y;
            const worldNormalY = sin * normal.x + cos * normal.y;

            this.ball.velocity.x += worldNormalX * CONFIG.SPINNER_BOUNCE_FORCE;
            this.ball.velocity.y += worldNormalY * CONFIG.SPINNER_BOUNCE_FORCE;

            return true;
        }
        return false;
    }

    checkDropTargetCollision(target) {
        if (!target.isActive) return false;

        const dx = Math.abs(this.ball.position.x - target.x);
        const dy = Math.abs(this.ball.position.y - target.y);

        if (dx < target.width/2 + this.ball.radius && dy < target.height/2 + this.ball.radius) {
            target.isActive = false;
            target.resetTime = 300;

            const normalX = this.ball.position.x < target.x ? -1 : 1;
            this.ball.velocity.x = Math.abs(this.ball.velocity.x) * normalX * 1.2;

            return true;
        }
        return false;
    }

    checkTunnelCollision(tunnel) {
        if (tunnel.cooldown > 0) return false;

        const dx = this.ball.position.x - tunnel.entry.x;
        const dy = this.ball.position.y - tunnel.entry.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.ball.radius + tunnel.radius) {
            // Teleport ball to exit
            this.ball.position.x = tunnel.exit.x;
            this.ball.position.y = tunnel.exit.y;

            // Preserve velocity with slight boost
            this.ball.velocity.multiply(1.1);

            // Start animations
            tunnel.entryAnimation = 1;
            tunnel.exitAnimation = 1;

            // Set cooldown
            tunnel.cooldown = tunnel.maxCooldown;

            return true;
        }
        return false;
    }

    update() {
        // Update flippers
        this.flippers.forEach(flipper => flipper.update());

        // Update objects with animations
        if (this.levelData && this.levelData.bumpers) {
            this.levelData.bumpers.forEach(bumper => {
                if (bumper.hitAnimation > 0) {
                    bumper.hitAnimation -= 0.1;
                }
            });
        }

        if (this.levelData && this.levelData.spinners) {
            this.levelData.spinners.forEach(spinner => {
                spinner.angle = (spinner.angle || 0) + (spinner.angularVelocity || 0);
                spinner.angularVelocity = (spinner.angularVelocity || 0) * 0.95;
            });
        }

        if (this.levelData && this.levelData.dropTargets) {
            this.levelData.dropTargets.forEach(target => {
                if (!target.isActive && target.resetTime > 0) {
                    target.resetTime--;
                    if (target.resetTime <= 0) {
                        target.isActive = true;
                    }
                }
            });
        }

        if (this.levelData && this.levelData.tunnels) {
            this.levelData.tunnels.forEach(tunnel => {
                if (tunnel.cooldown > 0) {
                    tunnel.cooldown--;
                }
                if (tunnel.entryAnimation > 0) {
                    tunnel.entryAnimation -= 0.05;
                }
                if (tunnel.exitAnimation > 0) {
                    tunnel.exitAnimation -= 0.05;
                }
            });
        }

        // Ball physics
        this.ball.velocity.add(new Vector2D(0, CONFIG.GRAVITY));
        this.ball.velocity.clamp(CONFIG.MAX_BALL_SPEED);
        this.ball.velocity.multiply(CONFIG.FRICTION);
        this.ball.position.add(this.ball.velocity);

        // Boundary collisions
        if (this.ball.position.x < this.ball.radius) {
            this.ball.position.x = this.ball.radius;
            this.ball.velocity.x *= -CONFIG.BOUNCE_DAMPING;
        }
        if (this.ball.position.x > CONFIG.VIRTUAL_WIDTH - this.ball.radius) {
            this.ball.position.x = CONFIG.VIRTUAL_WIDTH - this.ball.radius;
            this.ball.velocity.x *= -CONFIG.BOUNCE_DAMPING;
        }
        if (this.ball.position.y < this.ball.radius) {
            this.ball.position.y = this.ball.radius;
            this.ball.velocity.y *= -CONFIG.BOUNCE_DAMPING;
        }
        if (this.ball.position.y > CONFIG.VIRTUAL_HEIGHT + 50) {
            this.resetBall();
        }

        // Flipper collisions
        this.flippers.forEach(flipper => {
            flipper.checkCollision(this.ball);
        });

        // Test wall collisions
        if (this.levelData && this.levelData.walls) {
            this.levelData.walls.forEach(wall => {
                this.checkWallCollision(wall);
            });
        }

        // Test bumper collisions
        if (this.levelData && this.levelData.bumpers) {
            this.levelData.bumpers.forEach(bumper => {
                this.checkBumperCollision(bumper);
            });
        }

        // Test spinner collisions
        if (this.levelData && this.levelData.spinners) {
            this.levelData.spinners.forEach(spinner => {
                this.checkSpinnerCollision(spinner);
            });
        }

        // Test drop target collisions
        if (this.levelData && this.levelData.dropTargets) {
            this.levelData.dropTargets.forEach(target => {
                this.checkDropTargetCollision(target);
            });
        }

        // Test tunnel collisions
        if (this.levelData && this.levelData.tunnels) {
            this.levelData.tunnels.forEach(tunnel => {
                this.checkTunnelCollision(tunnel);
            });
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // Draw background
        const gradient = this.ctx.createLinearGradient(0, 0, 0, CONFIG.VIRTUAL_HEIGHT);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0f1419');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, CONFIG.VIRTUAL_WIDTH, CONFIG.VIRTUAL_HEIGHT);

        // Draw background image if available
        if (this.levelData.backgroundImage) {
            this.ctx.save();
            this.ctx.globalAlpha = this.levelData.backgroundOpacity || 0.5;

            const image = this.levelData.backgroundImage;
            const scaleX = CONFIG.VIRTUAL_WIDTH / image.width;
            const scaleY = CONFIG.VIRTUAL_HEIGHT / image.height;
            const scale = Math.min(scaleX, scaleY);

            const scaledWidth = image.width * scale;
            const scaledHeight = image.height * scale;
            const offsetX = (CONFIG.VIRTUAL_WIDTH - scaledWidth) / 2;
            const offsetY = (CONFIG.VIRTUAL_HEIGHT - scaledHeight) / 2;

            this.ctx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);
            this.ctx.restore();
        }

        // Draw walls
        if (this.levelData && this.levelData.walls) {
            this.levelData.walls.forEach(wall => {
                this.ctx.strokeStyle = wall.color || '#ff4444';
                this.ctx.lineWidth = wall.width || 10;
                this.ctx.lineCap = 'round';
                this.ctx.beginPath();

                if (wall.type === 'line' || !wall.type) {
                    // Draw straight line
                    this.ctx.moveTo(wall.x1, wall.y1);
                    this.ctx.lineTo(wall.x2, wall.y2);
                } else if (wall.type === 'semicircle' || wall.type === 'quarter') {
                    // Draw arc
                    this.ctx.arc(wall.centerX, wall.centerY, wall.radius, wall.startAngle, wall.endAngle);
                }

                this.ctx.stroke();
            });
        }

        // Draw bumpers with hit animation
        if (this.levelData && this.levelData.bumpers) {
            this.levelData.bumpers.forEach(bumper => {
                const animRadius = bumper.radius + (bumper.hitAnimation || 0) * 10;

                const gradient = this.ctx.createRadialGradient(
                    bumper.x - 5, bumper.y - 5, 0,
                    bumper.x, bumper.y, animRadius
                );
                gradient.addColorStop(0, '#ffffff');
                gradient.addColorStop(0.3, '#ff4444');
                gradient.addColorStop(1, '#aa0000');

                this.ctx.fillStyle = gradient;
                this.ctx.beginPath();
                this.ctx.arc(bumper.x, bumper.y, animRadius, 0, Math.PI * 2);
                this.ctx.fill();

                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            });
        }

        // Draw spinners with rotation
        if (this.levelData && this.levelData.spinners) {
            this.levelData.spinners.forEach(spinner => {
                this.ctx.save();
                this.ctx.translate(spinner.x, spinner.y);
                this.ctx.rotate(spinner.angle || 0);

                const gradient = this.ctx.createLinearGradient(-spinner.width/2, 0, spinner.width/2, 0);
                gradient.addColorStop(0, '#4444ff');
                gradient.addColorStop(0.5, '#6666ff');
                gradient.addColorStop(1, '#4444ff');

                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(-spinner.width/2, -spinner.height/2, spinner.width, spinner.height);

                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(-spinner.width/2, -spinner.height/2, spinner.width, spinner.height);

                this.ctx.restore();

                this.ctx.fillStyle = '#ffffff';
                this.ctx.beginPath();
                this.ctx.arc(spinner.x, spinner.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }

        // Draw drop targets with active/inactive state
        if (this.levelData && this.levelData.dropTargets) {
            this.levelData.dropTargets.forEach(target => {
                if (!target.isActive) return;

                const gradient = this.ctx.createLinearGradient(
                    target.x - target.width/2, target.y,
                    target.x + target.width/2, target.y
                );
                gradient.addColorStop(0, '#ff8800');
                gradient.addColorStop(0.5, '#ffaa00');
                gradient.addColorStop(1, '#ff8800');

                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(
                    target.x - target.width/2,
                    target.y - target.height/2,
                    target.width,
                    target.height
                );

                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(
                    target.x - target.width/2,
                    target.y - target.height/2,
                    target.width,
                    target.height
                );
            });
        }

        // Draw tunnels with animations
        if (this.levelData && this.levelData.tunnels) {
            this.levelData.tunnels.forEach(tunnel => {
                this.drawTunnelPortal(tunnel.entry.x, tunnel.entry.y, tunnel.radius, tunnel.entryAnimation, '#8B00FF', '#4B0082');
                this.drawTunnelPortal(tunnel.exit.x, tunnel.exit.y, tunnel.radius, tunnel.exitAnimation, '#00FFFF', '#0080FF');
            });
        }

        // Draw flippers using original render method
        this.flippers.forEach(flipper => {
            flipper.draw(this.ctx);
        });

        // Draw ball with original gradient
        const ballGradient = this.ctx.createRadialGradient(
            this.ball.position.x - 3, this.ball.position.y - 3, 0,
            this.ball.position.x, this.ball.position.y, this.ball.radius
        );
        ballGradient.addColorStop(0, '#ffffff');
        ballGradient.addColorStop(0.3, '#ffff80');
        ballGradient.addColorStop(1, '#ffcc00');

        this.ctx.fillStyle = ballGradient;
        this.ctx.beginPath();
        this.ctx.arc(this.ball.position.x, this.ball.position.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        this.ctx.restore();

        // Draw controls info
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '14px Courier New';
        this.ctx.fillText('Controls: A/← = Left Flipper, D/→ = Right Flipper', 10, 30);
    }

    drawTunnelPortal(x, y, radius, animation, innerColor, outerColor) {
        const animRadius = radius + (animation || 0) * 5;

        // Outer glow
        const gradient = this.ctx.createRadialGradient(
            x, y, 0,
            x, y, animRadius
        );
        gradient.addColorStop(0, innerColor);
        gradient.addColorStop(0.6, outerColor);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, animRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // Inner portal
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius * 0.6, 0, Math.PI * 2);
        this.ctx.fill();

        // Animated ring
        if ((animation || 0) > 0) {
            this.ctx.strokeStyle = innerColor;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(x, y, radius + (animation || 0) * 10, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Portal edge
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    gameLoop() {
        if (!this.running) return;

        this.update();
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }
}