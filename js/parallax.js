var header = document.getElementById('page-header');
if (header) {
  window.addEventListener('scroll', function() {
    var scrollY = window.scrollY;
    var headerH = header.offsetHeight;
    if (scrollY <= headerH) {
      header.style.transform = 'translateY(' + (scrollY * 0.5) + 'px)';
    }
  });
}
