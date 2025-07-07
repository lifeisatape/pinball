// Editor Tools Class
class EditorTools {
    constructor() {
        this.currentTool = 'wall';
        this.wallMode = 'line'; // 'line', 'semicircle', 'quarter'
        this.isDrawing = false;
        this.drawStart = null;
        this.selectedObject = null;
        this.isDragging = false;
        this.dragOffset = null;

        // Tunnel creation state
        this.tunnelCreationStep = 0; // 0: none, 1: placing entry, 2: placing exit
        this.tunnelEntry = null;
    }

    setTool(toolName) {
        this.currentTool = toolName;

        // Reset tunnel creation state when switching tools
        if (this.currentTool !== 'tunnel') {
            this.tunnelCreationStep = 0;
            this.tunnelEntry = null;
        }
    }

    setWallMode(mode) {
        this.wallMode = mode;
    }

    snapToGrid(worldPos, snapEnabled, gridSize) {
        if (!snapEnabled) {
            return worldPos;
        }

        return {
            x: Math.round(worldPos.x / gridSize) * gridSize,
            y: Math.round(worldPos.y / gridSize) * gridSize
        };
    }

    findObjectAt(worldPos, levelData) {
        const tolerance = 20;

        // Check bumpers (highest priority for selection)
        for (let bumper of levelData.bumpers) {
            const dist = Math.sqrt((worldPos.x - bumper.x) ** 2 + (worldPos.y - bumper.y) ** 2);
            if (dist <= bumper.radius + tolerance) {
                return { type: 'bumper', object: bumper };
            }
        }

        // Check spinners
        for (let spinner of levelData.spinners) {
            const dist = Math.sqrt((worldPos.x - spinner.x) ** 2 + (worldPos.y - spinner.y) ** 2);
            if (dist <= spinner.width / 2 + tolerance) {
                return { type: 'spinner', object: spinner };
            }
        }

        // Check drop targets
        for (let target of levelData.dropTargets) {
            const dx = Math.abs(worldPos.x - target.x);
            const dy = Math.abs(worldPos.y - target.y);
            if (dx <= target.width / 2 + tolerance && dy <= target.height / 2 + tolerance) {
                return { type: 'droptarget', object: target };
            }
        }

        // Check tunnels
        for (let tunnel of levelData.tunnels) {
            const entryDist = Math.sqrt((worldPos.x - tunnel.entryX) ** 2 + (worldPos.y - tunnel.entryY) ** 2);
            const exitDist = Math.sqrt((worldPos.x - tunnel.exitX) ** 2 + (worldPos.y - tunnel.exitY) ** 2);

            if (entryDist <= tunnel.radius + tolerance) {
                return { type: 'tunnel', object: tunnel, point: 'entry' };
            }
            if (exitDist <= tunnel.radius + tolerance) {
                return { type: 'tunnel', object: tunnel, point: 'exit' };
            }
        }

        // Check walls - check for specific points first, then line
        for (let wall of levelData.walls) {
            if (wall.type === 'line' || !wall.type) {
                // Handle straight line walls
                // Check start point
                const startDist = Math.sqrt((worldPos.x - wall.x1) ** 2 + (worldPos.y - wall.y1) ** 2);
                if (startDist <= tolerance) {
                    return { type: 'wall', object: wall, point: 'start' };
                }

                // Check end point
                const endDist = Math.sqrt((worldPos.x - wall.x2) ** 2 + (worldPos.y - wall.y2) ** 2);
                if (endDist <= tolerance) {
                    return { type: 'wall', object: wall, point: 'end' };
                }

                // Check line (for moving whole wall)
                const lineDist = this.distanceToLineSegment(worldPos, wall);
                if (lineDist <= tolerance) {
                    return { type: 'wall', object: wall, point: 'whole' };
                }
            } else if (wall.type === 'semicircle' || wall.type === 'quarter') {
                // Handle arc walls
                const dx = worldPos.x - wall.centerX;
                const dy = worldPos.y - wall.centerY;
                const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

                // Check if click is near the arc
                if (Math.abs(distanceFromCenter - wall.radius) <= tolerance) {
                    // Check if within arc angle range
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
                        return { type: 'wall', object: wall, point: 'whole' };
                    }
                }

                // Check center point for moving
                const centerDist = Math.sqrt((worldPos.x - wall.centerX) ** 2 + (worldPos.y - wall.centerY) ** 2);
                if (centerDist <= tolerance) {
                    return { type: 'wall', object: wall, point: 'center' };
                }
            }
        }

