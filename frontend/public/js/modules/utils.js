(function(window) {
    'use strict';

    const pathFaceImg = 'http://localhost:8085/public/uploads/faces/';

    function renderPaginator(elementId, totalPages, currentPage, onPageClick) {
        const paginator = document.getElementById(elementId);
        if (!paginator) return;

        let ul = paginator.querySelector('ul');
        if (!ul) {
            ul = document.createElement('ul');
            ul.className = 'flex justify-center items-center -space-x-px h-10 text-base';
            paginator.innerHTML = '';
            paginator.appendChild(ul);
        } else {
            ul.innerHTML = '';
        }

        if (totalPages <= 1) return;

        const createPageLink = (page, text, isDisabled = false, isActive = false) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.innerHTML = text;
            a.className = `flex items-center justify-center px-4 h-10 leading-tight border dark:border-gray-700 ${
                isDisabled
                ? 'text-gray-500 bg-white dark:bg-gray-800 cursor-not-allowed'
                : 'text-blue-600 bg-white hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
            } ${isActive ? 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-gray-700 dark:text-white' : ''}`;

            if (!isDisabled) {
                a.onclick = (e) => {
                    e.preventDefault();
                    onPageClick(page);
                };
            }
            li.appendChild(a);
            return li;
        };

        // Previous button
        ul.appendChild(createPageLink(currentPage - 1, 'Previous', currentPage === 1));

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            ul.appendChild(createPageLink(i, i, false, i === currentPage));
        }

        // Next button
        ul.appendChild(createPageLink(currentPage + 1, 'Next', currentPage === totalPages));
    }

    window.Utils = {
        pathFaceImg,
        renderPaginator
    };

})(window);
