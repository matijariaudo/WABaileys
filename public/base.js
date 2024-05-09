$(document).ready(function() {
    const sidebar = $('#sidebar');
    const toggleSidebarBtn = $('#toggleSidebarBtn');
    const closeSidebarBtn = $('#closeSidebarBtn');
    const sidebarOverlay = $('#sidebarOverlay');

    // Función para mostrar el sidebar
    function showSidebar() {
        sidebar.css('left', '0');
        sidebarOverlay.show(); // Mostrar la capa oscura
    }

    // Función para ocultar el sidebar
    function hideSidebar() {
        sidebar.css('left', `-${sidebar.outerWidth()}px`);
        sidebarOverlay.hide(); // Ocultar la capa oscura
    }

    // Evento de clic en el botón de toggle (solo visible en dispositivos móviles)
    toggleSidebarBtn.on('click', function() {
        // Mostrar u ocultar el sidebar al hacer clic en el botón toggle
        sidebar.css('left', '0');
        sidebarOverlay.show(); // Mostrar la capa oscura al abrir el sidebar
    });

    // Evento de clic en el botón de cerrar sidebar
    closeSidebarBtn.on('click', function() {
        hideSidebar();
    });

    // Evento de clic en la capa oscura para cerrar el sidebar
    sidebarOverlay.on('click', function() {
        hideSidebar();
    });

    // Evento de clic en cualquier botón dentro del sidebar para cerrar el sidebar
    sidebar.find('button').on('click', function() {
        hideSidebar();
    });

    // Función para gestionar la visibilidad del sidebar según el tamaño de la pantalla
    function handleSidebarVisibility() {
        // Verificar si la pantalla es menor que el tamaño de tablet (768px)
        if ($(window).width() < 768) {
            // Ocultar sidebar en dispositivos móviles al cargar la página
            sidebar.css('left', `-2000px`);
            sidebarOverlay.hide(); // Mostrar la capa oscura
        } else {
            // Mostrar sidebar en tabletas y computadoras al cargar la página
            sidebar.css('left', '0');
            sidebarOverlay.hide(); // Ocultar la capa oscura
        }
    }
    if ($(window).width() < 768){
        hideSidebar();
    }else{
        showSidebar();
    }

// Llamar a la función al cargar la página y al cambiar el tamaño de la pantalla
$(window).on('load resize', handleSidebarVisibility);
});