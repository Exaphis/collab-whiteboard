const socket = io();

// ------------- Users -------------
socket.on('users', function(msg) {
    document.getElementById('user-count').textContent = msg + ' online';
});

// ------------- Synced Button -------------
let button = document.getElementById('button');
button.onmousedown = function() {
    socket.emit('btn-click');
};
button.onmouseup = function() {
    socket.emit('btn-release');
};

socket.on('btn-click', function(msg) {
    button.classList.remove('default-button');
    button.classList.add('clicked-button');
});
socket.on('btn-release', function() {
    button.classList.remove('clicked-button');
    button.classList.add('default-button');
});

let clickCount = document.getElementById('click-count');
socket.on('update-click-count', function(count) {
   clickCount.textContent = count + (count === 1 ? ' click' : ' clicks');
});



// ------------- Whiteboard -------------
let brush = document.getElementById('brush');
let brushCtx = brush.getContext('2d');
let brushCenterX = brush.width / 2;
let brushCenterY = brush.height / 2;
brushCtx.lineWidth = 1;
function drawBrush(width) {
    brushCtx.clearRect(0, 0, brush.width, brush.height);
    brushCtx.beginPath();
    brushCtx.arc(brushCenterX, brushCenterY, width / 2, 0, 2 * Math.PI, false);
    brushCtx.stroke();
}

let canvas = document.getElementById('whiteboard-canvas');
let ctx = canvas.getContext('2d');
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

let currentStroke = null;
// When undo is pressed, pop top stroke off and redraw
let strokes = [];

// Erase checkbox
let eraseCheckbox = document.getElementById('erase-checkbox');
eraseCheckbox.onchange = function() {
    if (this.checked) {
        currentThickness = thicknessSlider.value * 3;
        brushCtx.clearRect(0, 0, brush.width, brush.height);
        drawBrush(currentThickness);
    } else {
        currentThickness = thicknessSlider.value;
        drawBrush(currentThickness);
    }
};

// Thickness slider
let thicknessSlider = document.getElementById("thickness-slider");
let currentThickness = thicknessSlider.defaultValue;

drawBrush(currentThickness);
thicknessSlider.onchange = function() {
    currentThickness = this.value;
    if (eraseCheckbox.checked) {
        currentThickness *= 3;
    }

    brushCtx.clearRect(0, 0, brush.width, brush.height);
    drawBrush(currentThickness);
};

// Color picker
let colorPicker = document.getElementById('color-picker');
let currentColor = '#' + colorPicker.value;
colorPicker.onchange = function() {
    currentColor = '#' + this.value;
};

// Undo button
// Disabled since there is nothing to undo at first
let undoButton = document.getElementById('undo');
undoButton.disabled = true;

// Reset button
let resetButton = document.getElementById('reset');

function drawNewPoint(e) {
    brush.style.top = e.clientY - brushCenterY + 'px';
    brush.style.left = e.clientX - brushCenterX + 'px';
    if (currentStroke === null)
        return;

    // cross-browser canvas coordinates
    let x = e.offsetX || e.layerX - canvas.offsetLeft;
    let y = e.offsetY || e.layerY - canvas.offsetTop;

    currentStroke.points.push({x: x, y: y});
    drawOnCanvas(currentStroke.points, currentStroke.color, currentStroke.thickness);

    socket.emit('stroke-update', {x: x, y: y})
}

function drawOnCanvas(plots, color, thickness) {
    ctx.beginPath();
    ctx.moveTo(plots[0].x, plots[0].y);

    for(let i = 1; i < plots.length; i++) {
      ctx.lineTo(plots[i].x, plots[i].y);
    }

    ctx.lineWidth = thickness;
    ctx.strokeStyle = color;
    ctx.stroke();
}

function startDraw(e) {
    if (eraseCheckbox.checked) {
        currentColor = '#FFFFFF';
    }

    // Hack to draw even if cursor doesn't move
    let x = e.offsetX || e.layerX - canvas.offsetLeft;
    let y = e.offsetY || e.layerY - canvas.offsetTop;

    currentStroke = {
        thickness: currentThickness,
        color: currentColor,
        points: [{x: x-1, y: y-1}]
    };

    socket.emit('stroke-start', currentStroke);

    drawNewPoint(e);
}

function endDraw() {
    strokes.push(currentStroke);
    currentStroke = null;

    if (eraseCheckbox.checked) {
        currentColor = '#' + colorPicker.value;
    }

    undoButton.disabled = false;
}

function clearBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

undoButton.onclick = function() {
    strokes.pop();
    if (strokes.length === 0) {
        undoButton.disabled = true;
    }

    socket.emit('stroke-delete');
};

resetButton.onclick = function() {
    clearBoard();
    thicknessSlider.value = thicknessSlider.defaultValue;
    thicknessSlider.onchange(null);
    socket.emit('clear-board');
};

canvas.addEventListener('mousedown', startDraw, false);
canvas.addEventListener('mousemove', drawNewPoint, false);
canvas.addEventListener('mouseup', endDraw, false);

socket.on('clear-board', clearBoard);

socket.on('draw-new-stroke', function(data) {
    drawOnCanvas(data.points, data.color, data.thickness);
});

socket.on('draw-strokes', function(data) {
    for (let i = 0; i < data.length; i++) {
        let stroke = data[i];
        drawOnCanvas(stroke.points, stroke.color, stroke.thickness);
    }
});