var currentSum: number;

function hDragStart(ev: DragEvent, dividerId: string, leftId: string, rightId: string) {
    var leftPanel: HTMLElement = document.getElementById(leftId);
    var divider: HTMLElement = document.getElementById(dividerId);
    var rightPanel: HTMLElement = document.getElementById(rightId);

    currentSum = leftPanel.clientWidth + divider.clientWidth + rightPanel.clientWidth;
}

function hDragEnd(ev: DragEvent, dividerId: string, leftId: string, rightId: string) {
    var leftPanel: HTMLElement = document.getElementById(leftId);
    var divider: HTMLElement = document.getElementById(dividerId);
    var rightPanel: HTMLElement = document.getElementById(rightId);

    var left: number = leftPanel.clientWidth + ev.offsetX;
    if (left < 20) {
        left = 20;
    }
    
    var right: number = currentSum - left - divider.clientWidth;
    if (right > currentSum - 30) {
        right = currentSum - 30;
    }
    leftPanel.style.width = left + 'px';
    rightPanel.style.width = right + 'px';
}

function vDragStart(ev: DragEvent, dividerId: string, leftId: string, rightId: string) {
    var topPanel: HTMLElement = document.getElementById(leftId);
    var divider: HTMLElement = document.getElementById(dividerId);
    var bottomPanel: HTMLElement = document.getElementById(rightId);

    currentSum = topPanel.clientHeight + divider.clientHeight + bottomPanel.clientHeight;
}

function vDragEnd(ev: DragEvent, dividerId: string, leftId: string, rightId: string) {
    var topPanel: HTMLElement = document.getElementById(leftId);
    var divider: HTMLElement = document.getElementById(dividerId);
    var bottomPanel: HTMLElement = document.getElementById(rightId);

    var top: number = topPanel.clientHeight + ev.offsetY;
    if (top < 24) {
        top = 24;
    }
    if (top > currentSum - 26) {
        top = currentSum - 26;
    }
    var bottom: number = currentSum - top - divider.clientHeight;
    topPanel.style.height = top + 'px';
    bottomPanel.style.height = bottom + 'px';
}