        return null;
    }

    deleteObjectAt(worldPos, levelData) {
        const tolerance = 20;
        let deleted = false;

        // Check walls
        for (let i = levelData.walls.length - 1; i >= 0; i--) {
            const wall = levelData.walls[i];
            let shouldDelete = false;

            if (wall.type === 'line' || !wall.type) {
                // Handle straight line walls
                const dist = this.distanceToLineSegment(worldPos, wall);
                if (dist <= tolerance) {
                    shouldDelete = true;
                }
            } else if (wall.type === 'semicircle' || wall.type === 'quarter') {
                // Handle arc walls
                const dx = worldPos.x - wall.centerX;
                const dy = worldPos.y - wall.centerY;
                const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

                // Check if click is near the arc
                if (Math.abs(distanceFromCenter - wall.radius) <= tolerance) {
                    // Check if within arc angle range
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
                        shouldDelete = true;
                    }
                }

                // Also check center point
                const centerDist = Math.sqrt((worldPos.x - wall.centerX) ** 2 + (worldPos.y - wall.centerY) ** 2);
                if (centerDist <= tolerance) {
                    shouldDelete = true;
                }
            }

            if (shouldDelete) {
                levelData.walls.splice(i, 1);
                deleted = true;
                break;
            }
        }

        if (deleted) return true;

        // Check bumpers
        for (let i = levelData.bumpers.length - 1; i >= 0; i--) {
            const bumper = levelData.bumpers[i];
            const dist = Math.sqrt((worldPos.x - bumper.x) ** 2 + (worldPos.y - bumper.y) ** 2);
            if (dist <= bumper.radius + tolerance) {
                levelData.bumpers.splice(i, 1);
                deleted = true;
                break;
            }
        }

        if (deleted) return true;

        // Check spinners
        for (let i = levelData.spinners.length - 1; i >= 0; i--) {
            const spinner = levelData.spinners[i];
            const dist = Math.sqrt((worldPos.x - spinner.x) ** 2 + (worldPos.y - spinner.y) ** 2);
            if (dist <= spinner.width / 2 + tolerance) {
                levelData.spinners.splice(i, 1);
                deleted = true;
                break;
            }
        }

        if (deleted) return true;

        // Check drop targets
        for (let i = levelData.dropTargets.length - 1; i >= 0; i--) {
            const target = levelData.dropTargets[i];
            const dx = Math.abs(worldPos.x - target.x);
            const dy = Math.abs(worldPos.y - target.y);
            if (dx <= target.width / 2 + tolerance && dy <= target.height / 2 + tolerance) {
                levelData.dropTargets.splice(i, 1);
                deleted = true;
                break;
            }
        }

        if (deleted) return true;

        // Check tunnels
        for (let i = levelData.tunnels.length - 1; i >= 0; i--) {
            const tunnel = levelData.tunnels[i];
            const entryDist = Math.sqrt((worldPos.x - tunnel.entryX) ** 2 + (worldPos.y - tunnel.entryY) ** 2);
            const exitDist = Math.sqrt((worldPos.x - tunnel.exitX) ** 2 + (worldPos.y - tunnel.exitY) ** 2);
            if (entryDist <= tunnel.radius + tolerance || exitDist <= tunnel.radius + tolerance) {
                levelData.tunnels.splice(i, 1);
                deleted = true;
                break;
            }
        }

        return deleted;
    }

    startDragging(worldPos, selectedObject) {
        this.isDragging = true;

        if (selectedObject.type === 'wall') {
            // For walls, store the original position based on which part was selected
            if (selectedObject.object.type === 'line' || !selectedObject.object.type) {
                // Handle straight line walls
                if (selectedObject.point === 'start') {
                    this.dragOffset = {
                        x: worldPos.x - selectedObject.object.x1,
                        y: worldPos.y - selectedObject.object.y1
                    };
                } else if (selectedObject.point === 'end') {
                    this.dragOffset = {
                        x: worldPos.x - selectedObject.object.x2,
                        y: worldPos.y - selectedObject.object.y2
                    };
                } else {
                    // Moving whole wall
                    this.dragOffset = {
                        x: worldPos.x - selectedObject.object.x1,
                        y: worldPos.y - selectedObject.object.y1,
                        x2: worldPos.x - selectedObject.object.x2,
                        y2: worldPos.y - selectedObject.object.y2
                    };
                }
            } else if (selectedObject.object.type === 'semicircle' || selectedObject.object.type === 'quarter') {
                // Handle arc walls
                this.dragOffset = {
                    x: worldPos.x - selectedObject.object.centerX,
                    y: worldPos.y - selectedObject.object.centerY
                };
            }
        } else if (selectedObject.type === 'tunnel') {
            // For tunnels
            if (selectedObject.point === 'entry') {
                this.dragOffset = {
                    x: worldPos.x - selectedObject.object.entryX,
                    y: worldPos.y - selectedObject.object.entryY
                };
            } else {
                this.dragOffset = {
                    x: worldPos.x - selectedObject.object.exitX,
                    y: worldPos.y - selectedObject.object.exitY
                };
            }
        } else {
            // For other objects
            this.dragOffset = {
                x: worldPos.x - selectedObject.object.x,
                y: worldPos.y - selectedObject.object.y
            };
        }
    }

    updateDragging(worldPos, selectedObject) {
        if (!this.isDragging || !selectedObject) return;

        if (selectedObject.type === 'wall') {
            if (selectedObject.object.type === 'line' || !selectedObject.object.type) {
                // Handle straight line walls
                if (selectedObject.point === 'start') {
                    selectedObject.object.x1 = worldPos.x - this.dragOffset.x;
                    selectedObject.object.y1 = worldPos.y - this.dragOffset.y;
                } else if (selectedObject.point === 'end') {
                    selectedObject.object.x2 = worldPos.x - this.dragOffset.x;
                    selectedObject.object.y2 = worldPos.y - this.dragOffset.y;
                } else {
                    // Moving whole wall
                    selectedObject.object.x1 = worldPos.x - this.dragOffset.x;
                    selectedObject.object.y1 = worldPos.y - this.dragOffset.y;
                    selectedObject.object.x2 = worldPos.x - this.dragOffset.x2;
                    selectedObject.object.y2 = worldPos.y - this.dragOffset.y2;
                }
            } else if (selectedObject.object.type === 'semicircle' || selectedObject.object.type === 'quarter') {
                // Handle arc walls - move center
                selectedObject.object.centerX = worldPos.x - this.dragOffset.x;
                selectedObject.object.centerY = worldPos.y - this.dragOffset.y;
            }
        } else if (selectedObject.type === 'tunnel') {
            if (selectedObject.point === 'entry') {
                selectedObject.object.entryX = worldPos.x - this.dragOffset.x;
                selectedObject.object.entryY = worldPos.y - this.dragOffset.y;
            } else {
                selectedObject.object.exitX = worldPos.x - this.dragOffset.x;
                selectedObject.object.exitY = worldPos.y - this.dragOffset.y;
            }
        } else {
            selectedObject.object.x = worldPos.x - this.dragOffset.x;
            selectedObject.object.y = worldPos.y - this.dragOffset.y;
        }
    }

    stopDragging() {
        this.isDragging = false;
        this.dragOffset = null;
    }

    getModeText() {
        const modes = {
            wall: `WALL MODE - ${this.wallMode.toUpperCase()}`,
            bumper: 'BUMPER MODE',
            spinner: 'SPINNER MODE',
            droptarget: 'DROP TARGET MODE',
            tunnel: this.tunnelCreationStep === 0 ? 'TUNNEL MODE - Click for Entry' : 'TUNNEL MODE - Click for Exit',
            select: 'SELECT MODE',
            delete: 'DELETE MODE'
        };
        return modes[this.currentTool] || 'UNKNOWN MODE';
    }

    distanceToLineSegment(point, wall) {
        const A = point.x - wall.x1;
        const B = point.y - wall.y1;
        const C = wall.x2 - wall.x1;
        const D = wall.y2 - wall.y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;

        if (lenSq === 0) return Math.sqrt(A * A + B * B);

        const param = dot / lenSq;
        let xx, yy;

        if (param < 0) {
            xx = wall.x1;
            yy = wall.y1;
        } else if (param > 1) {
            xx = wall.x2;
            yy = wall.y2;
        } else {
            xx = wall.x1 + param * C;
            yy = wall.y1 + param * D;
        }

        const dx = point.x - xx;
        const dy = point.y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }
}