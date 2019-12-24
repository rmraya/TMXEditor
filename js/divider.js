function hdrag(ev, dividerId, leftId, rightId) {
    var leftPane = document.getElementById(leftId);
    var paneSep = document.getElementById(dividerId);
    var rightPane = document.getElementById(rightId);

    var sum = leftPane.clientWidth + paneSep.clientWidth + rightPane.clientWidth;
    var left = Math.round((leftPane.clientWidth + ev.offsetX) / sum * 100);
    var right = 100 - left;
    if (left > 10 && right > 10) {
        leftPane.style.width = left + 'vw';
        rightPane.style.width = right + 'vw';
    }
}

function hDragEnd(ev, dividerId, leftId, rightId) {
    var leftPane = document.getElementById(leftId);
    var paneSep = document.getElementById(dividerId);
    var rightPane = document.getElementById(rightId);

    var sum = leftPane.clientWidth + paneSep.clientWidth + rightPane.clientWidth;
    var left = Math.round((leftPane.clientWidth + ev.offsetX) / sum * 100);
    var right = 100 - left;
    leftPane.style.width = left + 'vw';
    rightPane.style.width = right + 'vw';

    leftPane.style.minWidth = '20px';
    rightPane.style.minWidth = '20px';
}