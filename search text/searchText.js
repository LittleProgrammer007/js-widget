'use strict';

function SearchText(selector) {
    const widget = Object.seal({
        id: 0,
        ele: null,
        text: ''
    });

    let ele = document.querySelector(selector);

    if (ele) {
        const id = 'searchText_' + Date.now() + '_' + Math.ceil(Math.random() * 1000);
        ele.innerHTML = `<div class="container" id="${id}">
        <div class="search-box">
            <div class="search-nav">
                <span class="search-target"></span> <span class="current-num"></span>/
                <span class="total"></span> <i class="iconfont icon-chevron-up toPrevious"></i><i class="iconfont icon-chevron-down toNext"></i>
            </div>
            <div class="file-box">
                <pre class="file"></pre>
            </div>
        </div>
    </div>`;

        widget.id = id;
        widget.ele = ele = document.getElementById(id);

        ele.getElementsByClassName('toPrevious')[0].addEventListener('click', () => { this.goPrevious() }, false);
        ele.getElementsByClassName('toNext')[0].addEventListener('click', () => { this.goNext() }, false);
        ele.getElementsByClassName('file-box')[0].addEventListener('click', (event) => {
            var target = event.target;
            if (target.className === 'result-nav') {
                this.gotoNav(target);
            }
        }, false);

        this.widget = widget;
    } else {
        throw new Error('can not find this element');
    }
}

SearchText.prototype = {
    setText: function (text) {
        const widget = this.widget;
        widget.ele.getElementsByClassName('file')[0].innerHTML = widget.text = text;
    },
    highlightInText: function (word) {
        const widget = this.widget, ele = widget.ele;

        const fileEle = ele.getElementsByClassName('file')[0];
        fileEle.innerHTML = widget.text.replace(new RegExp(word, 'g'), '<span class="highlight">' + word + '</span>');

        const targets = fileEle.getElementsByClassName('highlight'), targetsLen = targets.length;

        const boxEle = ele.getElementsByClassName('file-box')[0];

        let current = 1;

        let resultNavEles = boxEle.getElementsByClassName('result-nav'), resultNavsLen = resultNavEles.length;

        if (resultNavsLen > targetsLen) {
            let removeLen = resultNavsLen - targetsLen;
            for (let i = 0; i < removeLen; i++) {
                resultNavEles[i].remove();
            }
        } else {
            let addLen = targetsLen - resultNavsLen;
            for (let i = 0; i < addLen; i++) {
                let ele = document.createElement('div');
                ele.className = 'result-nav';
                boxEle.append(ele);
            }
        }

        if (targetsLen > 0) {
            this.setCurrentHighlight(targets[0]);

            let totalHeight = fileEle.offsetHeight;
            let availHeight = boxEle.offsetHeight - 40;

            resultNavEles = boxEle.getElementsByClassName('result-nav');
            // add result nav
            for (let i = 0; i < targetsLen; i++) {
                resultNavEles[i].style.top = Math.floor(targets[i].offsetTop / totalHeight * availHeight + 50) + 'px';
                resultNavEles[i].navIndex = i + 1;
            }
        } else {
            current = 0;
        }

        ele.getElementsByClassName('search-target')[0].innerText = word;
        ele.getElementsByClassName('current-num')[0].innerText = current;
        ele.getElementsByClassName('total')[0].innerText = targetsLen;

        ele.getElementsByClassName('search-nav')[0].style.color = '#fff';
    },
    setCurrentHighlight: function (ele) {
        ele.scrollIntoView({
            block: "center",
            inline: "center"
        });
        ele.className = 'highlight current';
    },
    gotoNav: function (target) {
        const ele = this.widget.ele;
        let current = +ele.getElementsByClassName('current-num')[0].innerText;
        const targets = ele.getElementsByClassName('file')[0].getElementsByClassName('highlight');
        if (!isNaN(current)) {
            targets[current - 1].className = 'highlight';
        }
        ele.getElementsByClassName('current-num')[0].innerText = target.navIndex;
        this.setCurrentHighlight(targets[target.navIndex - 1]);
    },
    goPrevious: function () {
        this.changeHighlight(function (current, total) {
            return current > 1 && total > 0;
        }, function (current) {
            return current - 1;
        });
    },
    goNext: function () {
        this.changeHighlight(function (current, total) {
            return current > 0 && current < total;
        }, function (current) {
            return current + 1;
        });
    },
    changeHighlight: function (check, change) {
        const ele = this.widget.ele;
        const targets = ele.getElementsByClassName('file')[0].getElementsByClassName('highlight');
        const currentEle = ele.getElementsByClassName('current-num')[0];
        let current = +currentEle.innerText;
        if (check(current, targets.length)) {
            targets[current - 1].className = 'highlight';
            current = change(current);
            currentEle.innerText = current;
            this.setCurrentHighlight(targets[current - 1]);
        }
    }

}
