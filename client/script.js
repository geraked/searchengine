(() => {

    const API_URL = 'http://localhost:3000/api/';
    const PER_PAGE = 10;
    const PAGINATION_ITEMS = 3;

    let form = document.getElementById('search-form');
    let searchBox = document.getElementById('search-box');
    let modal = document.getElementById('index-modal');
    let modalBtn = document.getElementById('modal-btn');
    let modalHiddenBtn = document.getElementById('modal-hidden-btn');
    let dirSelect = document.getElementById('dir-select');
    let startIndexBtn = document.getElementById('startindex-btn');
    let indexProg = document.getElementById('index-prog');
    let writeProg = document.getElementById('write-prog');
    let timeTxt = document.getElementById('time-txt');
    let resultsWrap = document.getElementById('results');
    let resStat = document.getElementById('res-stat');
    let pagination = document.getElementById('pagination');
    let isIndexing = false;
    let time = 0;
    let docIds = [];
    let curPage = 1;

    // Trick: Resolve tooltip and modal toggle conflict
    modalBtn.addEventListener('click', e => modalHiddenBtn.click());

    // Send a request to start indexing
    startIndexBtn.addEventListener('click', e => {
        if (!dirSelect.value || isIndexing) return;
        isIndexing = true;
        time = 0;
        timeTxt.innerText = time;
        startIndexBtn.disabled = isIndexing;
        setProg(indexProg, 0);
        setProg(writeProg, 0);
        request(API_URL + 'index', d => { }, { dir: dirSelect.value });
    });

    // Send the search query and get the document ids of the results
    form.addEventListener('submit', e => {
        e.preventDefault();
        if (!searchBox.value) return;
        request(API_URL + 'search', d => {
            docIds = d.ids;
            resStat.innerText = `${docIds.length.toLocaleString()} نتیجه (${d.time / 1000} ثانیه)`;
            updatePagination();
        }, { s: searchBox.value });
    });

    // Get the index feed directories
    request(API_URL + 'index/dirs', d => {
        let options = d.dirs.map(t => `<option value="${t}">${t}</option>`);
        dirSelect.innerHTML = options.join('');
    });

    // Update the indexing status when the indexing modal is shown
    setInterval(() => {
        if (!modal.classList.contains('show')) return;
        request(API_URL + 'index/progress', d => {
            if (d.isIndexing && d.time <= time) return;
            isIndexing = d.isIndexing;
            time = d.time;
            timeTxt.innerText = time / 1000;
            startIndexBtn.disabled = isIndexing;
            setProg(indexProg, d.index);
            setProg(writeProg, d.write);
        });
    }, 5000);

    function setProg(prog, val) {
        prog.style.width = val + '%';
        prog.setAttribute('aria-valuenow', val);
        prog.innerHTML = val + ' %';
    }

    function setPage(p) {
        curPage = p;
        let s = (p - 1) * PER_PAGE;
        request(API_URL + 'doc', d => {
            resultsWrap.innerHTML = d.docs.map(doc => resultItem(doc)).join('');
        }, { ids: docIds.slice(s, s + PER_PAGE) });
    }

    function updatePagination() {
        if (docIds.length === 0) {
            pagination.classList.add('d-none');
            setPage(1);
            return;
        }

        pagination.classList.add('d-none');

        let ul = pagination.querySelector('ul');
        ul.querySelectorAll('li').forEach(t => t.remove());

        let totalPages = Math.ceil(docIds.length / PER_PAGE) + 2;
        for (let i = 0; i < totalPages; i++) {
            let li = document.createElement('li');
            let a = document.createElement('a');

            li.id = `p-${i}`;
            li.className = 'page-item';
            a.className = 'page-link';
            a.href = '#';
            li.setAttribute('p', i);

            if (i == 0) {
                a.innerText = 'صفحه قبل';
            } else if (i == totalPages - 1) {
                a.innerText = 'صفحه بعد';
            } else {
                a.innerText = i;
            }

            a.addEventListener('click', e => {
                e.preventDefault();
                ul.querySelectorAll('.active').forEach(t => t.classList.remove('active'));
                ul.querySelectorAll('.disabled').forEach(t => t.classList.remove('disabled'));

                if (i == 0) {
                    setPage(curPage - 1);
                } else if (i == totalPages - 1) {
                    setPage(curPage + 1);
                } else {
                    setPage(i);
                }

                if (curPage <= 1)
                    ul.querySelector('#p-0').classList.add('disabled');
                if (curPage >= totalPages - 2)
                    ul.querySelector(`#p-${totalPages - 1}`).classList.add('disabled');

                ul.querySelector(`#p-${curPage}`).classList.add('active');
                ul.querySelectorAll('li').forEach(t => {
                    let p = parseInt(t.getAttribute('p'));
                    let d = Math.abs(curPage - p);

                    if (p == 0 || p == totalPages - 1) return;

                    t.querySelector('a').innerText = p;
                    t.classList.remove('disabled');

                    if (d <= PAGINATION_ITEMS)
                        t.classList.remove('d-none');
                    else
                        t.classList.add('d-none');

                    if (p == 1 || (p == totalPages - 2 && p > 1)) {
                        t.classList.remove('d-none');
                        return;
                    }

                    if (d == PAGINATION_ITEMS + 1) {
                        t.querySelector('a').innerText = '...';
                        t.classList.add('disabled');
                        t.classList.remove('d-none');
                    }
                });
            });

            li.appendChild(a);
            ul.appendChild(li);
        }

        setTimeout(() => {
            ul.querySelector('#p-1 a').click();
            pagination.classList.remove('d-none');
        }, 100);
    }

    function resultItem({ _id, url, title, body }) {
        return `
            <div id="r-${_id}" class="col-12">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title text-truncate"><a href="${url}" class="card-link">${title || 'عنوان'}</a></h5>
                        <h6 dir="ltr" class="card-subtitle mb-2 text-muted text-truncate" style="text-align: right;">${decodeURI(url)}</h6>
                        <p class="card-text">${body}</p>
                    </div>
                </div>
            </div>        
        `;
    }

    function request(url, callBack, data = '', p = false) {
        let xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                callBack(this.response);
            }
        };
        if (data) {
            data = Object.keys(data).map(k => {
                return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
            }).join('&');
        }
        xhttp.open(p ? 'POST' : 'GET', p ? url : (url + '?' + data), true);
        xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhttp.responseType = 'json';
        xhttp.send(p ? data : null);
    }

})();