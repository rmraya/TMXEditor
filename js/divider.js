var currentSum;

function hDragStart(ev, dividerId, leftId, rightId) {
    var leftPanel = document.getElementById(leftId);
    var divider = document.getElementById(dividerId);
    var rightPanel = document.getElementById(rightId);

    currentSum = leftPanel.clientWidth + divider.clientWidth + rightPanel.clientWidth;
}

function hDragEnd(ev, dividerId, leftId, rightId) {
    var leftPanel = document.getElementById(leftId);
    var divider = document.getElementById(dividerId);
    var rightPanel = document.getElementById(rightId);

    var left = leftPanel.clientWidth + ev.offsetX;
    if (left < 20) {
        left = 20;
    }
    var right = currentSum - left - divider.clientWidth;
    if (right > currentSum - 30) {
        right = currentSum - 30;
    }
    leftPanel.style.width = left + 'px';
    rightPanel.style.width = right + 'px';
}

function vDragStart(ev, dividerId, leftId, rightId) {
    var topPanel = document.getElementById(leftId);
    var divider = document.getElementById(dividerId);
    var bottomPanel = document.getElementById(rightId);

    currentSum = topPanel.clientHeight + divider.clientHeight + bottomPanel.clientHeight;
}

function vDragEnd(ev, dividerId, leftId, rightId) {
    var topPanel = document.getElementById(leftId);
    var divider = document.getElementById(dividerId);
    var bottomPanel = document.getElementById(rightId);

    var top = topPanel.clientHeight + ev.offsetY;
    if (top < 24) {
        console.log('too short: ' + top);
        top = 24;
    }
    if (top > currentSum - 26) {
        console.log('too tall: ' + top);
        top = currentSum - 26;
    }
    var bottom = currentSum - top - divider.clientHeight;
    topPanel.style.height = top + 'px';
    bottomPanel.style.height = bottom + 'px';
}