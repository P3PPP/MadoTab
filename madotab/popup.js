
document.addEventListener("DOMContentLoaded", function(event) {
    var container = document.getElementById('list_container');
    loadWindowTabs(container);
});


let grabbingState = {
    target: null,
    // diffX: 0,
    diffY: 0,
    originY: 0,
    isGrabbing: false,
}


function scrollToActive() {
    var activeTtab = document.querySelectorAll('[isActive="true"]').item(0);

    if (activeTtab != null) {
        activeTtab.scrollIntoView();
    }
}

function loadWindowTabs(target_container) {
    chrome.tabs.query({currentWindow:true}, tabs => {
        for(let i=0; i < tabs.length; i++) {
          var li = createListItem(tabs[i]);
          target_container.appendChild(li);
        }

        // アクティブなタブが見えるようにスクロールする。
        scrollToActive();
      });
}

function createListItem(tab) {
    var content = document.createElement(`div`);

    // content.setAttribute(`draggable`, `true`);

    content.classList.add(`tab_list_item`);

    if (tab.active) {
        content.setAttribute(`isActive`, `true`);
    } else {
        content.setAttribute(`isActive`, `false`);
    }

    if (tab.pinned) {
        content.setAttribute(`isPinned`, `true`);
    } else {
        content.setAttribute(`isPinned`, `false`);
    }

    content.setAttribute(`tab_id`, tab.id);

    var highlight = document.createElement(`div`);
    highlight.classList.add(`tab_highlight`);
    content.appendChild(highlight);


    var favicon = (() => {
        if (tab.favIconUrl) {
            var img = document.createElement(`img`);
            img.src = tab.favIconUrl;
            return img;
        } else {
            return document.createElement(`div`);
        }
    })();

    favicon.classList.add(`tab_favicon`);
    content.appendChild(favicon);

    var pin = document.createElement(`object`);
    pin.classList.add(`pin_icon`);
    pin.data = "./images/pin.svg";
    content.appendChild(pin);

    var title = document.createElement(`p`);
    title.textContent = tab.title;
    title.classList.add(`tab_title`);
    content.appendChild(title);

    var closeButton = document.createElement(`div`);
    closeButton.classList.add(`close_button`);

    var closeIcon = document.createElement(`img`);
    closeIcon.classList.add(`close_icon`);
    closeIcon.src = "./images/close.svg";
    closeButton.appendChild(closeIcon);

    content.appendChild(closeButton);


    // クリックしてタブをアクティブにする。
    content.onclick = (event) => {
        if (grabbingState.isGrabbing) {
            return;
        }

        event.stopPropagation();
        activateTab(tab.id);
    };

    // 閉じるボタンでタブを閉じる。
    closeIcon.onclick = (event) => {
        event.stopPropagation();
        closeTab(tab.id, content);
    };

    content.addEventListener('mousedown', down);

    return content;
}

function down(event) {

    const target = (() => {
        var target = event.target;
        while (!target.classList.contains(`tab_list_item`)) {
            target = target.parentElement;
        }

        return target;
    })();

    // const pageX = event.pageX;
    const pageY = event.pageY;
    // const targetW = target.offsetWidth;
    const targetRect = target.getBoundingClientRect();
    // const targetRectX = targetRect.left;
    const targetRectY = targetRect.top;

    grabbingState.target = target;
    // grabbingState.diffX = pageX - targetRectX;
    grabbingState.diffY = pageY - targetRectY;
    // target.style.width = `${targetW}px`;

    grabbingState.isGrabbing = false;
    grabbingState.originY = event.pageY;
    // target.classList.add('grabbing');

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
}

