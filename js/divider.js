function hdrag(ev, dividerId, leftId, rightId) {
    var leftPanel = document.getElementById(leftId);
    var divider = document.getElementById(dividerId);
    var rightPanel = document.getElementById(rightId);

    var sum = leftPanel.clientWidth + divider.clientWidth + rightPanel.clientWidth;
    var left = leftPanel.clientWidth + ev.offsetX;
    var right = sum - left - divider.clientWidth;
    if (left > 10 && right > 10) {
        leftPanel.style.width = left + 'px';
        rightPanel.style.width = right + 'px';
    }
}

function hDragEnd(ev, dividerId, leftId, rightId) {
    var leftPanel = document.getElementById(leftId);
    var divider = document.getElementById(dividerId);
    var rightPanel = document.getElementById(rightId);

    var sum = leftPanel.clientWidth + divider.clientWidth + rightPanel.clientWidth;
    var left = leftPanel.clientWidth + ev.offsetX;
    var right = sum - left - divider.clientWidth;
    leftPanel.style.width = left + 'px';
    rightPanel.style.width = right + 'px';

    leftPanel.style.minWidth = '20px';
    rightPanel.style.minWidth = '20px';
}

function vdrag(ev, dividerId, topId, bottomId) {
    var topPanel = document.getElementById(topId);
    var divider = document.getElementById(dividerId);
    var bottomPanel = document.getElementById(bottomId);

    var sum = topPanel.clientHeight + divider.clientHeight + bottomPanel.clientHeight;
    var top = topPanel.clientHeight + ev.offsetY;
    var bottom = sum - top - divider.clientHeight;
    
    if (top > 10 && bottom > 10) {
        topPanel.style.height = top + 'px';
        bottomPanel.style.height = bottom + 'px';
    }
    
}

function vDragEnd(ev, dividerId, leftId, rightId) {
    var topPanel = document.getElementById(leftId);
    var divider = document.getElementById(dividerId);
    var bottomPanel = document.getElementById(rightId);

    var sum = topPanel.clientHeight + divider.clientHeight + bottomPanel.clientHeight;
    var top = topPanel.clientHeight + ev.offsetY;
    var bottom = sum - top - divider.clientHeight;
    topPanel.style.height = top + 'px';
    bottomPanel.style.height = bottom + 'px';

    topPanel.style.minHeight = '20px';
    bottomPanel.style.minHeight = '20px';
}