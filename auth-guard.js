// Blocks access to this page unless the user is logged in
(function () {
    const token = localStorage.getItem('bhamama_token');
    if (!token) {
        // window.location.href = 'login.html'; // TEMPORARILY DISABLED for browsing/testing
    }
})();