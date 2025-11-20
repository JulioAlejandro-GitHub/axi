/* global bootstrap: false */

(function () {
  'use strict'

  // Tooltip and popover demos
  document.querySelectorAll('.tooltip-demo')
    .forEach(function (tooltip) {
      new bootstrap.Tooltip(tooltip, {
        selector: '[data-bs-toggle="tooltip"]'
      })
    })

  document.querySelectorAll('[data-bs-toggle="popover"]')
    .forEach(function (popover) {
      new bootstrap.Popover(popover)
    })

  document.querySelectorAll('.toast')
    .forEach(function (toastNode) {
      var toast = new bootstrap.Toast(toastNode, {
        autohide: false
      })

      toast.show()
    })

  // Disable empty links and submit buttons
  document.querySelectorAll('[href="#"], [type="submit"]')
    .forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault()
      })
    })

  function setActiveItem() {
    var hash = window.location.hash

    if (hash === '') {
      return
    }

    var link = document.querySelector('.bd-aside a[href="' + hash + '"]')

    if (!link) {
      return
    }

    var active = document.querySelector('.bd-aside .active')
    var parent = link.parentNode.parentNode.previousElementSibling

    link.classList.add('active')

    if (parent.classList.contains('collapsed')) {
      parent.click()
    }

    if (!active) {
      return
    }

    var expanded = active.parentNode.parentNode.previousElementSibling

    active.classList.remove('active')

    if (expanded && parent !== expanded) {
      expanded.click()
    }
  }

  setActiveItem()
  window.addEventListener('hashchange', setActiveItem)

  function parseJwt(token) {
    try {
        // The atob function can have issues with URL-safe base64, so we need to replace '-' with '+' and '_' with '/'
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
  }

  function handleMenuVisibility() {
    const token = localStorage.getItem('token');
    const actividadMenu = document.getElementById('b-actividad');
    const agregarMenu = document.getElementById('b-agregar');
    const videoMenu = document.getElementById('b-video');

    if (!actividadMenu || !agregarMenu || !videoMenu) return;

    // Default to hiding protected menus
    actividadMenu.parentElement.style.display = 'none';
    agregarMenu.parentElement.style.display = 'none';
    videoMenu.parentElement.style.display = 'none';

    if (token) {
        const decodedToken = parseJwt(token);
        if (decodedToken && decodedToken.tipo) {
            const userRole = decodedToken.tipo;
            // Show menus only for specific roles
            if (userRole === 'admin' || userRole === 'socio' || userRole === 'empleado' || userRole === 'familia') {
                actividadMenu.parentElement.style.display = 'list-item';
                agregarMenu.parentElement.style.display = 'list-item';
                videoMenu.parentElement.style.display = 'list-item';
            }
        }
    }
  }

  // Call on page load
  document.addEventListener('DOMContentLoaded', handleMenuVisibility);

})()