function move(event) {
    const target = grabbingState.target;
    // const pageX = event.pageX;
    const pageY = event.pageY;
    // const targetPosL = pageX - grabbingState.diffX;
    const targetPosT = pageY - grabbingState.diffY;

    if (!grabbingState.isGrabbing) {
        if (Math.abs(grabbingState.originY - pageY) < 20) {
            return;
        }

        grabbingState.cloneName = insertClone(target, index(target));
        grabbingState.isGrabbing = true;
        const targetW = target.offsetWidth;
        target.style.width = `${targetW}px`;
        target.classList.add('grabbing');
    } else {
        // target.style.left = `${targetPosL}px`;
        target.style.top = `${targetPosT}px`;
        
        swap(target);
    }
}

function up(event) {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);

    const target = grabbingState.target;
    target.removeAttribute('style');

    if (!grabbingState.isGrabbing) {
        return;
    }

    const cloneSelector = `.${grabbingState.cloneName}`;
    const clone = document.querySelector(cloneSelector);

    grabbingState.cloneName = '';
    clone.remove();
    // target.removeAttribute('style');
    target.classList.remove('grabbing');
    // target.classList.remove('onDrag');

    var id = Number(target.getAttribute(`tab_id`));
    chrome.tabs.get(id, (tab) => {
        console.log(tab.index);

        let parent = target.parentElement;
        var visualIndex = Array.prototype.indexOf.call(parent.children, target);

        if (visualIndex != tab.index) {
            parent.insertBefore(
                target,
                parent.children[visualIndex < tab.index ? tab.index +1 : tab.index]
            );
        }
    });
}

function index(el) {
    const parent = el.parentElement;
    const siblings = parent.children;
    const siblingsArr = [].slice.call(siblings);
    const idx = siblingsArr.indexOf(el);

    return idx;
}

function insertClone(target, insertIdx) {
    const cloneName = `tab_list_item_clone_${Math.trunc(Math.random() * 10000)}`;
    const clone = target.cloneNode(true);
    const parent = target.parentElement;
    const siblings = parent.children;

    clone.classList.add('hidden');
    clone.classList.add(cloneName);
    siblings[insertIdx].insertAdjacentElement('afterend', clone);

    return cloneName;
}


function swap(target) {
    const selfIdx = index(target);
    const cloneIdx = selfIdx + 1;
    const parent = target.parentElement;
    const siblings = parent.querySelectorAll(`:scope > *:not(.grabbing):not(.${grabbingState.cloneName})`);

    for (let thatIdx = 0, len = siblings.length; thatIdx < len; thatIdx++) {
        // const targetW = target.offsetWidth;
        const targetH = target.offsetHeight;
        const targetRect = target.getBoundingClientRect();
        // const targetRectX = targetRect.left;
        const targetRectY = targetRect.top;

        const that = siblings[thatIdx];
        // const thatW = that.offsetWidth;
        const thatH = that.offsetHeight;
        const thatRect = that.getBoundingClientRect();
        // const thatRectX = thatRect.left;
        const thatRectY = thatRect.top;

        // const thatRectYHalf = thatRectY + (thatH / 2);

        // const hitX = thatRectX <= (targetRectX + targetW) && thatRectX + thatW >= targetRectX;
        // const hitY = targetRectY <= thatRectYHalf && (targetRectY + targetH) >= thatRectYHalf;

        const hitY = targetRectY <= thatRectY && (targetRectY + targetH) >= thatRectY;

        // const isHit = hitX && hitY;
        const isHit = hitY;

        if (isHit) {
            const siblingsAll = parent.children;
            const clone = siblingsAll[cloneIdx];

            parent.insertBefore(clone, selfIdx > thatIdx ? that : that.nextSibling);
            parent.insertBefore(target, clone);

            var id = Number(target.getAttribute(`tab_id`));
            chrome.tabs.move(id,  {index: selfIdx > thatIdx ? thatIdx : thatIdx +1});

            break;
        }
    }
}

function activateTab(tab_id) {
    chrome.tabs.update(tab_id, { active: true });
}

function closeTab(tab_id, element) {
    chrome.tabs.remove(tab_id, () => {
        element.parentElement.removeChild(element);
    });
}

