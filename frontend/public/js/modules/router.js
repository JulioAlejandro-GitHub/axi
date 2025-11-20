(function(window) {
    'use strict';

    const routes = [
        { hash: '#dashboard', handler: window.Dashboard.loadDashboard },
        { hash: '#users', handler: window.UserManagement.fGetUsersByBranch },
        { hash: '#new_user', handler: window.UserManagement.fadduser },
        { hash: /^#access-editor\/(\d+)$/, handler: (id) => window.AccessEditor.feditarImgUser(id) },
        { hash: '#access-report', handler: () => window.AccessReport.getPersonas(1, []) },
        { hash: '#camera', handler: window.CameraManagement.fGetCamaras },
        { hash: '#live', handler: window.CameraManagement.fGetLiveStream },
        { hash: '#recognition', handler: window.Recognition.fSendImg },
        { hash: '#stats-log', handler: () => window.StatsReports.fGetStatsPage('recognition-log') },
        { hash: '#stats-summary', handler: () => window.StatsReports.fGetStatsPage('recognition-summary') },
        { hash: '#stats-by-user', handler: () => window.StatsReports.fGetStatsPage('recognition-by-user') },
        { hash: '#faq', handler: () => { document.getElementById('fullbody').innerHTML = '<h1>FAQs</h1><p>This section will contain frequently asked questions.</p>'; } }
    ];

    const handleHashChange = () => {
        const hash = window.location.hash || '#dashboard';
        let match = null;
        let handler = null;
        let params = [];

        for (const route of routes) {
            if (typeof route.hash === 'string' && route.hash === hash) {
                handler = route.handler;
                break;
            } else if (route.hash instanceof RegExp) {
                match = hash.match(route.hash);
                if (match) {
                    handler = route.handler;
                    params = match.slice(1);
                    break;
                }
            }
        }

        const activeHashForMenu = (match) ? `#access-editor` : hash;
        window.Menu.updateActiveMenuFromHash(activeHashForMenu);

        if (handler) {
            handler(...params);
        } else {
            console.warn(`No handler found for hash: ${hash}`);
            window.Dashboard.loadDashboard();
        }
    };

    const init = () => {
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Initial load
    };

    window.Router = {
        init,
        handleHashChange
    };

})(window);