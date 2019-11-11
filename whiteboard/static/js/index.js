const socket = io();

// ------------- Users -------------
socket.on('users', function(msg) {
    document.getElementById('user-count').textContent = msg + ' online'
});

// ------------- Heart Button -------------
let heartButton = document.getElementById('heart');
heartButton.onmousedown = function() {
    socket.emit('heart click');
};
heartButton.onmouseup = function() {
    socket.emit('heart release');
};

socket.on('heart click', function() {
    heartButton.classList.remove('default-button');
    heartButton.classList.add('clicked-button');
});
socket.on('heart release', function() {
    heartButton.classList.remove('clicked-button');
    heartButton.classList.add('default-button');
});

// ------------- Whiteboard -------------
let brush = document.getElementById('brush');
let brushCtx = brush.getContext('2d');
let brushCenterX = brush.width / 2;
let brushCenterY = brush.height / 2;
brushCtx.lineWidth = 1;
function drawBrush(width) {
    brushCtx.beginPath();
    brushCtx.arc(brushCenterX, brushCenterY, width / 2, 0, 2 * Math.PI, false);
    brushCtx.stroke();
}

let canvas = document.getElementById('whiteboard-canvas');
let ctx = canvas.getContext('2d');
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// Erase checkbox
let eraseCheckbox = document.getElementById('erase-checkbox');
eraseCheckbox.onchange = function() {
    if (this.checked) {
        ctx.lineWidth = thicknessSlider.value * 3;
        brushCtx.clearRect(0, 0, brush.width, brush.height);
        drawBrush(ctx.lineWidth);
    } else {
        ctx.lineWidth = thicknessSlider.value;
        brushCtx.clearRect(0, 0, brush.width, brush.height);
        drawBrush(ctx.lineWidth);
    }
};

// Thickness slider
let thicknessSlider = document.getElementById("thickness-slider");
ctx.lineWidth = thicknessSlider.defaultValue;
drawBrush(ctx.lineWidth);
thicknessSlider.onchange = function() {
    ctx.lineWidth = this.value;
    if (eraseCheckbox.checked) {
        ctx.lineWidth *= 3;
    }

    brushCtx.clearRect(0, 0, brush.width, brush.height);
    drawBrush(ctx.lineWidth);
};

// Color picker
let colorPicker = document.getElementById('color-picker');
let currentColor = '#' + colorPicker.value;
colorPicker.onchange = function() {
    currentColor = '#' + this.value;
};

// Reset button
let resetButton = document.getElementById('reset');
resetButton.onclick = function() {
    socket.emit('clear board');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

// create a flag
let isActive = false;

// array to collect coordinates
let plots = [];

function draw(e) {
    brush.style.top = e.clientY - brushCenterY + 'px';
    brush.style.left = e.clientX - brushCenterX + 'px';
    if (!isActive)
        return;

    // cross-browser canvas coordinates
    let x = e.offsetX || e.layerX - canvas.offsetLeft;
    let y = e.offsetY || e.layerY - canvas.offsetTop;

    plots.push({x: x, y: y});
    socket.emit('plot', {plots: plots, color: currentColor, thickness: ctx.lineWidth});
    drawOnCanvas(plots, currentColor);
}

function drawOnCanvas(plots, color) {
    ctx.beginPath();
    ctx.moveTo(plots[0].x, plots[0].y);

    for(let i = 1; i < plots.length; i++) {
      ctx.lineTo(plots[i].x, plots[i].y);
    }

    ctx.strokeStyle = color;
    ctx.stroke();
}

function startDraw(e) {
    isActive = true;

    if (eraseCheckbox.checked) {
        currentColor = '#FFFFFF';
    }

    // Hack to draw even if cursor doesn't move
    let x = e.offsetX || e.layerX - canvas.offsetLeft;
    let y = e.offsetY || e.layerY - canvas.offsetTop;
    plots.push({x: x-1, y: y-1});
    draw(e);
}

function endDraw() {
    isActive = false;

    // empty the array
    plots = [];

    if (eraseCheckbox.checked) {
        currentColor = '#' + colorPicker.value;
    }
}

canvas.addEventListener('mousedown', startDraw, false);
canvas.addEventListener('mousemove', draw, false);
canvas.addEventListener('mouseup', endDraw, false);

socket.on('draw', function(data) {
    ctx.lineWidth = data['thickness'];
    drawOnCanvas(data['plots'], data['color']);
});

socket.on('clear board', function() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

socket.on('init state', function(plots) {
    for (let i = 0; i < plots.length; i++) {
        let data = plots[i];
        ctx.lineWidth = data['thickness'];
        drawOnCanvas(data['plots'], data['color']);
    }
    ctx.lineWidth = thicknessSlider.value;
});